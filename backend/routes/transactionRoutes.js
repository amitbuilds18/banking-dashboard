import express from "express";
import bcrypt from "bcrypt";
import pool from "../db.js";
import protect from "../middleware/authMiddleware.js";
import { sendDebitNotification, sendCreditNotification } from "../services/emailService.js";
import { emitToUser } from "../socket.js";

const router = express.Router();

/* ===========================================================
   ADD TRANSACTION
=========================================================== */

router.post("/", protect, async (req, res) => {
  try {
    const { name, amount, status, receiver_email } = req.body;

    if (!name || amount === undefined) {
      return res.status(400).json({ error: "Name and amount are required" });
    }

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

    res.status(201).json(result.rows[0]);

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

    const { receiver_email, amount, mpin } = req.body;

    const senderId = req.user.id;

    const numericAmount = Number(amount);

    if (!receiver_email || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        error: "Receiver email and a positive amount are required"
      });
    }

    if (!mpin || !/^\d{4}$/.test(String(mpin).trim())) {
      return res.status(400).json({
        error: "4-Digit Security MPIN is required (default: 1234)"
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

    const senderData = sender.rows[0];

    // Cryptographic MPIN Verification
    if (senderData.mpin) {
      const isMpinValid = await bcrypt.compare(String(mpin).trim(), senderData.mpin);
      if (!isMpinValid) {
        await client.query("ROLLBACK");
        return res.status(401).json({
          error: "Incorrect 4-digit Security MPIN. Transfer rejected."
        });
      }
    } else {
      // If user hasn't set a custom MPIN yet, check default '1234'
      if (String(mpin).trim() !== "1234") {
        await client.query("ROLLBACK");
        return res.status(401).json({
          error: "Default Security MPIN is 1234. Please enter 1234 or configure your custom PIN in Profile."
        });
      }
      // Auto-hash default 1234 for persistence
      const hashedDefault = await bcrypt.hash("1234", 10);
      await client.query("UPDATE users SET mpin = $1 WHERE id = $2", [hashedDefault, senderId]);
    }

    const normalizedReceiverEmail = receiver_email.trim().toLowerCase();

    // Receiver
    const receiver = await client.query(
      `
      SELECT *
      FROM users
      WHERE LOWER(email)=$1
      `,
      [normalizedReceiverEmail]
    );

    let receiverData;
    if (receiver.rows.length === 0) {
      // Automatically provision receiver account so funds and emails reach any real email address
      const defaultPass = await bcrypt.hash("NovaPay@123", 10);
      const defaultMpin = await bcrypt.hash("1234", 10);
      const namePart = normalizedReceiverEmail.split("@")[0];
      const displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);

      const createdUser = await client.query(
        `
        INSERT INTO users (name, email, password, balance, mpin)
        VALUES ($1, $2, $3, 0, $4)
        RETURNING *
        `,
        [displayName, normalizedReceiverEmail, defaultPass, defaultMpin]
      );
      receiverData = createdUser.rows[0];
    } else {
      receiverData = receiver.rows[0];
    }

    const receiverId = receiverData.id;

    if (receiverId === senderId) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Cannot send money to yourself"
      });
    }

    const balance = Number(sender.rows[0].balance || 0);

    let totalDeduction = numericAmount;
    let roundUpAmount = 0;
    let targetVault = null;

    if (req.body.round_up) {
      const nextFifty = Math.ceil(numericAmount / 50) * 50;
      const spareChange = nextFifty === numericAmount ? 50 : nextFifty - numericAmount;
      if (balance >= numericAmount + spareChange) {
        const vaultRes = await client.query(
          "SELECT * FROM vaults WHERE user_id=$1 AND is_roundup_target=true LIMIT 1",
          [senderId]
        );
        if (vaultRes.rows.length > 0) {
          roundUpAmount = spareChange;
          totalDeduction += spareChange;
          targetVault = vaultRes.rows[0];
        }
      }
    }

    if (balance < totalDeduction) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Insufficient balance for transfer" + (roundUpAmount > 0 ? " and round-up savings" : "")
      });
    }

    // Deduct sender balance
    await client.query(
      `
      UPDATE users
      SET balance = balance - $1
      WHERE id=$2
      `,
      [totalDeduction, senderId]
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

    // If round-up occurred, credit target vault
    if (roundUpAmount > 0 && targetVault) {
      await client.query(
        `
        UPDATE vaults
        SET current_amount = current_amount + $1
        WHERE id=$2
        `,
        [roundUpAmount, targetVault.id]
      );

      await client.query(
        `
        INSERT INTO transactions
        (name, amount, status, user_id, receiver_email)
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
          `Spare Change (${targetVault.name})`,
          -roundUpAmount,
          "success",
          senderId,
          null
        ]
      );
    }

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

    const newSenderBalance = balance - totalDeduction;
    const newReceiverBalance = Number(receiverData.balance || 0) + numericAmount;

    // ⚡ Real-Time Socket.io Updates
    emitToUser(receiverId, "payment_received", {
      amount: numericAmount,
      senderName: senderData.name,
      senderEmail: senderData.email,
      newBalance: newReceiverBalance,
      type: "transfer",
    });

    emitToUser(receiverId, "new_notification", {
      title: "Money Received 💸",
      message: `₹${numericAmount} received from ${senderData.name}`,
    });

    emitToUser(senderId, "balance_updated", {
      balance: newSenderBalance,
    });

    // 📧 Asynchronous Real Email Notifications (Non-blocking)

    sendDebitNotification({
      senderEmail: senderData.email,
      senderName: senderData.name,
      receiverEmail: receiverData.email,
      amount: numericAmount,
      balance: newSenderBalance,
    }).catch((e) => console.warn("Debit email error:", e.message));

    sendCreditNotification({
      receiverEmail: receiverData.email,
      receiverName: receiverData.name,
      senderName: senderData.name,
      senderEmail: senderData.email,
      amount: numericAmount,
      balance: newReceiverBalance,
    }).catch((e) => console.warn("Credit email error:", e.message));

    res.json({
      message: "Money transferred successfully" + (roundUpAmount > 0 ? ` (Saved ₹${roundUpAmount} in ${targetVault.name})` : ""),
      roundUpAmount
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

/* ===========================================================
   FINANCIAL INTELLIGENCE & ANOMALY INSIGHTS
=========================================================== */

router.get("/insights", protect, async (req, res) => {
  try {
    const userRes = await pool.query("SELECT balance FROM users WHERE id = $1", [req.user.id]);
    const balance = Number(userRes.rows[0]?.balance || 0);

    const txRes = await pool.query(
      `SELECT * FROM transactions 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 100`,
      [req.user.id]
    );

    const transactions = txRes.rows;
    const expenses = transactions.filter((t) => Number(t.amount) < 0);
    const totalExpense = expenses.reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);

    // Day of month
    const today = new Date();
    const dayOfMonth = Math.max(1, today.getDate());
    const dailyBurnRate = totalExpense > 0 ? Math.round(totalExpense / dayOfMonth) : 0;
    const runwayDays = dailyBurnRate > 0 ? Math.min(365, Math.floor(balance / dailyBurnRate)) : 999;

    // Anomalies: expenses > 15000 or > 3x the average transaction
    const avgTx = expenses.length > 0 ? totalExpense / expenses.length : 1000;
    const anomalies = expenses
      .filter((t) => Math.abs(Number(t.amount)) > Math.max(15000, avgTx * 2.5))
      .slice(0, 3)
      .map((t) => ({
        id: t.id,
        name: t.name,
        amount: Math.abs(Number(t.amount)),
        date: t.created_at,
        risk: "High Expense Spike",
      }));

    // Financial Health Score calculation (0-100)
    let healthScore = 70;
    if (balance > 50000) healthScore += 15;
    else if (balance > 20000) healthScore += 10;
    if (runwayDays > 60) healthScore += 15;
    else if (runwayDays < 15) healthScore -= 20;
    healthScore = Math.max(10, Math.min(99, healthScore));

    // Dynamic smart advice
    let smartAdvice = "Your financial velocity is balanced. Keep maintaining your current cash reserves.";
    if (runwayDays < 30) {
      smartAdvice = "Your runway is under 30 days based on recent spending. Consider pausing non-essential transfers.";
    } else if (balance > 75000) {
      smartAdvice = "Great liquidity! You could allocate ₹10,000 into a Savings Vault to earn interest.";
    }

    res.json({
      balance,
      monthlyExpense: totalExpense,
      dailyBurnRate,
      runwayDays,
      healthScore,
      healthGrade: healthScore >= 85 ? "A+ Outstanding" : healthScore >= 70 ? "B+ Stable" : "C Needs Attention",
      anomalies,
      smartAdvice,
    });
  } catch (err) {
    console.error("Insights Error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;