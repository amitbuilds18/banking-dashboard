import express from "express";
import pool from "../db.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

/* ===========================================================
   ADD TRANSACTION
=========================================================== */

router.post("/", protect, async (req, res) => {
  try {
    const { name, amount, status, receiver_email } = req.body;

    const result = await pool.query(
      `
      INSERT INTO transactions
      (name, amount, status, user_id, receiver_email)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
      `,
      [
        name,
        Number(amount),
        status || "success",
        req.user.id,
        receiver_email || null
      ]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/* ===========================================================
   GET ALL TRANSACTIONS
=========================================================== */

router.get("/", protect, async (req, res) => {
  try {

    const result = await pool.query(
      `
      SELECT *
      FROM transactions
      WHERE user_id=$1
      ORDER BY created_at DESC
      `,
      [req.user.id]
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/* ===========================================================
   SEND MONEY
=========================================================== */

router.post("/send", protect, async (req, res) => {

  const client = await pool.connect();

  try {

    const { receiver_email, amount } = req.body;

    const senderId = req.user.id;

    const numericAmount = Number(amount);

    if (!receiver_email || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        error: "Receiver email and a positive amount are required"
      });
    }

    await client.query("BEGIN");

    // Sender
    const sender = await client.query(
      `
      SELECT *
      FROM users
      WHERE id=$1
      FOR UPDATE
      `,
      [senderId]
    );

    if (sender.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "Sender not found"
      });
    }

    // Receiver
    const receiver = await client.query(
      `
      SELECT *
      FROM users
      WHERE email=$1
      `,
      [receiver_email]
    );

    if (receiver.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "Receiver not found"
      });
    }

    const receiverId = receiver.rows[0].id;

    if (receiverId === senderId) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Cannot send money to yourself"
      });
    }

    const balance = Number(sender.rows[0].balance);

    if (balance < numericAmount) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Insufficient balance"
      });
    }

    // Deduct sender balance
    await client.query(
      `
      UPDATE users
      SET balance = balance - $1
      WHERE id=$2
      `,
      [numericAmount, senderId]
    );

    // Add receiver balance
    await client.query(
      `
      UPDATE users
      SET balance = balance + $1
      WHERE id=$2
      `,
      [numericAmount, receiverId]
    );

    // Sender transaction
    await client.query(
      `
      INSERT INTO transactions
      (name,amount,status,user_id,receiver_email)
      VALUES($1,$2,$3,$4,$5)
      `,
      [
        "Transfer Sent",
        -numericAmount,
        "success",
        senderId,
        receiver_email
      ]
    );

    // Receiver transaction
    await client.query(
      `
      INSERT INTO transactions
      (name,amount,status,user_id,receiver_email)
      VALUES($1,$2,$3,$4,$5)
      `,
      [
        "Money Received",
        numericAmount,
        "success",
        receiverId,
        sender.rows[0].email
      ]
    );

    await client.query("COMMIT");

    res.json({
      message: "Money transferred successfully"
    });

  } catch (err) {

    await client.query("ROLLBACK");

    console.error(err);

    res.status(500).json({
      error: err.message
    });

  } finally {
    client.release();
  }
});

/* ===========================================================
   DELETE
=========================================================== */

router.delete("/:id", protect, async (req, res) => {

  try {

    const result = await pool.query(
      `
      DELETE FROM transactions
      WHERE id=$1
      AND user_id=$2
      RETURNING *
      `,
      [
        req.params.id,
        req.user.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Transaction not found"
      });
    }

    res.json({
      message: "Deleted Successfully"
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
});

/* ===========================================================
   SUMMARY
=========================================================== */

router.get("/summary", protect, async (req, res) => {

  try {

    const user = await pool.query(
      `
      SELECT balance
      FROM users
      WHERE id=$1
      `,
      [req.user.id]
    );

    const income = await pool.query(
      `
      SELECT COALESCE(SUM(amount),0) income
      FROM transactions
      WHERE user_id=$1
      AND amount>0
      `,
      [req.user.id]
    );

    const expense = await pool.query(
      `
      SELECT COALESCE(ABS(SUM(amount)),0) expense
      FROM transactions
      WHERE user_id=$1
      AND amount<0
      `,
      [req.user.id]
    );

    res.json({

      balance: Number(user.rows[0].balance),

      income: Number(income.rows[0].income),

      expense: Number(expense.rows[0].expense),

      savings: Number(user.rows[0].balance) * 0.4

    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
});

/* ===========================================================
   CHART
=========================================================== */

router.get("/chart", protect, async (req, res) => {

  try {

    const result = await pool.query(
      `
      SELECT
      name,
      ABS(SUM(amount)) AS value

      FROM transactions

      WHERE user_id=$1
      AND amount<0

      GROUP BY name
      `,
      [req.user.id]
    );

    res.json(result.rows);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
});

export default router;