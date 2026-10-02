import express from "express";
import bcrypt from "bcrypt";
import pool from "../db.js";
import protect from "../middleware/authMiddleware.js";
import { sendDebitNotification } from "../services/emailService.js";

const router = express.Router();

/**
 * POST /api/store-pay
 * Authorizes and executes a payment to a merchant / store
 */
router.post("/", protect, async (req, res) => {
  const client = await pool.connect();
  try {
    const { store_name, category = "Shopping", amount, notes = "", mpin } = req.body;

    const numericAmount = Number(amount);
    if (!store_name || !store_name.trim()) {
      return res.status(400).json({ error: "Store / Merchant name is required" });
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: "Please enter a valid positive amount" });
    }

    if (!mpin || !/^\d{4}$/.test(String(mpin).trim())) {
      return res.status(400).json({ error: "4-Digit Security MPIN is required (default: 1234)" });
    }

    await client.query("BEGIN");

    // Fetch sender with row lock
    const userRes = await client.query(
      "SELECT id, name, email, balance, mpin FROM users WHERE id = $1 FOR UPDATE",
      [req.user.id]
    );

    if (userRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "User account not found" });
    }

    const userData = userRes.rows[0];
    const currentBalance = Number(userData.balance || 0);

    // Verify MPIN
    if (userData.mpin) {
      const isMpinValid = await bcrypt.compare(String(mpin).trim(), userData.mpin);
      if (!isMpinValid) {
        await client.query("ROLLBACK");
        return res.status(401).json({ error: "Incorrect 4-digit Security MPIN. Payment rejected." });
      }
    } else {
      if (String(mpin).trim() !== "1234") {
        await client.query("ROLLBACK");
        return res.status(401).json({ error: "Default Security MPIN is 1234. Please enter 1234." });
      }
      const hashedDefault = await bcrypt.hash("1234", 10);
      await client.query("UPDATE users SET mpin = $1 WHERE id = $2", [hashedDefault, userData.id]);
    }

    // Check balance
    if (currentBalance < numericAmount) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: `Insufficient balance. Required: ₹${numericAmount.toLocaleString("en-IN")}, Available: ₹${currentBalance.toLocaleString("en-IN")}`,
      });
    }

    // Deduct user balance
    const updatedUser = await client.query(
      "UPDATE users SET balance = balance - $1 WHERE id = $2 RETURNING balance",
      [numericAmount, req.user.id]
    );
    const newBalance = Number(updatedUser.rows[0].balance);

    // Record Transaction
    const cleanStoreName = store_name.trim();
    const txName = `Store: ${cleanStoreName}`;
    const txRes = await client.query(
      `
      INSERT INTO transactions (user_id, name, amount, status, category, receiver_email, notes)
      VALUES ($1, $2, $3, 'success', $4, $5, $6)
      RETURNING *
      `,
      [
        req.user.id,
        txName,
        -Math.abs(numericAmount),
        category,
        cleanStoreName,
        notes.trim(),
      ]
    );

    // In-app Notification
    await client.query(
      `
      INSERT INTO notifications (user_id, title, message)
      VALUES ($1, $2, $3)
      `,
      [
        req.user.id,
        "🛍️ Store Payment",
        `Paid ₹${numericAmount.toLocaleString("en-IN")} at ${cleanStoreName} (${category}). Ref: NP-${txRes.rows[0].id}`,
      ]
    );

    await client.query("COMMIT");

    // Async Real Email Notification (Non-blocking)
    sendDebitNotification({
      senderEmail: userData.email,
      senderName: userData.name,
      receiverEmail: cleanStoreName,
      amount: numericAmount,
      balance: newBalance,
      transactionId: txRes.rows[0].id,
    }).catch((err) => console.warn("Store pay email error:", err.message));

    res.status(201).json({
      message: `Payment of ₹${numericAmount.toLocaleString("en-IN")} to ${cleanStoreName} successful! 🛍️`,
      receipt: {
        id: txRes.rows[0].id,
        store_name: cleanStoreName,
        category,
        amount: numericAmount,
        notes: notes.trim(),
        date: txRes.rows[0].created_at,
        balance: newBalance,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Store pay error:", err);
    res.status(500).json({ error: err.message || "Failed to process store payment" });
  } finally {
    client.release();
  }
});

/**
 * GET /api/store-pay/history
 * Fetches recent store payments and category breakdown for analytics
 */
router.get("/history", protect, async (req, res) => {
  try {
    // Recent store payments
    const historyRes = await pool.query(
      `
      SELECT id, name, amount, category, receiver_email, notes, created_at
      FROM transactions
      WHERE user_id = $1 AND name LIKE 'Store:%'
      ORDER BY created_at DESC
      LIMIT 20
      `,
      [req.user.id]
    );

    // Category breakdown
    const categoryRes = await pool.query(
      `
      SELECT 
        category,
        COUNT(*)::int as count,
        SUM(ABS(amount))::numeric as total
      FROM transactions
      WHERE user_id = $1 AND name LIKE 'Store:%'
      GROUP BY category
      ORDER BY total DESC
      `,
      [req.user.id]
    );

    // Total store spending
    let grandTotal = 0;
    categoryRes.rows.forEach((row) => {
      grandTotal += Number(row.total || 0);
    });

    res.json({
      history: historyRes.rows,
      categories: categoryRes.rows,
      totalSpent: grandTotal,
    });
  } catch (err) {
    console.error("Store history error:", err);
    res.status(500).json({ error: "Failed to fetch store payment history" });
  }
});

export default router;
