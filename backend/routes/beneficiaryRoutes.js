import express from "express";
import pool from "../db.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * GET /api/beneficiaries
 * Fetches all saved beneficiaries for the authenticated user
 */
router.get("/", protect, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        b.id,
        b.name,
        b.email,
        b.nickname,
        b.phone,
        b.account_type,
        b.avatar_color,
        b.created_at,
        b.beneficiary_user_id,
        CASE WHEN u.id IS NOT NULL THEN true ELSE false END AS is_registered
      FROM beneficiaries b
      LEFT JOIN users u ON LOWER(u.email) = LOWER(b.email)
      WHERE b.user_id = $1
      ORDER BY b.created_at DESC
      `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching beneficiaries:", err);
    res.status(500).json({ error: "Failed to fetch beneficiaries" });
  }
});

/**
 * POST /api/beneficiaries
 * Adds or updates a beneficiary contact
 */
router.post("/", protect, async (req, res) => {
  try {
    const { name, email, nickname, phone, account_type, avatar_color } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // Prevent adding self
    const currentUserRes = await pool.query(
      "SELECT email FROM users WHERE id = $1",
      [req.user.id]
    );
    if (currentUserRes.rows[0]?.email?.toLowerCase() === normalizedEmail) {
      return res.status(400).json({ error: "You cannot add yourself as a beneficiary" });
    }

    // Check if the beneficiary has an existing NovaPay account
    const registeredUserRes = await pool.query(
      "SELECT id, name FROM users WHERE LOWER(email) = $1",
      [normalizedEmail]
    );
    const linkedUserId = registeredUserRes.rows[0]?.id || null;

    const colors = [
      "from-blue-500 to-cyan-500",
      "from-emerald-500 to-teal-500",
      "from-purple-500 to-indigo-500",
      "from-rose-500 to-pink-500",
      "from-amber-500 to-orange-500",
      "from-cyan-500 to-blue-600",
    ];
    const chosenColor =
      avatar_color || colors[Math.floor(Math.random() * colors.length)];

    const result = await pool.query(
      `
      INSERT INTO beneficiaries (
        user_id,
        beneficiary_user_id,
        name,
        email,
        nickname,
        phone,
        account_type,
        avatar_color
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id, email) 
      DO UPDATE SET
        name = EXCLUDED.name,
        nickname = COALESCE(EXCLUDED.nickname, beneficiaries.nickname),
        phone = COALESCE(EXCLUDED.phone, beneficiaries.phone),
        avatar_color = COALESCE(EXCLUDED.avatar_color, beneficiaries.avatar_color),
        beneficiary_user_id = EXCLUDED.beneficiary_user_id
      RETURNING *
      `,
      [
        req.user.id,
        linkedUserId,
        cleanName,
        normalizedEmail,
        nickname ? nickname.trim() : null,
        phone ? phone.trim() : "",
        account_type || "individual",
        chosenColor,
      ]
    );

    res.status(201).json({
      message: "Beneficiary saved successfully",
      beneficiary: {
        ...result.rows[0],
        is_registered: !!linkedUserId,
      },
    });
  } catch (err) {
    console.error("Error creating beneficiary:", err);
    res.status(500).json({ error: "Failed to save beneficiary" });
  }
});

/**
 * DELETE /api/beneficiaries/:id
 * Removes a beneficiary contact
 */
router.delete("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM beneficiaries WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Beneficiary not found" });
    }

    res.json({ message: "Beneficiary removed successfully" });
  } catch (err) {
    console.error("Error deleting beneficiary:", err);
    res.status(500).json({ error: "Failed to remove beneficiary" });
  }
});

export default router;
