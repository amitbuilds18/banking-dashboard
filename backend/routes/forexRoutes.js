import express from "express";
import pool from "../db.js";
import protect from "../middleware/authMiddleware.js";
import { sendDebitNotification } from "../services/emailService.js";

const router = express.Router();

export const CURRENCY_METADATA = {
  INR: { symbol: "₹", name: "Indian Rupee", flag: "🇮🇳", rateToInr: 1.0, isBase: true, change24h: "0.00%" },
  USD: { symbol: "$", name: "US Dollar", flag: "🇺🇸", rateToInr: 83.85, change24h: "+0.14%" },
  EUR: { symbol: "€", name: "Euro", flag: "🇪🇺", rateToInr: 91.40, change24h: "-0.22%" },
  GBP: { symbol: "£", name: "British Pound", flag: "🇬🇧", rateToInr: 109.20, change24h: "+0.35%" },
  AED: { symbol: "د.إ", name: "UAE Dirham", flag: "🇦🇪", rateToInr: 22.82, change24h: "+0.02%" },
  JPY: { symbol: "¥", name: "Japanese Yen", flag: "🇯🇵", rateToInr: 0.57, change24h: "-0.45%" },
  CAD: { symbol: "C$", name: "Canadian Dollar", flag: "🇨🇦", rateToInr: 62.10, change24h: "+0.11%" },
  SGD: { symbol: "S$", name: "Singapore Dollar", flag: "🇸🇬", rateToInr: 64.90, change24h: "+0.08%" },
};

/**
 * Calculate rate and exchange amounts between any two currencies
 */
export function calculateExchange({ from, to, amount }) {
  const fromMeta = CURRENCY_METADATA[from];
  const toMeta = CURRENCY_METADATA[to];

  if (!fromMeta || !toMeta) {
    throw new Error(`Unsupported currency conversion: ${from} to ${to}`);
  }

  // Cross rate calculation: (from -> INR) / (to -> INR)
  const exchangeRate = fromMeta.rateToInr / toMeta.rateToInr;

  // Ultra-low 0.25% institutional exchange fee
  const feeRate = 0.0025;
  const fee = Number((amount * feeRate).toFixed(4));
  const netAmount = Math.max(0, amount - fee);
  const toAmount = Number((netAmount * exchangeRate).toFixed(2));

  return {
    exchangeRate: Number(exchangeRate.toFixed(6)),
    inverseRate: Number((1 / exchangeRate).toFixed(6)),
    fee,
    netAmount,
    toAmount,
  };
}

// ===========================================
// 1. GET ALL CURRENCY WALLETS & PORTFOLIO VALUATION
// ===========================================
router.get("/wallets", protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Fetch user INR balance
    const userRes = await pool.query(`SELECT balance, name, email FROM users WHERE id = $1`, [userId]);
    const inrBalance = Number(userRes.rows[0]?.balance || 0);

    // 2. Fetch foreign currency wallets
    const walletRes = await pool.query(
      `SELECT currency, balance FROM currency_wallets WHERE user_id = $1`,
      [userId]
    );

    const walletMap = new Map();
    walletRes.rows.forEach((w) => {
      walletMap.set(w.currency, Number(w.balance));
    });

    // 3. Assemble all wallets (including standard supported foreign currencies)
    const currencies = Object.keys(CURRENCY_METADATA);
    let totalPortfolioInr = inrBalance;

    const wallets = currencies.map((curr) => {
      const meta = CURRENCY_METADATA[curr];
      const balance = curr === "INR" ? inrBalance : Number((walletMap.get(curr) || 0).toFixed(2));
      const inrEquivalent = Number((balance * meta.rateToInr).toFixed(2));

      if (curr !== "INR") {
        totalPortfolioInr += inrEquivalent;
      }

      return {
        currency: curr,
        symbol: meta.symbol,
        name: meta.name,
        flag: meta.flag,
        balance,
        rateToInr: meta.rateToInr,
        inrEquivalent,
        change24h: meta.change24h,
        isBase: Boolean(meta.isBase),
      };
    });

    const totalPortfolioUsd = Number((totalPortfolioInr / CURRENCY_METADATA.USD.rateToInr).toFixed(2));

    res.json({
      success: true,
      totalPortfolioInr: Number(totalPortfolioInr.toFixed(2)),
      totalPortfolioUsd,
      wallets,
      rates: CURRENCY_METADATA,
    });
  } catch (err) {
    console.error("Forex Wallets Fetch Error:", err);
    res.status(500).json({ error: "Failed to load forex wallets" });
  }
});

