import express from "express";
import pool from "../db.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// Helper: Calculate live market quote with realistic dynamic fluctuation
function getLiveGoldRates() {
  const baseRate = 7245.5;
  // Natural minute-to-minute variance within +- 18 rupees
  const variance = Math.sin(Date.now() / 60000) * 14.25;
  const buyRate = parseFloat((baseRate + variance).toFixed(2));
  // 2.5% market buy-sell spread (vaulting, liquidity buffer, insurance)
  const sellRate = parseFloat((buyRate * 0.975).toFixed(2));

  return {
    buyRate, // rate user buys gold at (pre-GST)
    sellRate, // rate user sells gold at
    purity: "24K 99.9% Hallmark Pure",
    change24h: "+0.78%",
    high24h: (buyRate + 35.0).toFixed(2),
    low24h: (buyRate - 22.5).toFixed(2),
    vaultCustodian: "Brink's Global Safe Vaults / MMTC-PAMP Certified",
    timestamp: new Date().toISOString(),
  };
}

// @route   GET /api/gold/rates
// @desc    Get live 24K 99.9% pure gold market price & statistics
// @access  Public
router.get("/rates", (req, res) => {
  res.json(getLiveGoldRates());
});

// @route   GET /api/gold/portfolio
// @desc    Get user's gold vault holdings, profit/loss, active SIPs, and trade history
// @access  Private
router.get("/portfolio", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const rates = getLiveGoldRates();

    // 1. Fetch user balance
    const userRes = await pool.query(
      "SELECT balance, is_kyc_verified FROM users WHERE id = $1",
      [userId]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const balance = parseFloat(userRes.rows[0].balance);

    // 2. Fetch or initialize gold holdings
    let holdingsRes = await pool.query(
      "SELECT grams_held, total_invested, average_buy_price, updated_at FROM gold_holdings WHERE user_id = $1",
      [userId]
    );

    let gramsHeld = 0;
    let totalInvested = 0;
    let avgBuyPrice = 0;

    if (holdingsRes.rows.length > 0) {
      gramsHeld = parseFloat(holdingsRes.rows[0].grams_held || 0);
      totalInvested = parseFloat(holdingsRes.rows[0].total_invested || 0);
      avgBuyPrice = parseFloat(holdingsRes.rows[0].average_buy_price || 0);
    } else {
      // Create empty holding record
      await pool.query(
        "INSERT INTO gold_holdings (user_id, grams_held, total_invested, average_buy_price) VALUES ($1, 0, 0, 0)",
        [userId]
      );
    }

    const currentValuation = parseFloat((gramsHeld * rates.sellRate).toFixed(2));
    const pnlAmount = parseFloat((currentValuation - totalInvested).toFixed(2));
    const pnlPercentage =
      totalInvested > 0 ? parseFloat(((pnlAmount / totalInvested) * 100).toFixed(2)) : 0;

    // 3. Fetch active SIPs
    const sipsRes = await pool.query(
      "SELECT * FROM gold_sips WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );

    // 4. Fetch trade history
    const tradesRes = await pool.query(
      "SELECT * FROM gold_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20",
      [userId]
    );

    res.json({
      rates,
      holdings: {
        gramsHeld,
        totalInvested,
        averageBuyPrice: avgBuyPrice,
        currentValuation,
        pnlAmount,
        pnlPercentage,
      },
      sips: sipsRes.rows,
      transactions: tradesRes.rows,
      balance,
    });
  } catch (error) {
    console.error("Gold portfolio error:", error);
    res.status(500).json({ message: "Failed to fetch gold portfolio", error: error.message });
  }
});

