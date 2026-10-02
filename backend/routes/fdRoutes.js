import express from "express";
import pool from "../db.js";
import protect from "../middleware/authMiddleware.js";
import { sendDebitNotification } from "../services/emailService.js";

const router = express.Router();

/**
 * Standard fixed deposit tenure & interest rate configurations
 */
export const FD_RATES = {
  3: 6.0,   // 3 Months - 6.00% p.a.
  6: 6.5,   // 6 Months - 6.50% p.a.
  12: 7.25, // 1 Year - 7.25% p.a. (Recommended)
  24: 7.7,  // 2 Years - 7.70% p.a.
  36: 8.1,  // 3 Years - 8.10% p.a.
  60: 8.5,  // 5 Years - 8.50% p.a. (Tax saver/High yield)
};

/**
 * Helper to calculate quarterly compounded maturity amount
 */
export function calculateFDMaturity(principal, tenureMonths, rate) {
  const n = 4; // quarterly compounding
  const t = tenureMonths / 12;
  const r = rate / 100;
  const maturity = Math.round(principal * Math.pow(1 + r / n, n * t));
  const interestEarned = maturity - principal;
  return { maturity, interestEarned };
}

// ==========================================
// 1. GET ALL FIXED DEPOSITS & SUMMARY
// ==========================================
router.get("/", protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Check & auto-mature any FDs that have reached maturity_date
    const dueFds = await pool.query(
      `SELECT * FROM fixed_deposits 
       WHERE user_id = $1 AND status = 'active' AND maturity_date <= CURRENT_DATE`,
      [userId]
    );

    for (const fd of dueFds.rows) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // Credit full maturity amount to user balance
        await client.query(
          `UPDATE users SET balance = balance + $1 WHERE id = $2`,
          [Number(fd.maturity_amount), userId]
        );

        // Update FD record to matured
        await client.query(
          `UPDATE fixed_deposits 
           SET status = 'matured', payout_amount = $1, liquidation_date = CURRENT_DATE 
           WHERE id = $2`,
          [Number(fd.maturity_amount), fd.id]
        );

        // Record transaction
        await client.query(
          `INSERT INTO transactions (user_id, name, amount, status, category, notes) 
           VALUES ($1, $2, $3, 'success', 'Investment Return', $4)`,
          [
            userId,
            `FD Maturity Credit (${fd.deposit_number})`,
            Number(fd.maturity_amount),
            `Term of ${fd.tenure_months} months completed at ${fd.interest_rate}% p.a. Principal + Interest credited.`,
          ]
        );

        // Record notification
        await client.query(
          `INSERT INTO notifications (user_id, title, message) 
           VALUES ($1, $2, $3)`,
          [
            userId,
            "Fixed Deposit Matured 🎉",
            `Deposit ${fd.deposit_number} has matured! ₹${Number(fd.maturity_amount).toLocaleString("en-IN")} credited directly to your main account.`,
          ]
        );

        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        console.error("Auto maturity processing error for FD", fd.id, e);
      } finally {
        client.release();
      }
    }

    // 2. Fetch all FDs for this user
    const result = await pool.query(
      `SELECT * FROM fixed_deposits WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    const now = new Date();

    // 3. Compute dynamic live progress & accrued interest for each FD
    const formattedFds = result.rows.map((fd) => {
      const start = new Date(fd.start_date);
      const maturity = new Date(fd.maturity_date);

      const totalDays = Math.max(1, Math.round((maturity - start) / (1000 * 60 * 60 * 24)));
      const daysElapsed = Math.max(0, Math.round((now - start) / (1000 * 60 * 60 * 24)));
      const daysRemaining = Math.max(0, Math.round((maturity - now) / (1000 * 60 * 60 * 24)));

      const progressPct = fd.status === "active" 
        ? Math.min(100, Math.max(0, Math.round((daysElapsed / totalDays) * 100))) 
        : 100;

      // Live Accrued interest up to today
      const accruedFraction = Math.min(1, Math.max(0, daysElapsed / totalDays));
      const accruedInterest = fd.status === "active"
        ? Math.round(Number(fd.interest_earned) * accruedFraction)
        : Number(fd.interest_earned);

      return {
        ...fd,
        principal_amount: Number(fd.principal_amount),
        interest_rate: Number(fd.interest_rate),
        maturity_amount: Number(fd.maturity_amount),
        interest_earned: Number(fd.interest_earned),
        payout_amount: fd.payout_amount ? Number(fd.payout_amount) : null,
        total_days: totalDays,
        days_elapsed: daysElapsed,
        days_remaining: daysRemaining,
        progress_percentage: progressPct,
        accrued_interest: accruedInterest,
      };
    });

    // 4. Calculate summary metrics
    const activeFds = formattedFds.filter((f) => f.status === "active");
    const totalPrincipal = activeFds.reduce((sum, f) => sum + f.principal_amount, 0);
    const totalMaturityExpected = activeFds.reduce((sum, f) => sum + f.maturity_amount, 0);
    const totalAccruedInterest = activeFds.reduce((sum, f) => sum + f.accrued_interest, 0);
    const totalLifetimeReturns = formattedFds
      .filter((f) => f.status === "matured")
      .reduce((sum, f) => sum + (f.payout_amount - f.principal_amount), 0);

    res.json({
      success: true,
      deposits: formattedFds,
      summary: {
        totalPrincipal,
        totalMaturityExpected,
        totalAccruedInterest,
        totalLifetimeReturns,
        activeCount: activeFds.length,
        totalCount: formattedFds.length,
        highestRate: activeFds.length > 0 ? Math.max(...activeFds.map((f) => f.interest_rate)) : 7.25,
      },
      availableRates: FD_RATES,
    });
  } catch (err) {
    console.error("Fetch Fixed Deposits Error:", err);
    res.status(500).json({ error: "Failed to retrieve fixed deposits" });
  }
});

// ==========================================
// 2. CREATE A NEW FIXED DEPOSIT
// ==========================================
router.post("/create", protect, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const { principal, tenureMonths } = req.body;

    const principalNum = Math.round(Number(principal));
    const tenureNum = parseInt(tenureMonths, 10);

    if (!principalNum || isNaN(principalNum) || principalNum < 1000) {
      return res.status(400).json({ error: "Minimum deposit amount is ₹1,000" });
    }

    if (principalNum > 5000000) {
      return res.status(400).json({ error: "Maximum deposit limit is ₹50,00,000 per FD" });
    }

    const rate = FD_RATES[tenureNum];
    if (!rate) {
      return res.status(400).json({ error: "Invalid tenure selected. Valid tenures: 3, 6, 12, 24, 36, 60 months" });
    }

    const { maturity, interestEarned } = calculateFDMaturity(principalNum, tenureNum, rate);

    await client.query("BEGIN");

    // Check user balance with row lock
    const userRes = await client.query(
      `SELECT id, name, email, balance FROM users WHERE id = $1 FOR UPDATE`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "User account not found" });
    }

    const user = userRes.rows[0];
    const currentBalance = Number(user.balance);

    if (currentBalance < principalNum) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: `Insufficient balance (₹${currentBalance.toLocaleString("en-IN")}). You need ₹${principalNum.toLocaleString("en-IN")} to book this FD.`,
      });
    }

    // 1. Deduct principal from user balance
    const newBalance = currentBalance - principalNum;
    await client.query(`UPDATE users SET balance = $1 WHERE id = $2`, [newBalance, userId]);

    // 2. Unique FD deposit number
    const depositNumber = `FD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    // 3. Insert Fixed Deposit Record
    const fdRes = await client.query(
      `INSERT INTO fixed_deposits (
        user_id, deposit_number, principal_amount, interest_rate,
        tenure_months, maturity_amount, interest_earned,
        start_date, maturity_date, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, CURRENT_DATE + ($5 || ' months')::interval, 'active'
      ) RETURNING *`,
      [userId, depositNumber, principalNum, rate, tenureNum, maturity, interestEarned]
    );

    const createdFd = fdRes.rows[0];

    // 4. Record Transaction
    await client.query(
      `INSERT INTO transactions (user_id, name, amount, status, category, notes)
       VALUES ($1, $2, $3, 'success', 'Investment', $4)`,
      [
        userId,
        `Fixed Deposit Booking (${depositNumber})`,
        -principalNum,
        `Locked for ${tenureNum} Months at ${rate}% p.a. Expected Return: ₹${maturity.toLocaleString("en-IN")}`,
      ]
    );

    // 5. In-app Notification
    await client.query(
      `INSERT INTO notifications (user_id, title, message)
       VALUES ($1, $2, $3)`,
      [
        userId,
        "Fixed Deposit Booked Successfully 🏛️",
        `₹${principalNum.toLocaleString("en-IN")} locked in Deposit ${depositNumber} at ${rate}% p.a. Maturity value: ₹${maturity.toLocaleString("en-IN")}.`,
      ]
    );

    await client.query("COMMIT");

    // 6. Optional Email Notification
    if (user.email) {
      sendDebitNotification({
        senderEmail: user.email,
        senderName: user.name,
        receiverEmail: "invest@novapay.bank (Term Deposit)",
        amount: principalNum,
        balance: newBalance,
        transactionId: depositNumber,
      }).catch((e) => console.log("FD Email Notice Note:", e.message));
    }

    res.status(201).json({
      success: true,
      message: `Fixed Deposit ${depositNumber} opened successfully!`,
      deposit: {
        ...createdFd,
        principal_amount: Number(createdFd.principal_amount),
        interest_rate: Number(createdFd.interest_rate),
        maturity_amount: Number(createdFd.maturity_amount),
        interest_earned: Number(createdFd.interest_earned),
      },
      updatedBalance: newBalance,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Create Fixed Deposit Error:", err);
    res.status(500).json({ error: err.message || "Failed to create fixed deposit" });
  } finally {
    client.release();
  }
});

