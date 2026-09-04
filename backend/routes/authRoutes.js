import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import protect from "../middleware/authMiddleware.js";


const router = express.Router();

router.get("/search", protect, async (req, res) => {
  try {
    const { q } = req.query;

    const result = await pool.query(
      "SELECT id, name, email FROM users WHERE email ILIKE $1 LIMIT 5",
      [`%${q}%`]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/profile", protect, async (req, res) => {
  try {

    const result = await pool.query(
      `
      SELECT id, name, email, balance, phone
      FROM users
      WHERE id = $1
      `,
      [req.user.id]
    );

    res.json(result.rows[0]);

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }
});

// UPDATE PROFILE
router.put("/profile", protect, async (req, res) => {
  try {
    const { name, phone } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Name cannot be empty" });
    }

    const updated = await pool.query(
      `UPDATE users
       SET name = $1, phone = COALESCE($2, phone)
       WHERE id = $3
       RETURNING id, name, email, balance, phone`,
      [name.trim(), phone || null, req.user.id]
    );

    res.json({
      message: "Profile updated successfully",
      user: updated.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const name = req.body.name?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password are required" });
    }

    if (!email.includes("@") || password.length < 8) {
      return res.status(400).json({
        error: "Enter a valid email and use a password of at least 8 characters"
      });
    }

    // check existing
    const exists = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: "User already exists" });
    }

    // hash password
    const hashed = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (name, email, password, balance) VALUES ($1,$2,$3,$4) RETURNING id, email",
      [name, email, hashed, 50000]
    );

    res.json({ message: "User created", user: result.rows[0] });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email" });
    }

    const valid = await bcrypt.compare(
      password,
      user.rows[0].password
    );

    if (!valid) {
      return res.status(401).json({ error: "Wrong password" });
    }

    const token = jwt.sign(
      { id: user.rows[0].id },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRE || "7d"
      }
    );

    res.json({
      token,
      user: {
        id: user.rows[0].id,
        email: user.rows[0].email
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;