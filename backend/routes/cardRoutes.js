import express from "express";
import pool from "../db.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

function generateCardNumber() {
  const segment1 = "4716";
  const segment2 = Math.floor(1000 + Math.random() * 9000).toString();
  const segment3 = Math.floor(1000 + Math.random() * 9000).toString();
  const segment4 = Math.floor(1000 + Math.random() * 9000).toString();
  return `${segment1} ${segment2} ${segment3} ${segment4}`;
}

function generateCVV() {
  return Math.floor(100 + Math.random() * 900).toString();
}

// ===========================================
// 1. GET / AUTO-CREATE USER CARD
// ===========================================
router.get("/", protect, async (req, res) => {
  try {
    const existing = await pool.query(
      "SELECT * FROM user_cards WHERE user_id = $1",
      [req.user.id]
    );

    if (existing.rows.length > 0) {
      const card = existing.rows[0];
      return res.json({
        ...card,
        card,
        success: true,
      });
    }

    // Auto-create a card for the user
    const userRes = await pool.query("SELECT name FROM users WHERE id = $1", [req.user.id]);
    const holderName = (userRes.rows[0]?.name || "VALUED MEMBER").toUpperCase();
    const cardNumber = generateCardNumber();
    const cvv = generateCVV();
    const expiry = "10/30";

    const newCard = await pool.query(
      `INSERT INTO user_cards 
       (user_id, card_number, holder_name, expiry, cvv, card_tier, is_frozen, online_enabled, atm_enabled, contactless_enabled, international_enabled, daily_limit, atm_limit, card_pin)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        req.user.id,
        cardNumber,
        holderName,
        expiry,
        cvv,
        "Titanium Neo Black",
        false,
        true,
        true,
        true,
        false,
        50000,
        15000,
        "1234",
      ]
    );

    const card = newCard.rows[0];
    res.json({
      ...card,
      card,
      success: true,
    });
  } catch (err) {
    console.error("Card Fetch Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ===========================================
// 2. TOGGLE FREEZE / UNFREEZE
// ===========================================
router.put("/toggle-freeze", protect, async (req, res) => {
  try {
    const updated = await pool.query(
      `UPDATE user_cards
       SET is_frozen = NOT is_frozen
       WHERE user_id = $1
       RETURNING *`,
      [req.user.id]
    );

    if (updated.rows.length === 0) {
      return res.status(404).json({ error: "Card not found" });
    }

    const isFrozen = updated.rows[0].is_frozen;

    // In-app alert
    await pool.query(
      `INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)`,
      [
        req.user.id,
        isFrozen ? "❄️ Card Frozen" : "✅ Card Unfrozen",
        isFrozen
          ? "Your Titanium Debit Card has been locked. All swipe and online authorizations are temporarily paused."
          : "Your Titanium Debit Card is now active and ready for domestic and online purchases.",
      ]
    );

    res.json({
      success: true,
      message: isFrozen ? "Card frozen successfully" : "Card unfrozen and active",
      card: updated.rows[0],
    });
  } catch (err) {
    console.error("Card Freeze Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ===========================================
// 3. TOGGLE PAYMENT CHANNELS (Online, ATM, Contactless, International)
// ===========================================
router.put("/toggle-channel", protect, async (req, res) => {
  try {
    const { channel } = req.body;
    const allowed = ["online_enabled", "atm_enabled", "contactless_enabled", "international_enabled"];

    if (!allowed.includes(channel)) {
      return res.status(400).json({ error: "Invalid payment channel specified" });
    }

    const updated = await pool.query(
      `UPDATE user_cards
       SET ${channel} = NOT ${channel}
       WHERE user_id = $1
       RETURNING *`,
      [req.user.id]
    );

    if (updated.rows.length === 0) {
      return res.status(404).json({ error: "Card not found" });
    }

    const state = updated.rows[0][channel];
    const channelLabels = {
      online_enabled: "Online E-Commerce Payments",
      atm_enabled: "ATM Cash Withdrawals",
      contactless_enabled: "Tap & Pay (NFC Contactless)",
      international_enabled: "International Cross-Border Usage",
    };

    res.json({
      success: true,
      message: `${channelLabels[channel]} ${state ? "Enabled" : "Disabled"}`,
      card: updated.rows[0],
    });
  } catch (err) {
    console.error("Toggle Channel Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ===========================================
// 4. UPDATE SPENDING & ATM LIMITS
// ===========================================
router.put("/limit", protect, async (req, res) => {
  try {
    const { daily_limit, atm_limit } = req.body;

    const updates = [];
    const values = [];
    let idx = 1;

    if (daily_limit !== undefined) {
      const limit = Number(daily_limit);
      if (!Number.isFinite(limit) || limit < 1000 || limit > 500000) {
        return res.status(400).json({ error: "Daily limit must be between ₹1,000 and ₹500,000" });
      }
      updates.push(`daily_limit = $${idx++}`);
      values.push(limit);
    }

    if (atm_limit !== undefined) {
      const atmLimit = Number(atm_limit);
      if (!Number.isFinite(atmLimit) || atmLimit < 500 || atmLimit > 100000) {
        return res.status(400).json({ error: "ATM limit must be between ₹500 and ₹100,000" });
      }
      updates.push(`atm_limit = $${idx++}`);
      values.push(atmLimit);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No limits provided to update" });
    }

    values.push(req.user.id);
    const updated = await pool.query(
      `UPDATE user_cards SET ${updates.join(", ")} WHERE user_id = $${idx} RETURNING *`,
      values
    );

    res.json({
      success: true,
      message: "Card spending limits updated successfully",
      card: updated.rows[0],
    });
  } catch (err) {
    console.error("Card Limit Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ===========================================
// 5. CHANGE 4-DIGIT CARD PIN
// ===========================================
router.put("/change-pin", protect, async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin || !/^\d{4}$/.test(String(pin))) {
      return res.status(400).json({ error: "Card PIN must be exactly 4 numeric digits." });
    }

    const updated = await pool.query(
      `UPDATE user_cards SET card_pin = $1 WHERE user_id = $2 RETURNING *`,
      [pin, req.user.id]
    );

    if (updated.rows.length === 0) {
      return res.status(404).json({ error: "Card not found" });
    }

    // In-app alert
    await pool.query(
      `INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)`,
      [
        req.user.id,
        "🔒 Card PIN Changed",
        "Your 4-digit ATM and POS transaction PIN was successfully updated.",
      ]
    );

    res.json({
      success: true,
      message: "4-Digit Card PIN changed successfully!",
      card: updated.rows[0],
    });
  } catch (err) {
    console.error("Change PIN Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ===========================================
// 6. REGENERATE DYNAMIC CVV (Anti-Fraud)
// ===========================================
router.post("/regenerate-cvv", protect, async (req, res) => {
  try {
    const newCVV = generateCVV();
    const updated = await pool.query(
      `UPDATE user_cards SET cvv = $1 WHERE user_id = $2 RETURNING *`,
      [newCVV, req.user.id]
    );

    res.json({
      success: true,
      message: "Dynamic CVV refreshed for enhanced security!",
      card: updated.rows[0],
    });
  } catch (err) {
    console.error("Regenerate CVV Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ===========================================
// 7. BLOCK & RE-ISSUE NEW CARD
// ===========================================
router.post("/reissue", protect, async (req, res) => {
  try {
    const userRes = await pool.query("SELECT name FROM users WHERE id = $1", [req.user.id]);
    const holderName = (userRes.rows[0]?.name || "VALUED MEMBER").toUpperCase();
    const cardNumber = generateCardNumber();
    const cvv = generateCVV();
    const expiry = "10/30";

    const updated = await pool.query(
      `UPDATE user_cards
       SET card_number = $1, cvv = $2, expiry = $3, is_frozen = false, holder_name = $4
       WHERE user_id = $5
       RETURNING *`,
      [cardNumber, cvv, expiry, holderName, req.user.id]
    );

    // In-app notification
    await pool.query(
      `INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)`,
      [
        req.user.id,
        "💳 New Card Issued",
        `Your previous card was cancelled and a new Titanium Neo Black card (${cardNumber.slice(-4)}) has been generated.`,
      ]
    );

    res.json({
      success: true,
      message: "Old card blocked and fresh Titanium card generated!",
      card: updated.rows[0],
    });
  } catch (err) {
    console.error("Reissue Card Error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
