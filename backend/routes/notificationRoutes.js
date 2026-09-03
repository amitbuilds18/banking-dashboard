import express from "express";
import pool from "../db.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// =====================================
// GET ALL NOTIFICATIONS
// =====================================

router.get("/", protect, async (req, res) => {
  try {
    console.log("========== NOTIFICATION API ==========");
    console.log("Logged User:", req.user);

    const notifications = await pool.query(
      `
      SELECT *
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [req.user.id]
    );

    console.log("User ID:", req.user.id);
    console.log("Notifications Found:", notifications.rows.length);
    console.log(notifications.rows);

    res.json(notifications.rows);

  } catch (err) {
    console.error("Notification Error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
});

// =====================================
// MARK AS READ
// =====================================

router.put("/:id/read", protect, async (req, res) => {
  try {

    await pool.query(
      `
      UPDATE notifications
      SET is_read = TRUE
      WHERE id = $1
      AND user_id = $2
      `,
      [req.params.id, req.user.id]
    );

    res.json({
      message: "Notification marked as read",
    });

  } catch (err) {

    console.error("Mark Read Error:", err);

    res.status(500).json({
      error: err.message,
    });

  }
});

export default router;