// @route   POST /api/gold/buy
// @desc    Instant purchase of 24K digital gold from wallet balance
// @access  Private
router.post("/buy", protect, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const { amount } = req.body;

    const totalAmount = parseFloat(amount);
    if (isNaN(totalAmount) || totalAmount < 10) {
      return res.status(400).json({ message: "Minimum gold purchase amount is ₹10." });
    }

    const rates = getLiveGoldRates();
    // 3% standard Government GST
    const netGoldValue = totalAmount / 1.03;
    const gstAmount = totalAmount - netGoldValue;
    const gramsPurchased = parseFloat((netGoldValue / rates.buyRate).toFixed(4));

    if (gramsPurchased <= 0) {
      return res.status(400).json({ message: "Purchase amount too small to allocate gold." });
    }

    await client.query("BEGIN");

    // 1. Verify user balance
    const userRes = await client.query(
      "SELECT balance, reward_points FROM users WHERE id = $1 FOR UPDATE",
      [userId]
    );
    if (userRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "User not found." });
    }

    const userBalance = parseFloat(userRes.rows[0].balance);
    if (userBalance < totalAmount) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: `Insufficient wallet balance. Required: ₹${totalAmount.toLocaleString("en-IN")}, Available: ₹${userBalance.toLocaleString("en-IN")}.`,
      });
    }

    // 2. Deduct wallet balance
    const updatedUserRes = await client.query(
      "UPDATE users SET balance = balance - $1, reward_points = reward_points + 25 WHERE id = $2 RETURNING balance, reward_points",
      [totalAmount, userId]
    );

    // 3. Upsert gold holdings
    const holdingRes = await client.query(
      "SELECT grams_held, total_invested FROM gold_holdings WHERE user_id = $1 FOR UPDATE",
      [userId]
    );

    let currentGrams = 0;
    let currentInvested = 0;
    if (holdingRes.rows.length > 0) {
      currentGrams = parseFloat(holdingRes.rows[0].grams_held || 0);
      currentInvested = parseFloat(holdingRes.rows[0].total_invested || 0);
    }

    const newGrams = parseFloat((currentGrams + gramsPurchased).toFixed(4));
    const newInvested = parseFloat((currentInvested + totalAmount).toFixed(2));
    const newAvg = parseFloat((newInvested / newGrams).toFixed(2));

    await client.query(
      `INSERT INTO gold_holdings (user_id, grams_held, total_invested, average_buy_price, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) 
       DO UPDATE SET grams_held = $2, total_invested = $3, average_buy_price = $4, updated_at = CURRENT_TIMESTAMP`,
      [userId, newGrams, newInvested, newAvg]
    );

    // 4. Record gold transaction
    const invoiceRef = `GOLD-${Date.now().toString().slice(-8)}`;
    const tradeRes = await client.query(
      `INSERT INTO gold_transactions (user_id, trade_type, grams, rate_per_gram, gross_amount, gst_amount, net_amount, invoice_ref)
       VALUES ($1, 'buy', $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, gramsPurchased, rates.buyRate, netGoldValue, gstAmount, totalAmount, invoiceRef]
    );

    // 5. Main transaction record
    await client.query(
      `INSERT INTO transactions (user_id, name, amount, category, status, notes)
       VALUES ($1, $2, $3, 'Digital Gold / Wealth', 'success', $4)`,
      [
        userId,
        `24K Gold Purchase - ${gramsPurchased}g`,
        totalAmount,
        `Acquired ${gramsPurchased}g of 24K Hallmark Gold @ ₹${rates.buyRate}/g. Ref: ${invoiceRef}`,
      ]
    );

    // 6. Notification
    await client.query(
      `INSERT INTO notifications (user_id, title, message)
       VALUES ($1, '✨ 24K Gold Vault Credited', $2)`,
      [
        userId,
        `Successfully bought ${gramsPurchased}g of 24K Gold for ₹${totalAmount.toLocaleString("en-IN")}. Vault updated!`,
      ]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: `🎉 Successfully bought ${gramsPurchased}g of 24K Digital Gold!`,
      trade: tradeRes.rows[0],
      newGrams,
      newBalance: parseFloat(updatedUserRes.rows[0].balance),
      newPoints: updatedUserRes.rows[0].reward_points,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Gold buy error:", error);
    res.status(500).json({ message: "Failed to purchase gold", error: error.message });
  } finally {
    client.release();
  }
});

// @route   POST /api/gold/sell
// @desc    Liquidate digital gold back to bank wallet balance at live market sell rate
// @access  Private
router.post("/sell", protect, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const { grams } = req.body;

    const gramsToSell = parseFloat(grams);
    if (isNaN(gramsToSell) || gramsToSell <= 0) {
      return res.status(400).json({ message: "Please specify a valid weight of gold to sell." });
    }

    const rates = getLiveGoldRates();

    await client.query("BEGIN");

    // 1. Verify gold holdings
    const holdingRes = await client.query(
      "SELECT grams_held, total_invested, average_buy_price FROM gold_holdings WHERE user_id = $1 FOR UPDATE",
      [userId]
    );
    if (holdingRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "You have no gold holdings to sell." });
    }

    const currentGrams = parseFloat(holdingRes.rows[0].grams_held || 0);
    const currentInvested = parseFloat(holdingRes.rows[0].total_invested || 0);
    const avgPrice = parseFloat(holdingRes.rows[0].average_buy_price || 0);

    if (currentGrams < gramsToSell) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: `Insufficient gold balance. You hold ${currentGrams}g, but tried to sell ${gramsToSell}g.`,
      });
    }

    const sellPayout = parseFloat((gramsToSell * rates.sellRate).toFixed(2));
    const newGrams = parseFloat((currentGrams - gramsToSell).toFixed(4));
    const costBasisSold = gramsToSell * avgPrice;
    const newInvested = Math.max(0, parseFloat((currentInvested - costBasisSold).toFixed(2)));

    // 2. Update gold holdings
    await client.query(
      "UPDATE gold_holdings SET grams_held = $1, total_invested = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $3",
      [newGrams, newInvested, userId]
    );

    // 3. Credit wallet balance
    const updatedUserRes = await client.query(
      "UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance",
      [sellPayout, userId]
    );

    // 4. Gold transaction
    const invoiceRef = `SELL-${Date.now().toString().slice(-8)}`;
    const tradeRes = await client.query(
      `INSERT INTO gold_transactions (user_id, trade_type, grams, rate_per_gram, gross_amount, gst_amount, net_amount, invoice_ref)
       VALUES ($1, 'sell', $2, $3, $4, 0, $4, $5)
       RETURNING *`,
      [userId, gramsToSell, rates.sellRate, sellPayout, invoiceRef]
    );

    // 5. Main transaction
    await client.query(
      `INSERT INTO transactions (user_id, name, amount, category, status, notes)
       VALUES ($1, $2, $3, 'Digital Gold / Wealth', 'success', $4)`,
      [
        userId,
        `Gold Liquidation - ${gramsToSell}g`,
        sellPayout,
        `Sold ${gramsToSell}g of 24K Gold @ ₹${rates.sellRate}/g. Credited to bank wallet. Ref: ${invoiceRef}`,
      ]
    );

    // 6. Notification
    await client.query(
      `INSERT INTO notifications (user_id, title, message)
       VALUES ($1, '💰 Gold Sold Successfully', $2)`,
      [
        userId,
        `Sold ${gramsToSell}g of gold for ₹${sellPayout.toLocaleString("en-IN")}. Funds credited to your bank account!`,
      ]
    );

    await client.query("COMMIT");

    res.json({
      message: `Sold ${gramsToSell}g for ₹${sellPayout.toLocaleString("en-IN")}! Funds credited.`,
      trade: tradeRes.rows[0],
      newGrams,
      newBalance: parseFloat(updatedUserRes.rows[0].balance),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Gold sell error:", error);
    res.status(500).json({ message: "Failed to sell gold", error: error.message });
  } finally {
    client.release();
  }
});

// @route   POST /api/gold/sip
// @desc    Create recurring automated Gold SIP (Daily, Weekly, Monthly)
// @access  Private
router.post("/sip", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, frequency = "monthly" } = req.body;

    const sipAmount = parseFloat(amount);
    if (isNaN(sipAmount) || sipAmount < 50) {
      return res.status(400).json({ message: "Minimum Gold SIP amount is ₹50." });
    }

    const validFreqs = ["daily", "weekly", "monthly"];
    if (!validFreqs.includes(frequency)) {
      return res.status(400).json({ message: "Frequency must be daily, weekly, or monthly." });
    }

    const nextDate = new Date();
    if (frequency === "daily") nextDate.setDate(nextDate.getDate() + 1);
    else if (frequency === "weekly") nextDate.setDate(nextDate.getDate() + 7);
    else nextDate.setMonth(nextDate.getMonth() + 1);

    const sipRes = await pool.query(
      `INSERT INTO gold_sips (user_id, sip_amount, frequency, status, next_execution)
       VALUES ($1, $2, $3, 'active', $4)
       RETURNING *`,
      [userId, sipAmount, frequency, nextDate.toISOString().split("T")[0]]
    );

    await pool.query(
      `INSERT INTO notifications (user_id, title, message)
       VALUES ($1, '📈 Gold SIP Mandate Activated', $2)`,
      [
        userId,
        `Your ${frequency} Gold SIP of ₹${sipAmount} has been scheduled. First auto-invest on ${nextDate.toLocaleDateString("en-IN")}.`,
      ]
    );

    res.status(201).json({
      message: `Active Gold SIP of ₹${sipAmount} created successfully!`,
      sip: sipRes.rows[0],
    });
  } catch (error) {
    console.error("Create Gold SIP error:", error);
    res.status(500).json({ message: "Failed to create Gold SIP", error: error.message });
  }
});

// @route   POST /api/gold/deliver
// @desc    Doorstep physical 24K certified minted coin delivery redemption
// @access  Private
router.post("/deliver", protect, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const { coinWeightGrams, shippingAddress } = req.body;

    const coinWeight = parseInt(coinWeightGrams);
    const validWeights = [1, 2, 5, 10];
    if (!validWeights.includes(coinWeight)) {
      return res.status(400).json({
        message: "Available minted coins are 1g, 2g, 5g, and 10g 24K 99.9% Hallmark Pure.",
      });
    }

    if (!shippingAddress || shippingAddress.trim().length < 10) {
      return res.status(400).json({ message: "Please provide a complete shipping address." });
    }

    await client.query("BEGIN");

    const holdingRes = await client.query(
      "SELECT grams_held FROM gold_holdings WHERE user_id = $1 FOR UPDATE",
      [userId]
    );
    const currentGrams = parseFloat(holdingRes.rows[0]?.grams_held || 0);

    if (currentGrams < coinWeight) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: `Insufficient vault gold balance. You have ${currentGrams}g, but a ${coinWeight}g minted coin is required.`,
      });
    }

    // Deduct grams
    const newGrams = parseFloat((currentGrams - coinWeight).toFixed(4));
    await client.query(
      "UPDATE gold_holdings SET grams_held = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2",
      [newGrams, userId]
    );

    const trackingId = `BRINKS-EXP-${Date.now().toString().slice(-6)}`;
    const rates = getLiveGoldRates();

    // Record transaction
    await client.query(
      `INSERT INTO gold_transactions (user_id, trade_type, grams, rate_per_gram, gross_amount, net_amount, invoice_ref)
       VALUES ($1, 'delivery', $2, $3, 0, 0, $4)`,
      [userId, coinWeight, rates.buyRate, trackingId]
    );

    // Notification
    await client.query(
      `INSERT INTO notifications (user_id, title, message)
       VALUES ($1, '📦 24K Gold Coin Dispatched', $2)`,
      [
        userId,
        `Your ${coinWeight}g 24K Minted Gold Coin is being dispatched via Insured Armored Courier. Tracking: ${trackingId}`,
      ]
    );

    await client.query("COMMIT");

    res.json({
      message: `Minted ${coinWeight}g 24K Gold Coin dispatched to ${shippingAddress}! Tracking: ${trackingId}`,
      trackingId,
      newGrams,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Gold delivery error:", error);
    res.status(500).json({ message: "Failed to dispatch gold delivery", error: error.message });
  } finally {
    client.release();
  }
});

export default router;
