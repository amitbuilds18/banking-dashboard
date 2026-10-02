import express from "express";
import pool from "../db.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

const PARTNER_VOUCHERS = [
  {
    id: "vouch-amazon-100",
    title: "Amazon Shopping ₹100 Gift Card",
    merchant: "Amazon",
    category: "Shopping",
    coinsRequired: 800,
    value: "₹100 Gift Card",
    icon: "🛍️",
    color: "from-amber-500 to-orange-600",
    prefix: "AMZN-NEO",
  },
  {
    id: "vouch-swiggy-150",
    title: "Swiggy Food & Instamart ₹150 Off",
    merchant: "Swiggy",
    category: "Food Delivery",
    coinsRequired: 600,
    value: "₹150 Off Voucher",
    icon: "🍔",
    color: "from-orange-500 to-rose-600",
    prefix: "SWIGGY-150",
  },
  {
    id: "vouch-zomato-gold",
    title: "Zomato Gold 3-Month Membership",
    merchant: "Zomato",
    category: "Dining",
    coinsRequired: 1200,
    value: "3-Month Free Delivery",
    icon: "🍽️",
    color: "from-rose-500 to-red-600",
    prefix: "ZOMA-GOLD",
  },
  {
    id: "vouch-uber-100",
    title: "Uber Premier ₹100 Ride Voucher",
    merchant: "Uber",
    category: "Travel",
    coinsRequired: 750,
    value: "₹100 Ride Discount",
    icon: "🚗",
    color: "from-slate-700 to-slate-900",
    prefix: "UBER-NEO",
  },
  {
    id: "vouch-spotify-3m",
    title: "Spotify Premium 3-Month Pass",
    merchant: "Spotify",
    category: "Entertainment",
    coinsRequired: 1500,
    value: "3-Month Ad-Free Music",
    icon: "🎵",
    color: "from-emerald-500 to-teal-700",
    prefix: "SPOT-3M",
  },
  {
    id: "vouch-bookmyshow-150",
    title: "BookMyShow Movie Voucher ₹150",
    merchant: "BookMyShow",
    category: "Cinema",
    coinsRequired: 900,
    value: "₹150 Movie Ticket Discount",
    icon: "🎬",
    color: "from-red-500 to-pink-600",
    prefix: "BMS-NEO",
  },
];

// Helper: Seed initial starter scratch cards for a new user if none exist
async function ensureSeedCards(client, userId) {
  const countRes = await client.query(
    "SELECT COUNT(*) FROM scratch_cards WHERE user_id = $1",
    [userId]
  );
  if (parseInt(countRes.rows[0].count) === 0) {
    await client.query(
      `INSERT INTO scratch_cards (user_id, title, description, reward_type, reward_value, merchant_name, source_event)
       VALUES 
       ($1, '🎉 Welcome Cash Drop', 'Congratulations on joining NovaPay! Instant real money for your wallet.', 'cashback', 50, 'NovaPay Direct', 'Welcome Gift'),
       ($1, '🪙 250 NeoCoins Drop', 'Power up your loyalty balance to redeem gift cards & cash.', 'coins', 250, 'NeoLoyalty', 'Account Activation'),
       ($1, '🍔 Swiggy 50% Off Feasts', 'Flat 50% off on all gourmet delivery orders up to ₹120.', 'coupon', 120, 'Swiggy', 'First Pay Bonus')`,
      [userId]
    );

    // Give the 3rd card a coupon code
    await client.query(
      `UPDATE scratch_cards 
       SET coupon_code = 'SWIGGY-NEO50' 
       WHERE user_id = $1 AND reward_type = 'coupon'`,
      [userId]
    );
  }
}

