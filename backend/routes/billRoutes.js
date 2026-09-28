import express from "express";
import bcrypt from "bcrypt";
import pool from "../db.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// Predefined Utility Categories & Billers
const BILL_CATALOG = [
  {
    id: "electricity",
    title: "Electricity Bill",
    icon: "⚡",
    color: "from-amber-500 to-yellow-600",
    badge: "Home Utility",
    providers: [
      { name: "Tata Power", sampleAccount: "TP-84729103", dueAmount: 1450 },
      { name: "Adani Electricity", sampleAccount: "AD-99238471", dueAmount: 2380 },
      { name: "BSES Rajdhani", sampleAccount: "BSES-1029384", dueAmount: 3120 },
      { name: "BESCOM Bengaluru", sampleAccount: "BES-55443322", dueAmount: 1890 },
    ],
  },
  {
    id: "mobile",
    title: "Mobile Recharge",
    icon: "📱",
    color: "from-blue-500 to-cyan-600",
    badge: "Instant Top-up",
    providers: [
      { name: "Jio Prepaid 5G", sampleAccount: "9876543210", plans: [299, 666, 999] },
      { name: "Airtel Truly Unlimited", sampleAccount: "9812345678", plans: [319, 719, 999] },
      { name: "Vi Hero Unlimited", sampleAccount: "9823456789", plans: [299, 479, 799] },
    ],
  },
  {
    id: "broadband",
    title: "Broadband & Wi-Fi",
    icon: "🌐",
    color: "from-emerald-500 to-teal-600",
    badge: "High Speed",
    providers: [
      { name: "JioFiber 100Mbps", sampleAccount: "JF-88776655", dueAmount: 999 },
      { name: "Airtel Xstream Fiber", sampleAccount: "AX-44332211", dueAmount: 1199 },
      { name: "ACT Fibernet", sampleAccount: "ACT-99001122", dueAmount: 799 },
    ],
  },
  {
    id: "subscriptions",
    title: "Digital Subscriptions",
    icon: "🎬",
    color: "from-rose-500 to-pink-600",
    badge: "Entertainment",
    providers: [
      { name: "Netflix Premium (4K)", sampleAccount: "netflix@user.bank", plans: [199, 499, 649] },
      { name: "Spotify Premium Family", sampleAccount: "spotify@user.bank", plans: [119, 179, 299] },
      { name: "Amazon Prime Video", sampleAccount: "prime@user.bank", plans: [299, 999, 1499] },
    ],
  },
  {
    id: "gas",
    title: "LPG Gas Cylinder",
    icon: "🔥",
    color: "from-orange-500 to-red-600",
    badge: "Essential",
    providers: [
      { name: "Indane Gas (IOCL)", sampleAccount: "LPG-19283746", dueAmount: 950 },
      { name: "Bharat Gas (BPCL)", sampleAccount: "LPG-83746281", dueAmount: 960 },
      { name: "HP Gas (HPCL)", sampleAccount: "LPG-47281938", dueAmount: 955 },
    ],
  },
];

// GET /api/bills/catalog
router.get("/catalog", protect, (req, res) => {
  res.json({ catalog: BILL_CATALOG });
});

// POST /api/bills/pay
router.post("/pay", protect, async (req, res) => {
  const client = await pool.connect();

  try {
    const { biller_name, category, consumer_number, amount, mpin } = req.body;
    const userId = req.user.id;
    const numericAmount = Number(amount);

    if (!biller_name || !consumer_number || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        error: "Biller name, consumer/account number, and valid amount are required",
      });
    }

    if (!mpin || !/^\d{4}$/.test(String(mpin).trim())) {
      return res.status(400).json({
        error: "4-Digit Security MPIN is required to authorize payment",
      });
    }

    await client.query("BEGIN");

    // Fetch user and lock row
    const userRes = await client.query(
      "SELECT id, balance, mpin FROM users WHERE id = $1 FOR UPDATE",
      [userId]
    );

    if (userRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "User account not found" });
    }

    const userData = userRes.rows[0];

    // Verify 4-Digit Security MPIN
    if (userData.mpin) {
      const isMpinValid = await bcrypt.compare(String(mpin).trim(), userData.mpin);
      if (!isMpinValid) {
        await client.query("ROLLBACK");
        return res.status(401).json({
          error: "Incorrect 4-digit Security MPIN. Bill payment rejected.",
        });
      }
    } else {
      if (String(mpin).trim() !== "1234") {
        await client.query("ROLLBACK");
        return res.status(401).json({
          error: "Default Security MPIN is 1234. Please enter 1234 or update in Profile.",
        });
      }
      const hashedDefault = await bcrypt.hash("1234", 10);
      await client.query("UPDATE users SET mpin = $1 WHERE id = $2", [hashedDefault, userId]);
    }

    // Check Balance
    const balance = Number(userData.balance || 0);
    if (balance < numericAmount) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: `Insufficient wallet balance (Available: ₹${balance.toLocaleString("en-IN")}, Required: ₹${numericAmount.toLocaleString("en-IN")})`,
      });
    }

    // Deduct user balance
    const updatedUser = await client.query(
      "UPDATE users SET balance = balance - $1 WHERE id = $2 RETURNING balance",
      [numericAmount, userId]
    );

    // Generate unique reference id
    const referenceId = `NP-BILL-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Record Transaction in transactions table
    const txName = `${biller_name} (${category || "Bill Payment"})`;
    const txResult = await client.query(
      `INSERT INTO transactions 
       (name, amount, status, user_id, receiver_email) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, created_at`,
      [txName, -numericAmount, "success", userId, consumer_number]
    );

    await client.query("COMMIT");

    res.json({
      message: `Bill of ₹${numericAmount.toLocaleString("en-IN")} paid successfully to ${biller_name}! ⚡`,
      referenceId,
      newBalance: updatedUser.rows[0].balance,
      transactionId: txResult.rows[0].id,
      timestamp: txResult.rows[0].created_at,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Bill Payment Error:", err);
    res.status(500).json({ error: err.message || "Failed to process bill payment" });
  } finally {
    client.release();
  }
});

export default router;
