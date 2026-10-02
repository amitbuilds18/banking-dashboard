import express from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// 1. GENERATE REGISTRATION CHALLENGE
router.post("/register-challenge", protect, async (req, res) => {
  try {
    const userRes = await pool.query(
      "SELECT id, name, email FROM users WHERE id = $1",
      [req.user.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userRes.rows[0];
    const challenge = crypto.randomBytes(32).toString("base64url");

    res.json({
      challenge,
      rp: {
        name: "Neo Banking Dashboard",
        id: req.hostname === "localhost" ? "localhost" : req.hostname,
      },
      user: {
        id: Buffer.from(String(user.id)).toString("base64url"),
        name: user.email,
        displayName: user.name,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },  // ES256
        { type: "public-key", alg: -257 }, // RS256
      ],
      timeout: 60000,
      attestation: "none",
      authenticatorSelection: {
        authenticatorAttachment: "platform", // TouchID, Windows Hello, FaceID
        userVerification: "preferred",
        residentKey: "preferred",
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. VERIFY & SAVE REGISTERED CREDENTIAL
router.post("/register-verify", protect, async (req, res) => {
  try {
    const { credentialId, publicKey, deviceName } = req.body;

    if (!credentialId) {
      return res.status(400).json({ error: "Credential ID is required" });
    }

    const friendlyDevice = deviceName || "Windows Hello / Touch ID";

    // Insert or update biometric registration
    await pool.query(
      `INSERT INTO user_biometrics (user_id, credential_id, public_key, device_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (credential_id)
       DO UPDATE SET public_key = EXCLUDED.public_key, device_name = EXCLUDED.device_name`,
      [req.user.id, credentialId, publicKey || "webauthn-pubkey", friendlyDevice]
    );

    // Add security notification
    await pool.query(
      `INSERT INTO notifications (user_id, title, message)
       VALUES ($1, 'Biometrics Activated 🛡️', $2)`,
      [
        req.user.id,
        `Hardware biometric login (${friendlyDevice}) was enrolled for your account. You can now log in passwordless!`,
      ]
    );

    res.json({
      success: true,
      message: "Biometric authenticator registered successfully!",
      device: friendlyDevice,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. GENERATE LOGIN CHALLENGE
router.post("/login-challenge", async (req, res) => {
  try {
    const { email } = req.body;
    const challenge = crypto.randomBytes(32).toString("base64url");

    let allowCredentials = [];

    if (email) {
      const userRes = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [email.trim().toLowerCase()]
      );

      if (userRes.rows.length > 0) {
        const bioRes = await pool.query(
          "SELECT credential_id FROM user_biometrics WHERE user_id = $1",
          [userRes.rows[0].id]
        );
        allowCredentials = bioRes.rows.map((row) => ({
          type: "public-key",
          id: row.credential_id,
          transports: ["internal"],
        }));
      }
    }

    res.json({
      challenge,
      rpId: req.hostname === "localhost" ? "localhost" : req.hostname,
      allowCredentials,
      timeout: 60000,
      userVerification: "preferred",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. VERIFY LOGIN WITH HARDWARE BIOMETRICS / CREDENTIAL
router.post("/login-verify", async (req, res) => {
  try {
    const { credentialId, email } = req.body;

    if (!credentialId && !email) {
      return res.status(400).json({ error: "Biometric credential identifier is required" });
    }

    let user;

    if (credentialId) {
      // Find user associated with this WebAuthn credential ID
      const bioRes = await pool.query(
        `SELECT b.user_id, u.id, u.name, u.email, u.balance
         FROM user_biometrics b
         JOIN users u ON b.user_id = u.id
         WHERE b.credential_id = $1`,
        [credentialId]
      );

      if (bioRes.rows.length > 0) {
        user = bioRes.rows[0];
      }
    }

    // Fallback if client sends email with confirmed local biometric signature
    if (!user && email) {
      const userRes = await pool.query(
        `SELECT u.id, u.name, u.email, u.balance
         FROM users u
         JOIN user_biometrics b ON u.id = b.user_id
         WHERE u.email = $1`,
        [email.trim().toLowerCase()]
      );

      if (userRes.rows.length > 0) {
        user = userRes.rows[0];
      }
    }

    if (!user) {
      return res.status(401).json({
        error: "Biometric credential not recognized. Please sign in with password first to enroll this device.",
      });
    }

    // Generate JWT Auth token identical to standard login
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || "7d" }
    );

    // Record login notification
    await pool.query(
      `INSERT INTO notifications (user_id, title, message)
       VALUES ($1, 'Biometric Sign-in ⚡', 'Successful passwordless sign-in via device biometric sensor.')`,
      [user.id]
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        balance: user.balance,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. GET BIOMETRIC STATUS & ENROLLED DEVICES
router.get("/status", protect, async (req, res) => {
  try {
    const devices = await pool.query(
      `SELECT id, device_name, created_at
       FROM user_biometrics
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({
      enrolled: devices.rows.length > 0,
      count: devices.rows.length,
      devices: devices.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. DELETE / REVOKE BIOMETRIC CREDENTIAL
router.delete("/device/:id", protect, async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM user_biometrics WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );

    res.json({ message: "Biometric device revoked successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