// ==========================================
// 3. PREMATURE LIQUIDATION / WITHDRAWAL
// ==========================================
router.post("/:id/liquidate", protect, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const fdId = parseInt(req.params.id, 10);

    await client.query("BEGIN");

    // Fetch FD with lock
    const fdRes = await client.query(
      `SELECT * FROM fixed_deposits WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [fdId, userId]
    );

    if (fdRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Fixed deposit not found" });
    }

    const fd = fdRes.rows[0];

    if (fd.status !== "active") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: `This fixed deposit is already ${fd.status}` });
    }

    // Calculate premature payout:
    // User gets Principal + Accrued Interest minus a 0.5% premature closure fee
    const now = new Date();
    const start = new Date(fd.start_date);
    const maturity = new Date(fd.maturity_date);

    const totalDays = Math.max(1, Math.round((maturity - start) / (1000 * 60 * 60 * 24)));
    const daysElapsed = Math.max(1, Math.round((now - start) / (1000 * 60 * 60 * 24)));

    const timeFraction = Math.min(1, daysElapsed / totalDays);
    const rawAccruedInterest = Number(fd.interest_earned) * timeFraction;

    // 10% penalty on the accrued interest for early break (banking standard)
    const penalty = rawAccruedInterest * 0.10;
    const netInterest = Math.max(0, Math.round(rawAccruedInterest - penalty));
    const payoutAmount = Math.round(Number(fd.principal_amount) + netInterest);

    // Credit payout to user balance
    const userRes = await client.query(
      `UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance`,
      [payoutAmount, userId]
    );

    const updatedBalance = Number(userRes.rows[0].balance);

    // Mark FD as liquidated
    await client.query(
      `UPDATE fixed_deposits 
       SET status = 'liquidated', payout_amount = $1, liquidation_date = CURRENT_DATE 
       WHERE id = $2`,
      [payoutAmount, fdId]
    );

    // Record Transaction
    await client.query(
      `INSERT INTO transactions (user_id, name, amount, status, category, notes)
       VALUES ($1, $2, $3, 'success', 'Investment Return', $4)`,
      [
        userId,
        `FD Early Liquidation (${fd.deposit_number})`,
        payoutAmount,
        `Principal: ₹${Number(fd.principal_amount).toLocaleString("en-IN")} + Accrued Interest: ₹${netInterest.toLocaleString("en-IN")} (after early withdrawal fee).`,
      ]
    );

    // Notification
    await client.query(
      `INSERT INTO notifications (user_id, title, message)
       VALUES ($1, $2, $3)`,
      [
        userId,
        "Fixed Deposit Liquidated 💸",
        `₹${payoutAmount.toLocaleString("en-IN")} credited to your account from liquidated FD ${fd.deposit_number}.`,
      ]
    );

    await client.query("COMMIT");

    res.json({
      success: true,
      message: `Deposit liquidated successfully. ₹${payoutAmount.toLocaleString("en-IN")} credited to your wallet.`,
      payoutAmount,
      principalRefunded: Number(fd.principal_amount),
      netInterestPaid: netInterest,
      updatedBalance,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("FD Liquidation Error:", err);
    res.status(500).json({ error: err.message || "Failed to liquidate fixed deposit" });
  } finally {
    client.release();
  }
});

export default router;
