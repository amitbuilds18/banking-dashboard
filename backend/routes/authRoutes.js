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

// ===========================================
// MPIN STATUS & MANAGEMENT
// ===========================================

router.get("/mpin-status", protect, async (req, res) => {
  try {
    const result = await pool.query("SELECT mpin FROM users WHERE id = $1", [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const hasCustomMpin = Boolean(result.rows[0].mpin);
    res.json({
      hasMpin: hasCustomMpin,
      defaultPinHint: "1234",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/set-mpin", protect, async (req, res) => {
  try {
    const { currentMpin, newMpin } = req.body;

    if (!newMpin || !/^\d{4}$/.test(String(newMpin).trim())) {
      return res.status(400).json({ error: "New MPIN must be exactly 4 numeric digits (e.g. 1234)" });
    }

    const userRes = await pool.query("SELECT id, mpin FROM users WHERE id = $1", [req.user.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userRes.rows[0];

    // If an existing MPIN is set, verify currentMpin
    if (user.mpin) {
      if (!currentMpin) {
        return res.status(400).json({ error: "Current 4-digit MPIN is required" });
      }
      const isMatch = await bcrypt.compare(String(currentMpin).trim(), user.mpin);
      if (!isMatch) {
        return res.status(401).json({ error: "Current MPIN is incorrect" });
      }
    } else {
      // If no MPIN was set yet, require default 1234 if currentMpin is passed
      if (currentMpin && String(currentMpin).trim() !== "1234") {
        return res.status(401).json({ error: "Current MPIN does not match default (1234)" });
      }
    }

    const hashedMpin = await bcrypt.hash(String(newMpin).trim(), 10);
    await pool.query("UPDATE users SET mpin = $1 WHERE id = $2", [hashedMpin, req.user.id]);

    res.json({ message: "4-Digit Security MPIN updated successfully! 🔐" });
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

// DEMO LOGIN (One-Click Tour for visitors & recruiters)
router.post("/demo", async (req, res) => {
  try {
    const demoEmail = "demo@novapay.bank";

    let userRes = await pool.query("SELECT * FROM users WHERE email = $1", [demoEmail]);
    let demoUser = userRes.rows[0];

    // If demo user does not exist yet, provision one with rich starter data
    if (!demoUser) {
      const hashed = await bcrypt.hash("Demo@NovaPay123", 10);
      const insertUser = await pool.query(
        "INSERT INTO users (name, email, password, balance, phone) VALUES ($1,$2,$3,$4,$5) RETURNING *",
        ["Demo Commander", demoEmail, hashed, 78500, "+91 98765 43210"]
      );
      demoUser = insertUser.rows[0];

      // Add starter transactions for rich visual charts and insights
      await pool.query(
        `INSERT INTO transactions (name, amount, status, user_id, receiver_email) VALUES
         ('Salary Inflow', 50000, 'success', $1, NULL),
         ('Dining & Gourmet', -3400, 'success', $1, NULL),
         ('Tech & Subscriptions', -1499, 'success', $1, NULL),
         ('Supermarket Grocery', -4800, 'success', $1, NULL),
         ('Transfer Sent', -5000, 'success', $1, 'alex@sample.com'),
         ('Spare Change (Emergency Fund)', -50, 'success', $1, NULL)`,
        [demoUser.id]
      );

      // Add starter savings vault
      await pool.query(
        `INSERT INTO vaults (user_id, name, target_amount, current_amount, icon, color, is_roundup_target)
         VALUES ($1, 'Emergency Fund', 100000, 35000, '🛡️', 'from-blue-500 to-indigo-600', true)
         ON CONFLICT DO NOTHING`,
        [demoUser.id]
      );
    }

    // Ensure demo user has default 4-digit MPIN (1234)
    if (!demoUser.mpin) {
      const hashedMpin = await bcrypt.hash("1234", 10);
      await pool.query("UPDATE users SET mpin = $1 WHERE id = $2", [hashedMpin, demoUser.id]);
    }

    const token = jwt.sign(
      { id: demoUser.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || "7d" }
    );

    res.json({
      token,
      user: {
        id: demoUser.id,
        name: demoUser.name,
        email: demoUser.email,
      },
    });
  } catch (err) {
    console.error("Demo login error:", err);
    res.status(500).json({ error: err.message || "Failed to create demo session" });
  }
});

export default router;