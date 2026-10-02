import express from "express";
import pool from "../db.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * GET /api/recurring
 * Fetches all recurring mandates and calculates commitments
 */
router.get("/", protect, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        id,
        title,
        category,
        amount,
        frequency,
        receiver_name,
        receiver_account,
        start_date,
        next_execution,
        status,
        icon,
        color,
        auto_debit,
        last_processed_at,
        created_at
      FROM recurring_payments
      WHERE user_id = $1
      ORDER BY next_execution ASC, created_at DESC
      `,
      [req.user.id]
    );

    const items = result.rows;

    // Calculate monthly commitment
    let monthlyCommitted = 0;
    let activeCount = 0;

    items.forEach((item) => {
      if (item.status === "active") {
        activeCount++;
        const amt = Number(item.amount) || 0;
        if (item.frequency === "weekly") {
          monthlyCommitted += amt * 4;
        } else if (item.frequency === "quarterly") {
          monthlyCommitted += amt / 3;
        } else if (item.frequency === "yearly") {
          monthlyCommitted += amt / 12;
        } else {
          // monthly default
          monthlyCommitted += amt;
        }
      }
    });

    res.json({
      items,
      summary: {
        totalItems: items.length,
        activeCount,
        monthlyCommitted: Math.round(monthlyCommitted),
      },
    });
  } catch (err) {
    console.error("Error fetching recurring payments:", err);
    res.status(500).json({ error: "Failed to fetch recurring payments" });
  }
});

/**
 * POST /api/recurring
 * Creates a new recurring mandate
 */
router.post("/", protect, async (req, res) => {
  try {
    const {
      title,
      category,
      amount,
      frequency = "monthly",
      receiver_name = "",
      receiver_account = "",
      icon = "⚡",
      color = "from-indigo-500 to-purple-600",
      auto_debit = true,
      next_execution,
    } = req.body;

    const numAmount = Number(amount);
    if (!title || !numAmount || numAmount <= 0) {
      return res.status(400).json({
        error: "Title and a positive amount are required",
      });
    }

    // Default next_execution date to 1 month from now or requested date
    let executionDate = next_execution;
    if (!executionDate) {
      const d = new Date();
      if (frequency === "weekly") {
        d.setDate(d.getDate() + 7);
      } else if (frequency === "quarterly") {
        d.setMonth(d.getMonth() + 3);
      } else if (frequency === "yearly") {
        d.setFullYear(d.getFullYear() + 1);
      } else {
        d.setMonth(d.getMonth() + 1);
      }
      executionDate = d.toISOString().split("T")[0];
    }

    const result = await pool.query(
      `
      INSERT INTO recurring_payments (
        user_id,
        title,
        category,
        amount,
        frequency,
        receiver_name,
        receiver_account,
        next_execution,
        status,
        icon,
        color,
        auto_debit
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, $10, $11)
      RETURNING *
      `,
      [
        req.user.id,
        title.trim(),
        category || "Subscription",
        numAmount,
        frequency,
        receiver_name.trim(),
        receiver_account.trim(),
        executionDate,
        icon,
        color,
        Boolean(auto_debit),
      ]
    );

    res.status(201).json({
      message: "Recurring autopay scheduled successfully",
      item: result.rows[0],
    });
  } catch (err) {
    console.error("Error creating recurring payment:", err);
    res.status(500).json({ error: "Failed to schedule recurring payment" });
  }
});

/**
 * PATCH /api/recurring/:id/status
 * Pauses or resumes an autopay rule
 */
router.patch("/:id/status", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "paused"].includes(status)) {
      return res.status(400).json({ error: "Status must be 'active' or 'paused'" });
    }

    const result = await pool.query(
      `
      UPDATE recurring_payments
      SET status = $1
      WHERE id = $2 AND user_id = $3
      RETURNING *
      `,
      [status, id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Mandate not found" });
    }

    res.json({
      message: `Autopay ${status === "active" ? "resumed" : "paused"}`,
      item: result.rows[0],
    });
  } catch (err) {
    console.error("Error updating status:", err);
    res.status(500).json({ error: "Failed to update mandate status" });
  }
});

/**
 * POST /api/recurring/:id/trigger
 * Executes an autopay instruction immediately with atomic balance check & transaction entry
 */
router.post("/:id/trigger", protect, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query("BEGIN");

    // Fetch recurring instruction
    const recurringRes = await client.query(
      "SELECT * FROM recurring_payments WHERE id = $1 AND user_id = $2 FOR UPDATE",
      [id, req.user.id]
    );

    if (recurringRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Mandate not found" });
    }

    const item = recurringRes.rows[0];
    const amount = Number(item.amount);

    // Lock user for balance check
    const userRes = await client.query(
      "SELECT balance, name FROM users WHERE id = $1 FOR UPDATE",
      [req.user.id]
    );
    const currentBalance = Number(userRes.rows[0].balance);

    if (currentBalance < amount) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: `Insufficient funds. Required: ₹${amount.toLocaleString("en-IN")}, Available: ₹${currentBalance.toLocaleString("en-IN")}`,
      });
    }

    // Deduct user balance
    const updatedUserRes = await client.query(
      "UPDATE users SET balance = balance - $1 WHERE id = $2 RETURNING balance",
      [amount, req.user.id]
    );

    // Record transaction
    const txName = `[Autopay] ${item.title}`;
    await client.query(
      `
      INSERT INTO transactions (user_id, name, amount, status, category, receiver_email)
      VALUES ($1, $2, $3, 'success', $4, $5)
      `,
      [
        req.user.id,
        txName,
        -Math.abs(amount),
        item.category || "Subscription",
        item.receiver_account || "Autopay Service",
      ]
    );

    // Advance next_execution
    let intervalStr = "1 month";
    if (item.frequency === "weekly") intervalStr = "7 days";
    else if (item.frequency === "quarterly") intervalStr = "3 months";
    else if (item.frequency === "yearly") intervalStr = "1 year";

    const updatedItemRes = await client.query(
      `
      UPDATE recurring_payments
      SET 
        last_processed_at = CURRENT_TIMESTAMP,
        next_execution = (CURRENT_DATE + INTERVAL '${intervalStr}')
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );

    // Add notification
    await client.query(
      `
      INSERT INTO notifications (user_id, title, message)
      VALUES ($1, $2, $3)
      `,
      [
        req.user.id,
        "⚡ Autopay Executed",
        `₹${amount.toLocaleString("en-IN")} debited for ${item.title}. Next due: ${new Date(
          updatedItemRes.rows[0].next_execution
        ).toLocaleDateString("en-IN")}`,
      ]
    );

    await client.query("COMMIT");

    res.json({
      message: `Successfully executed autopay for ${item.title}! 💸`,
      newBalance: updatedUserRes.rows[0].balance,
      item: updatedItemRes.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Autopay execution error:", err);
    res.status(500).json({ error: err.message || "Failed to process autopay" });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/recurring/:id
 * Cancels and removes an autopay mandate
 */
router.delete("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM recurring_payments WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Mandate not found" });
    }

    res.json({ message: "Recurring payment cancelled successfully" });
  } catch (err) {
    console.error("Error cancelling recurring payment:", err);
    res.status(500).json({ error: "Failed to cancel recurring payment" });
  }
});

export default router;
