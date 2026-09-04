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

// GET /api/card
router.get("/", protect, async (req, res) => {
  try {
    const existing = await pool.query(
      "SELECT * FROM user_cards WHERE user_id = $1",
      [req.user.id]
    );

    if (existing.rows.length > 0) {
      return res.json(existing.rows[0]);
    }

    // Auto-create a card for the user
    const userRes = await pool.query("SELECT name FROM users WHERE id = $1", [req.user.id]);
    const holderName = (userRes.rows[0]?.name || "VALUED MEMBER").toUpperCase();
    const cardNumber = generateCardNumber();
    const cvv = generateCVV();
    const expiry = "09/29";

    const newCard = await pool.query(
      `INSERT INTO user_cards 
       (user_id, card_number, holder_name, expiry, cvv, card_tier, is_frozen, online_enabled, daily_limit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [req.user.id, cardNumber, holderName, expiry, cvv, "Titanium Neo", false, true, 25000]
    );

    res.json(newCard.rows[0]);
  } catch (err) {
    console.error("Card Fetch Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/card/toggle-freeze
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

    res.json({
      message: updated.rows[0].is_frozen ? "Card frozen" : "Card unfrozen",
      card: updated.rows[0],
    });
  } catch (err) {
    console.error("Card Freeze Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/card/limit
router.put("/limit", protect, async (req, res) => {
  try {
    const { daily_limit } = req.body;
    const limit = Number(daily_limit);

    if (!Number.isFinite(limit) || limit < 1000 || limit > 500000) {
      return res.status(400).json({ error: "Limit must be between ₹1,000 and ₹500,000" });
    }

    const updated = await pool.query(
      `UPDATE user_cards
       SET daily_limit = $1
       WHERE user_id = $2
       RETURNING *`,
      [limit, req.user.id]
    );

    res.json({
      message: "Daily limit updated",
      card: updated.rows[0],
    });
  } catch (err) {
    console.error("Card Limit Error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