// ===========================================
// 2. GET LIVE QUOTE FOR CURRENCY CONVERSION (Public)
// ===========================================
router.get("/quote", async (req, res) => {
  try {
    const { from, to, amount } = req.query;
    const fromCurr = (from || "INR").toUpperCase();
    const toCurr = (to || "USD").toUpperCase();
    const numAmount = Number(amount || 100);

    if (numAmount <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0" });
    }

    const quote = calculateExchange({ from: fromCurr, to: toCurr, amount: numAmount });

    res.json({
      success: true,
      from: fromCurr,
      to: toCurr,
      fromAmount: numAmount,
      ...quote,
      fromMeta: CURRENCY_METADATA[fromCurr],
      toMeta: CURRENCY_METADATA[toCurr],
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ===========================================
// 3. EXECUTE INSTANT CURRENCY CONVERSION / EXCHANGE
// ===========================================
router.post("/convert", protect, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const { fromCurrency, toCurrency, amount } = req.body;

    const fromCurr = (fromCurrency || "").toUpperCase();
    const toCurr = (toCurrency || "").toUpperCase();
    const fromAmount = Number(amount);

    if (!fromCurr || !toCurr || fromCurr === toCurr) {
      return res.status(400).json({ error: "Please select two distinct currencies to convert." });
    }

    if (!fromAmount || isNaN(fromAmount) || fromAmount <= 0) {
      return res.status(400).json({ error: "Please enter a valid positive conversion amount." });
    }

    const { exchangeRate, fee, toAmount } = calculateExchange({
      from: fromCurr,
      to: toCurr,
      amount: fromAmount,
    });

    await client.query("BEGIN");

    // 1. Check Source Balance
    let sourceBalance = 0;
    if (fromCurr === "INR") {
      const userRes = await client.query(
        `SELECT balance, name, email FROM users WHERE id = $1 FOR UPDATE`,
        [userId]
      );
      sourceBalance = Number(userRes.rows[0]?.balance || 0);

      if (sourceBalance < fromAmount) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: `Insufficient INR balance (₹${sourceBalance.toLocaleString("en-IN")}). Required: ₹${fromAmount.toLocaleString("en-IN")}.`,
        });
      }

      // Deduct from INR
      await client.query(`UPDATE users SET balance = balance - $1 WHERE id = $2`, [fromAmount, userId]);
    } else {
      const walletRes = await client.query(
        `SELECT balance FROM currency_wallets WHERE user_id = $1 AND currency = $2 FOR UPDATE`,
        [userId, fromCurr]
      );
      sourceBalance = Number(walletRes.rows[0]?.balance || 0);

      if (sourceBalance < fromAmount) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: `Insufficient ${fromCurr} balance (${CURRENCY_METADATA[fromCurr]?.symbol || ""}${sourceBalance}). Required: ${fromAmount}.`,
        });
      }

      // Deduct from foreign currency wallet
      await client.query(
        `UPDATE currency_wallets SET balance = balance - $1 WHERE user_id = $2 AND currency = $3`,
        [fromAmount, userId, fromCurr]
      );
    }

    // 2. Credit Target Balance
    if (toCurr === "INR") {
      await client.query(`UPDATE users SET balance = balance + $1 WHERE id = $2`, [toAmount, userId]);
    } else {
      await client.query(
        `INSERT INTO currency_wallets (user_id, currency, balance)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, currency)
         DO UPDATE SET balance = currency_wallets.balance + EXCLUDED.balance`,
        [userId, toCurr, toAmount]
      );
    }

    // 3. Record Forex Transaction
    const refId = `FX-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    await client.query(
      `INSERT INTO forex_transactions (
        user_id, from_currency, to_currency, from_amount, to_amount, exchange_rate, fee, type, reference_id, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'exchange', $8, $9)`,
      [
        userId,
        fromCurr,
        toCurr,
        fromAmount,
        toAmount,
        exchangeRate,
        fee,
        refId,
        `Exchanged ${fromCurr} to ${toCurr} at 1 ${fromCurr} = ${exchangeRate} ${toCurr}`,
      ]
    );

    // 4. Record Account Transaction for Master Statement
    await client.query(
      `INSERT INTO transactions (user_id, name, amount, status, category, notes)
       VALUES ($1, $2, $3, 'success', 'Forex Exchange', $4)`,
      [
        userId,
        `Forex: ${fromCurr} to ${toCurr}`,
        fromCurr === "INR" ? -fromAmount : toCurr === "INR" ? toAmount : 0,
        `Converted ${fromAmount} ${fromCurr} into ${toAmount} ${toCurr}. Ref: ${refId}`,
      ]
    );

    // 5. In-app Notification
    await client.query(
      `INSERT INTO notifications (user_id, title, message)
       VALUES ($1, $2, $3)`,
      [
        userId,
        "💱 Currency Converted Successfully",
        `Exchanged ${fromAmount} ${fromCurr} → ${toAmount} ${toCurr} (Rate: ${exchangeRate}). Ref: ${refId}`,
      ]
    );

    await client.query("COMMIT");

    res.json({
      success: true,
      message: `Successfully converted ${fromAmount} ${fromCurr} into ${toAmount} ${toCurr}!`,
      referenceId: refId,
      fromAmount,
      fromCurrency: fromCurr,
      toAmount,
      toCurrency: toCurr,
      exchangeRate,
      fee,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Forex Conversion Error:", err);
    res.status(500).json({ error: err.message || "Currency exchange failed" });
  } finally {
    client.release();
  }
});

// ===========================================
// 4. INTERNATIONAL WIRE / SWIFT TRANSFER OUT
// ===========================================
router.post("/transfer", protect, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const { currency, amount, recipientName, recipientEmail, ibanOrSwift, purpose } = req.body;

    const curr = (currency || "").toUpperCase();
    const transferAmount = Number(amount);

    if (!curr || !transferAmount || isNaN(transferAmount) || transferAmount <= 0) {
      return res.status(400).json({ error: "Invalid currency or transfer amount." });
    }

    if (!recipientName || !recipientEmail) {
      return res.status(400).json({ error: "Recipient name and email are required for international transfers." });
    }

    await client.query("BEGIN");

    // Fetch user details
    const userRes = await client.query(
      `SELECT name, email, balance FROM users WHERE id = $1 FOR UPDATE`,
      [userId]
    );
    const user = userRes.rows[0];

    // Check balance
    if (curr === "INR") {
      if (Number(user.balance) < transferAmount) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Insufficient INR balance." });
      }
      await client.query(`UPDATE users SET balance = balance - $1 WHERE id = $2`, [transferAmount, userId]);
    } else {
      const walletRes = await client.query(
        `SELECT balance FROM currency_wallets WHERE user_id = $1 AND currency = $2 FOR UPDATE`,
        [userId, curr]
      );
      const currBalance = Number(walletRes.rows[0]?.balance || 0);
      if (currBalance < transferAmount) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: `Insufficient ${curr} balance.` });
      }
      await client.query(
        `UPDATE currency_wallets SET balance = balance - $1 WHERE user_id = $2 AND currency = $3`,
        [transferAmount, userId, curr]
      );
    }

    const swiftRef = `SWIFT-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    // Record Forex Transaction
    await client.query(
      `INSERT INTO forex_transactions (
        user_id, from_currency, to_currency, from_amount, to_amount, exchange_rate, fee, type, reference_id, recipient_info, notes
      ) VALUES ($1, $2, $2, $3, $3, 1.0, 0, 'transfer_out', $4, $5, $6)`,
      [
        userId,
        curr,
        transferAmount,
        swiftRef,
        JSON.stringify({ recipientName, recipientEmail, ibanOrSwift, purpose }),
        `International transfer to ${recipientName} (${recipientEmail}). SWIFT/IBAN: ${ibanOrSwift || "N/A"}`,
      ]
    );

    // Record Account Transaction
    await client.query(
      `INSERT INTO transactions (user_id, name, amount, status, category, notes)
       VALUES ($1, $2, $3, 'success', 'International Transfer', $4)`,
      [
        userId,
        `SWIFT Out: ${recipientName} (${curr})`,
        curr === "INR" ? -transferAmount : 0,
        `Sent ${transferAmount} ${curr} via Global Wire. Ref: ${swiftRef}`,
      ]
    );

    // In-app Notification
    await client.query(
      `INSERT INTO notifications (user_id, title, message)
       VALUES ($1, $2, $3)`,
      [
        userId,
        "🌐 International Transfer Sent",
        `Sent ${transferAmount} ${curr} to ${recipientName}. Ref: ${swiftRef}`,
      ]
    );

    await client.query("COMMIT");

    // Async Email Advice
    if (user.email) {
      sendDebitNotification({
        senderEmail: user.email,
        senderName: user.name,
        receiverEmail: `${recipientName} <${recipientEmail}>`,
        amount: transferAmount,
        balance: curr === "INR" ? Number(user.balance) - transferAmount : 0,
        transactionId: swiftRef,
      }).catch((e) => console.log("Forex transfer email note:", e.message));
    }

    res.json({
      success: true,
      message: `Successfully transferred ${transferAmount} ${curr} to ${recipientName}!`,
      referenceId: swiftRef,
      currency: curr,
      amount: transferAmount,
      recipientName,
      recipientEmail,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Forex Transfer Error:", err);
    res.status(500).json({ error: err.message || "International transfer failed" });
  } finally {
    client.release();
  }
});

// ===========================================
// 5. GET FOREX TRANSACTION HISTORY
// ===========================================
router.get("/transactions", protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM forex_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );

    res.json({
      success: true,
      transactions: result.rows.map((r) => ({
        ...r,
        from_amount: Number(r.from_amount),
        to_amount: Number(r.to_amount),
        exchange_rate: Number(r.exchange_rate),
        fee: Number(r.fee),
      })),
    });
  } catch (err) {
    console.error("Forex History Fetch Error:", err);
    res.status(500).json({ error: "Failed to load forex history" });
  }
});

export default router;