// @route   GET /api/rewards/hub
// @desc    Get complete rewards overview, scratch cards, loyalty coins, vouchers catalog
// @access  Private
router.get("/hub", protect, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;

    // 1. Ensure user has seed cards
    await ensureSeedCards(client, userId);

    // 2. Fetch user profile with rewards & balance
    const userRes = await client.query(
      `SELECT id, name, email, balance, reward_points, reward_tier, 
              (last_checkin = CURRENT_DATE) as has_checked_in_today
       FROM users WHERE id = $1`,
      [userId]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const user = userRes.rows[0];

    // 3. Fetch all scratch cards
    const cardsRes = await client.query(
      `SELECT id, title, description, reward_type, reward_value, coupon_code,
              merchant_name, source_event, is_scratched, is_claimed,
              scratched_at, claimed_at, created_at
       FROM scratch_cards
       WHERE user_id = $1
       ORDER BY is_scratched ASC, is_claimed ASC, created_at DESC`,
      [userId]
    );

    // 4. Aggregates
    const statsRes = await client.query(
      `SELECT 
         COALESCE(SUM(reward_value) FILTER (WHERE reward_type = 'cashback' AND is_claimed = true), 0) as total_cashback,
         COUNT(*) FILTER (WHERE is_scratched = false) as unscratched_count,
         COUNT(*) FILTER (WHERE is_scratched = true AND is_claimed = false) as unclaimed_count
       FROM scratch_cards
       WHERE user_id = $1`,
      [userId]
    );

    // 5. User redemptions history
    const redemptionsRes = await client.query(
      `SELECT id, coins_spent, reward_type, cash_amount, voucher_title, voucher_code, merchant_name, created_at
       FROM coin_redemptions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId]
    );

    res.json({
      rewardPoints: user.reward_points || 450,
      rewardTier: user.reward_tier || "Gold",
      balance: parseFloat(user.balance),
      totalCashback: parseFloat(statsRes.rows[0].total_cashback || 0),
      unscratchedCount: parseInt(statsRes.rows[0].unscratched_count || 0),
      unclaimedCount: parseInt(statsRes.rows[0].unclaimed_count || 0),
      hasCheckedInToday: Boolean(user.has_checked_in_today),
      scratchCards: cardsRes.rows,
      partnerVouchers: PARTNER_VOUCHERS,
      redemptions: redemptionsRes.rows,
    });
  } catch (error) {
    console.error("Rewards hub error:", error);
    res.status(500).json({ message: "Failed to load rewards hub", error: error.message });
  } finally {
    client.release();
  }
});

// @route   POST /api/rewards/scratch/:id
// @desc    Reveal/scratch an unscratched card
// @access  Private
router.post("/scratch/:id", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const cardId = req.params.id;

    const updateRes = await pool.query(
      `UPDATE scratch_cards
       SET is_scratched = true, scratched_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [cardId, userId]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ message: "Scratch card not found." });
    }

    res.json({
      message: "Card scratched successfully!",
      card: updateRes.rows[0],
    });
  } catch (error) {
    console.error("Scratch card error:", error);
    res.status(500).json({ message: "Failed to scratch card", error: error.message });
  }
});

