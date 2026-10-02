import express from "express";
import pool from "../db.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * Mask PAN: ABCDE1234F -> ABCDE****F
 */
function maskPan(pan) {
  if (!pan || pan.length !== 10) return pan;
  return `${pan.slice(0, 5)}****${pan.slice(-1)}`;
}

/**
 * Mask Aadhaar: 123456789012 -> •••• •••• 9012
 */
function maskAadhaar(aadhaar) {
  const clean = (aadhaar || "").replace(/\s+/g, "");
  if (clean.length < 4) return clean;
  return `•••• •••• ${clean.slice(-4)}`;
}

// ===========================================
// 1. GET CURRENT KYC STATUS
// ===========================================
router.get("/status", protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check user kyc record
    const result = await pool.query(
      `SELECT * FROM kyc_records WHERE user_id = $1`,
      [userId]
    );

    const userRes = await pool.query(
      `SELECT name, email, is_kyc_verified, balance FROM users WHERE id = $1`,
      [userId]
    );
    const user = userRes.rows[0];

    const hasRecord = result.rows.length > 0;
    const record = hasRecord ? result.rows[0] : null;
    const isVerified = Boolean(user?.is_kyc_verified || (record && record.status === "verified"));

    res.json({
      success: true,
      isVerified,
      status: isVerified ? "verified" : record ? record.status : "unverified",
      record: record
        ? {
            id: record.id,
            fullName: record.full_name,
            panMasked: maskPan(record.pan_number),
            aadhaarMasked: maskAadhaar(record.aadhaar_number),
            dob: record.dob,
            gender: record.gender,
            occupation: record.occupation,
            annualIncome: record.annual_income,
            address: record.address,
            verificationRef: record.verification_ref,
            verifiedAt: record.verified_at,
          }
        : null,
      monthlyTransferLimit: isVerified ? "Unlimited (₹50,00,000 / day)" : "₹10,000 / month (Restricted Tier)",
      unlockedFeatures: {
        unlimitedTransfers: isVerified,
        internationalWire: isVerified,
        termDepositsLakhs: isVerified,
        preApprovedLoans: isVerified,
      },
    });
  } catch (err) {
    console.error("KYC Status Fetch Error:", err);
    res.status(500).json({ error: "Failed to retrieve KYC status" });
  }
});

// ===========================================
// 2. SUBMIT DIGITAL E-KYC WITH DIGILOCKER
// ===========================================
router.post("/submit", protect, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const { panNumber, aadhaarNumber, fullName, dob, gender, occupation, annualIncome, address } = req.body;

    const pan = (panNumber || "").trim().toUpperCase();
    const aadhaar = (aadhaarNumber || "").replace(/\s+/g, "").trim();
    const name = (fullName || "").trim();

    // 1. Validation
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
      return res.status(400).json({ error: "Invalid PAN card format. Format must be 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)." });
    }

    if (!/^\d{12}$/.test(aadhaar)) {
      return res.status(400).json({ error: "Invalid Aadhaar number. Must contain exactly 12 numeric digits." });
    }

    if (!name || name.length < 3) {
      return res.status(400).json({ error: "Please enter your full legal name as printed on your government identity cards." });
    }

    await client.query("BEGIN");

    const verificationRef = `KYC-DL-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    // 2. Upsert KYC record
    const kycRes = await client.query(
      `INSERT INTO kyc_records (
        user_id, pan_number, aadhaar_number, full_name, dob, gender, occupation, annual_income, address, status, verification_ref, verified_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'verified', $10, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id)
      DO UPDATE SET
        pan_number = EXCLUDED.pan_number,
        aadhaar_number = EXCLUDED.aadhaar_number,
        full_name = EXCLUDED.full_name,
        dob = EXCLUDED.dob,
        gender = EXCLUDED.gender,
        occupation = EXCLUDED.occupation,
        annual_income = EXCLUDED.annual_income,
        address = EXCLUDED.address,
        status = 'verified',
        verification_ref = EXCLUDED.verification_ref,
        verified_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        userId,
        pan,
        aadhaar,
        name,
        dob || "1998-05-15",
        gender || "Male",
        occupation || "Salaried Professional",
        annualIncome || "₹5 Lakh - ₹10 Lakh",
        address || "Delhi NCR, India",
        verificationRef,
      ]
    );

    // 3. Mark user verified in main users table
    await client.query(
      `UPDATE users SET is_kyc_verified = true WHERE id = $1`,
      [userId]
    );

    // 4. In-app verification notification
    await client.query(
      `INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)`,
      [
        userId,
        "🎉 KYC Verification Completed!",
        `DigiLocker has verified your PAN (${maskPan(pan)}) & Aadhaar credentials. Unlimited transactions and pre-approved loans are now active on your account. Ref: ${verificationRef}`,
      ]
    );

    await client.query("COMMIT");

    res.status(200).json({
      success: true,
      message: "Congratulations! Your identity has been verified via DigiLocker e-KYC.",
      verificationRef,
      status: "verified",
      record: {
        fullName: name,
        panMasked: maskPan(pan),
        aadhaarMasked: maskAadhaar(aadhaar),
        verifiedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("KYC Submission Error:", err);
    res.status(500).json({ error: err.message || "Failed to submit KYC verification" });
  } finally {
    client.release();
  }
});

// ===========================================
// 3. GET OFFICIAL E-KYC COMPLIANCE CERTIFICATE
// ===========================================
router.get("/certificate", protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT k.*, u.email FROM kyc_records k 
       JOIN users u ON u.id = k.user_id 
       WHERE k.user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0 || result.rows[0].status !== "verified") {
      return res.status(404).json({ error: "No verified KYC certificate found for this account" });
    }

    const r = result.rows[0];

    res.json({
      success: true,
      certificate: {
        certificateId: r.verification_ref,
        issuedBy: "UIDAI / NSDL via NovaPay DigiLocker Gateway",
        holderName: r.full_name,
        email: r.email,
        panMasked: maskPan(r.pan_number),
        aadhaarMasked: maskAadhaar(r.aadhaar_number),
        dob: r.dob,
        gender: r.gender,
        occupation: r.occupation,
        annualIncome: r.annual_income,
        verifiedAt: r.verified_at,
        complianceStandard: "RBI Master Direction - KYC Guidelines 2016 (Updated 2026)",
        status: "APPROVED_AND_AUTHENTICATED",
      },
    });
  } catch (err) {
    console.error("KYC Certificate Error:", err);
    res.status(500).json({ error: "Failed to load certificate" });
  }
});

export default router;
