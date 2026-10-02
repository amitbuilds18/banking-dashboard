import express from "express";
import pool from "../db.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// 1. GET ALL USER CREDIT CARDS (Seeds 2 realistic cards if empty for instant interactive experience)
router.get("/", protect, async (req, res) => {
  try {
    let result = await pool.query(
      `SELECT * FROM external_credit_cards
       WHERE user_id = $1
       ORDER BY due_date ASC, id ASC`,
      [req.user.id]
    );

    // If no cards exist for this user, seed starter cards with due bills
    if (result.rows.length === 0) {
      const uRes = await pool.query("SELECT name FROM users WHERE id = $1", [req.user.id]);
      const holderName = uRes.rows[0]?.name?.toUpperCase() || "AMIT ARYA";

      // Calculate upcoming due dates
      const now = new Date();
      const in5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const in18Days = new Date(now.getTime() + 18 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      await pool.query(
        `INSERT INTO external_credit_cards 
          (user_id, bank_name, card_network, card_variant, card_last4, holder_name, credit_limit, current_outstanding, min_due, due_date, billing_cycle_date, card_theme)
         VALUES 
          ($1, 'HDFC Bank', 'Visa', 'Regalia Gold Metal', '4821', $2, 450000, 18450, 1850, $3, 12, 'sapphire'),
          ($1, 'ICICI Bank', 'Mastercard', 'Sapphiro World Privileges', '9103', $2, 300000, 8200, 950, $4, 20, 'ruby')`,
        [req.user.id, holderName, in5Days, in18Days]
      );

      result = await pool.query(
        `SELECT * FROM external_credit_cards
         WHERE user_id = $1
         ORDER BY due_date ASC, id ASC`,
        [req.user.id]
      );
    }

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. ADD NEW EXTERNAL CREDIT CARD
router.post("/", protect, async (req, res) => {
  try {
    const {
      bank_name,
      card_network,
      card_variant,
      card_last4,
      holder_name,
      credit_limit,
      current_outstanding,
      due_date,
      card_theme,
    } = req.body;

    if (!bank_name || !card_last4 || !credit_limit) {
      return res.status(400).json({ error: "Bank name, last 4 digits and credit limit are required" });
    }

    if (!/^\d{4}$/.test(String(card_last4).trim())) {
      return res.status(400).json({ error: "Last 4 digits must be exactly 4 numbers" });
    }

    const outstanding = Number(current_outstanding) || 0;
    const minDue = Math.round(outstanding * 0.05); // 5% standard minimum due
    const dueDateVal = due_date || new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0];

    const newCard = await pool.query(
      `INSERT INTO external_credit_cards
        (user_id, bank_name, card_network, card_variant, card_last4, holder_name, credit_limit, current_outstanding, min_due, due_date, card_theme)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        req.user.id,
        bank_name.trim(),
        card_network || "Visa",
        card_variant || "Rewards Card",
        card_last4.trim(),
        (holder_name || "VALUED CARDHOLDER").toUpperCase(),
        Number(credit_limit),
        outstanding,
        minDue,
        dueDateVal,
        card_theme || "sapphire",
      ]
    );

    res.status(201).json({
      message: "Credit card added successfully!",
      card: newCard.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. PAY CREDIT CARD BILL (ATOMIC TRANSACTION WITH INSTANT CASHBACK)
router.post("/:id/pay", protect, async (req, res) => {
  const client = await pool.connect();
  try {
    const cardId = req.params.id;
    const payAmount = Number(req.body.amount);

    if (!payAmount || payAmount <= 0) {
      return res.status(400).json({ error: "Please enter a valid payment amount" });
    }

    await client.query("BEGIN");

    // Fetch Card
    const cardRes = await client.query(
      "SELECT * FROM external_credit_cards WHERE id = $1 AND user_id = $2 FOR UPDATE",
      [cardId, req.user.id]
    );

    if (cardRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Credit card not found" });
    }

    const card = cardRes.rows[0];

    // Fetch User Wallet Balance
    const userRes = await client.query(
      "SELECT id, balance, name, email FROM users WHERE id = $1 FOR UPDATE",
      [req.user.id]
    );
    const user = userRes.rows[0];

    if (Number(user.balance) < payAmount) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: `Insufficient wallet balance (₹${Number(user.balance).toLocaleString("en-IN")}) to pay bill of ₹${payAmount.toLocaleString("en-IN")}.`,
      });
    }

    // 1% Instant Cashback Calculation (minimum ₹10, up to ₹500)
    const cashbackEarned = Math.min(500, Math.max(10, Math.round(payAmount * 0.01)));
    const txRef = "CC-" + Date.now().toString(36).toUpperCase() + "-" + Math.floor(1000 + Math.random() * 9000);

    // 1. Deduct bill payment amount from user balance
    const netBalanceAfterDebit = Number(user.balance) - payAmount;
    // 2. Add instant cashback
    const finalBalance = netBalanceAfterDebit + cashbackEarned;

    await client.query(
      "UPDATE users SET balance = $1, reward_points = COALESCE(reward_points, 0) + 75 WHERE id = $2",
      [finalBalance, req.user.id]
    );

    // 3. Update external card outstanding and min due
    const newOutstanding = Math.max(0, Number(card.current_outstanding) - payAmount);
    const newMinDue = newOutstanding === 0 ? 0 : Math.max(0, Number(card.min_due) - payAmount);

    await client.query(
      `UPDATE external_credit_cards 
       SET current_outstanding = $1, min_due = $2
       WHERE id = $3`,
      [newOutstanding, newMinDue, card.id]
    );

    // 4. Log Debit Transaction
    await client.query(
      `INSERT INTO transactions (user_id, name, amount, category, status, receiver_email, notes)
       VALUES ($1, $2, $3, 'Credit Card Bill', 'success', $4, $5)`,
      [
        req.user.id,
        `Credit Card Bill - ${card.bank_name} •••• ${card.card_last4}`,
        -payAmount,
        "cc-billpay@bank.internal",
        `Bill clearance ref: ${txRef} | Bank: ${card.bank_name}`,
      ]
    );

    // 5. Log Cashback Credit Transaction
    await client.query(
      `INSERT INTO transactions (user_id, name, amount, category, status, notes)
       VALUES ($1, $2, $3, 'Cashback', 'success', $4)`,
      [
        req.user.id,
        `Instant Cashback (${card.bank_name} Bill Pay) 🎁`,
        cashbackEarned,
        `1% instant reward credited for transaction ${txRef}`,
      ]
    );

    // 6. Record in credit_card_payments
    const paymentRecord = await client.query(
      `INSERT INTO credit_card_payments 
        (card_id, user_id, amount, payment_method, cashback_earned, transaction_ref, status)
       VALUES ($1, $2, $3, 'Neo Wallet Balance', $4, $5, 'success')
       RETURNING *`,
      [card.id, req.user.id, payAmount, cashbackEarned, txRef]
    );

    // 7. Security Notification
    await client.query(
      `INSERT INTO notifications (user_id, title, message)
       VALUES ($1, 'Credit Card Bill Paid 💳', $2)`,
      [
        req.user.id,
        `₹${payAmount.toLocaleString("en-IN")} successfully paid towards ${card.bank_name} (${card.card_variant}). You unlocked ₹${cashbackEarned} instant cashback & 75 NeoCoins!`,
      ]
    );

    await client.query("COMMIT");

    res.json({
      success: true,
      message: `Bill of ₹${payAmount.toLocaleString("en-IN")} paid successfully!`,
      cashbackEarned,
      newOutstanding,
      newMinDue,
      newBalance: finalBalance,
      transactionRef: txRef,
      payment: paymentRecord.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// 4. GET PAYMENT HISTORY
router.get("/history", protect, async (req, res) => {
  try {
    const history = await pool.query(
      `SELECT p.*, c.bank_name, c.card_variant, c.card_last4
       FROM credit_card_payments p
       JOIN external_credit_cards c ON p.card_id = c.id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );

    res.json(history.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. DELETE / UNLINK CARD
router.delete("/:id", protect, async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM external_credit_cards WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );

    res.json({ message: "Credit card unlinked successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