// @route   POST /api/rewards/claim/:id
// @desc    Claim winnings from a scratched card into wallet or points
// @access  Private
router.post("/claim/:id", protect, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const cardId = req.params.id;

    await client.query("BEGIN");

    const cardRes = await client.query(
      "SELECT * FROM scratch_cards WHERE id = $1 AND user_id = $2 FOR UPDATE",
      [cardId, userId]
    );

    if (cardRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Scratch card not found." });
    }

    const card = cardRes.rows[0];

    if (card.is_claimed) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "This reward has already been claimed." });
    }

    let updatedBalance = null;
    let updatedPoints = null;

    if (card.reward_type === "cashback") {
      const cashVal = parseFloat(card.reward_value);

      // Credit cash balance
      const userRes = await client.query(
        "UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance",
        [cashVal, userId]
      );
      updatedBalance = parseFloat(userRes.rows[0].balance);

      // Record transaction
      await client.query(
        `INSERT INTO transactions (user_id, name, amount, category, status, notes)
         VALUES ($1, $2, $3, 'Cashback & Rewards', 'success', $4)`,
        [
          userId,
          `Cashback - ${card.title}`,
          cashVal,
          `Scratch Card Reward won from ${card.source_event}`,
        ]
      );

      // Notification
      await client.query(
        `INSERT INTO notifications (user_id, title, message)
         VALUES ($1, '🎉 Cashback Claimed!', $2)`,
        [
          userId,
          `₹${cashVal} cashback has been deposited straight into your bank account!`,
        ]
      );
    } else if (card.reward_type === "coins") {
      const coinVal = parseInt(card.reward_value);

      // Credit NeoCoins
      const userRes = await client.query(
        "UPDATE users SET reward_points = reward_points + $1 WHERE id = $2 RETURNING reward_points",
        [coinVal, userId]
      );
      updatedPoints = userRes.rows[0].reward_points;

      // Notification
      await client.query(
        `INSERT INTO notifications (user_id, title, message)
         VALUES ($1, '🪙 NeoCoins Added', $2)`,
        [userId, `+${coinVal} NeoCoins added to your rewards wallet!`]
      );
    }

    // Mark card claimed
    const updatedCardRes = await client.query(
      `UPDATE scratch_cards
       SET is_scratched = true, is_claimed = true, claimed_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [cardId]
    );

    await client.query("COMMIT");

    res.json({
      message: "Reward claimed successfully!",
      card: updatedCardRes.rows[0],
      newBalance: updatedBalance,
      newPoints: updatedPoints,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Claim reward error:", error);
    res.status(500).json({ message: "Failed to claim reward", error: error.message });
  } finally {
    client.release();
  }
});

// @route   POST /api/rewards/redeem-cash
// @desc    Convert NeoCoins directly into real cash balance (10 Coins = ₹1)
// @access  Private
router.post("/redeem-cash", protect, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const { coins } = req.body;

    const coinsSpent = parseInt(coins);
    if (isNaN(coinsSpent) || coinsSpent < 100 || coinsSpent % 50 !== 0) {
      return res.status(400).json({
        message: "Coins to redeem must be at least 100 and in multiples of 50.",
      });
    }

    const cashAmount = Math.round(coinsSpent / 10); // 10 coins = ₹1

    await client.query("BEGIN");

    const userRes = await client.query(
      "SELECT reward_points, balance FROM users WHERE id = $1 FOR UPDATE",
      [userId]
    );
    const currentPoints = userRes.rows[0].reward_points || 0;

    if (currentPoints < coinsSpent) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: `Insufficient NeoCoins. You have ${currentPoints} coins, but need ${coinsSpent}.`,
      });
    }

    // Deduct coins & add cash
    const updatedUserRes = await client.query(
      `UPDATE users 
       SET reward_points = reward_points - $1, balance = balance + $2
       WHERE id = $3
       RETURNING balance, reward_points`,
      [coinsSpent, cashAmount, userId]
    );

    // Record redemption
    await client.query(
      `INSERT INTO coin_redemptions (user_id, coins_spent, reward_type, cash_amount)
       VALUES ($1, $2, 'cash_credit', $3)`,
      [userId, coinsSpent, cashAmount]
    );

    // Record transaction
    await client.query(
      `INSERT INTO transactions (user_id, name, amount, category, status, notes)
       VALUES ($1, 'NeoCoins Cashback Conversion', $2, 'Cashback & Rewards', 'success', $3)`,
      [userId, cashAmount, `Converted ${coinsSpent} NeoCoins to ₹${cashAmount} real cash`]
    );

    // Notification
    await client.query(
      `INSERT INTO notifications (user_id, title, message)
       VALUES ($1, '💰 Coins Converted to Cash', $2)`,
      [
        userId,
        `Redeemed ${coinsSpent} NeoCoins! ₹${cashAmount} credited to your bank account.`,
      ]
    );

    await client.query("COMMIT");

    res.json({
      message: `Redeemed ${coinsSpent} NeoCoins for ₹${cashAmount} cash!`,
      newBalance: parseFloat(updatedUserRes.rows[0].balance),
      newPoints: updatedUserRes.rows[0].reward_points,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Redeem cash error:", error);
    res.status(500).json({ message: "Failed to redeem coins for cash", error: error.message });
  } finally {
    client.release();
  }
});

// @route   POST /api/rewards/redeem-voucher
// @desc    Redeem partner brand voucher with NeoCoins
// @access  Private
router.post("/redeem-voucher", protect, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const { voucherId } = req.body;

    const voucher = PARTNER_VOUCHERS.find((v) => v.id === voucherId);
    if (!voucher) {
      return res.status(404).json({ message: "Invalid voucher selected." });
    }

    await client.query("BEGIN");

    const userRes = await client.query(
      "SELECT reward_points FROM users WHERE id = $1 FOR UPDATE",
      [userId]
    );
    const currentPoints = userRes.rows[0].reward_points || 0;

    if (currentPoints < voucher.coinsRequired) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: `Insufficient NeoCoins. You have ${currentPoints} coins, but need ${voucher.coinsRequired}.`,
      });
    }

    // Deduct coins
    const updatedUserRes = await client.query(
      "UPDATE users SET reward_points = reward_points - $1 WHERE id = $2 RETURNING reward_points",
      [voucher.coinsRequired, userId]
    );

    // Generate unique voucher code
    const uniqueCode = `${voucher.prefix}-${Math.floor(100000 + Math.random() * 900000)}`;

    // Record redemption
    const redemptionRes = await client.query(
      `INSERT INTO coin_redemptions (user_id, coins_spent, reward_type, voucher_title, voucher_code, merchant_name)
       VALUES ($1, $2, 'voucher', $3, $4, $5)
       RETURNING *`,
      [userId, voucher.coinsRequired, voucher.title, uniqueCode, voucher.merchant]
    );

    // Notification
    await client.query(
      `INSERT INTO notifications (user_id, title, message)
       VALUES ($1, '🎁 Voucher Unlocked!', $2)`,
      [
        userId,
        `Your ${voucher.merchant} code is ${uniqueCode}. Use it at checkout to get your discount!`,
      ]
    );

    await client.query("COMMIT");

    res.json({
      message: `${voucher.merchant} voucher unlocked successfully!`,
      code: uniqueCode,
      voucher: redemptionRes.rows[0],
      newPoints: updatedUserRes.rows[0].reward_points,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Redeem voucher error:", error);
    res.status(500).json({ message: "Failed to redeem voucher", error: error.message });
  } finally {
    client.release();
  }
});

// @route   POST /api/rewards/daily-checkin
// @desc    Daily login streak reward: +25 NeoCoins
// @access  Private
router.post("/daily-checkin", protect, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;

    await client.query("BEGIN");

    const userRes = await client.query(
      "SELECT (last_checkin = CURRENT_DATE) as has_checked_in, reward_points FROM users WHERE id = $1 FOR UPDATE",
      [userId]
    );

    if (userRes.rows[0].has_checked_in) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "You have already collected today's daily streak! Come back tomorrow for more coins.",
      });
    }

    const bonusCoins = 25;

    // Update user
    const updatedUserRes = await client.query(
      `UPDATE users 
       SET reward_points = reward_points + $1, last_checkin = CURRENT_DATE
       WHERE id = $2
       RETURNING reward_points`,
      [bonusCoins, userId]
    );

    // Random chance (25%) to also award a surprise lucky scratch card!
    let bonusCard = null;
    if (Math.random() < 0.25) {
      const cardRes = await client.query(
        `INSERT INTO scratch_cards (user_id, title, description, reward_type, reward_value, merchant_name, source_event)
         VALUES ($1, '✨ Daily Mystery Streak Drop', 'Surprise bonus for checking in every single day!', 'cashback', 25, 'Streak Surprise', 'Daily Check-in')
         RETURNING *`,
        [userId]
      );
      bonusCard = cardRes.rows[0];
    }

    await client.query("COMMIT");

    res.json({
      message: `🎉 Daily Streak Collected! +${bonusCoins} NeoCoins added!`,
      newPoints: updatedUserRes.rows[0].reward_points,
      bonusCard,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Daily check-in error:", error);
    res.status(500).json({ message: "Failed to collect daily streak", error: error.message });
  } finally {
    client.release();
  }
});

export default router;
