import express from "express";
import pool from "../db.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

const getFrontendBaseUrl = (req) => {
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
  const origin = req.headers.origin || req.headers.referer;
  if (origin) {
    try {
      const u = new URL(origin);
      return `${u.protocol}//${u.host}`;
    } catch (e) {
      // Ignored
    }
  }
  return "http://localhost:5173";
};

// @route   GET /api/payment-links
// @desc    List all payment links created by the user with aggregate metrics
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const linksRes = await pool.query(
      `SELECT * FROM payment_links 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    const statsRes = await pool.query(
      `SELECT 
         COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as total_collected,
         COALESCE(SUM(amount) FILTER (WHERE status = 'active'), 0) as pending_amount,
         COUNT(*) FILTER (WHERE status = 'active') as active_count,
         COUNT(*) FILTER (WHERE status = 'paid') as paid_count
       FROM payment_links 
       WHERE user_id = $1`,
      [userId]
    );

    res.json({
      links: linksRes.rows,
      stats: {
        totalCollected: parseFloat(statsRes.rows[0].total_collected || 0),
        pendingAmount: parseFloat(statsRes.rows[0].pending_amount || 0),
        activeCount: parseInt(statsRes.rows[0].active_count || 0),
        paidCount: parseInt(statsRes.rows[0].paid_count || 0),
        totalLinks: linksRes.rows.length,
      },
    });
  } catch (error) {
    console.error("Fetch payment links error:", error);
    res.status(500).json({ message: "Failed to fetch payment links", error: error.message });
  }
});

// @route   POST /api/payment-links
// @desc    Generate a new payment request link with UPI intent & WhatsApp shareable preview
// @access  Private
router.post("/", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      amount,
      description = "Payment Request",
      customerName = "",
      customerPhone = "",
      customerEmail = "",
      expireDays = 7,
    } = req.body;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 1) {
      return res.status(400).json({ message: "Amount must be at least ₹1." });
    }

    // Fetch user name for UPI receiver name
    const userRes = await pool.query("SELECT name, email FROM users WHERE id = $1", [userId]);
    const userName = userRes.rows[0]?.name || "NovaPay Merchant";

    // Generate unique short link code: PL-XXXXXX
    const linkCode = `PL-${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`;

    // Standard UPI Payment URI specification
    const upiString = `upi://pay?pa=novapay@upi&pn=${encodeURIComponent(
      userName
    )}&am=${parsedAmount.toFixed(2)}&tn=${encodeURIComponent(description)}&cu=INR`;

    const insertRes = await pool.query(
      `INSERT INTO payment_links (
         link_code, user_id, amount, description, customer_name,
         customer_phone, customer_email, status, upi_string,
         expires_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, CURRENT_TIMESTAMP + ($9 || ' days')::INTERVAL)
       RETURNING *`,
      [
        linkCode,
        userId,
        parsedAmount,
        description,
        customerName,
        customerPhone,
        customerEmail,
        upiString,
        parseInt(expireDays) || 7,
      ]
    );

    const createdLink = insertRes.rows[0];
    const baseUrl = getFrontendBaseUrl(req);
    const payUrl = `${baseUrl}/pay/${linkCode}`;

    // WhatsApp pre-formatted share message
    const waText = encodeURIComponent(
      `Hi ${customerName || "there"}! Please pay ₹${parsedAmount.toLocaleString(
        "en-IN"
      )} for "${description}" to ${userName} using this secure NovaPay link: ${payUrl}`
    );
    const whatsappUrl = `https://api.whatsapp.com/send?text=${waText}${
      customerPhone ? `&phone=${customerPhone.replace(/\D/g, "")}` : ""
    }`;

    res.status(201).json({
      message: "Payment link created successfully!",
      link: createdLink,
      payUrl,
      whatsappUrl,
    });
  } catch (error) {
    console.error("Create payment link error:", error);
    res.status(500).json({ message: "Failed to create payment link", error: error.message });
  }
});

// @route   GET /api/payment-links/public/:linkCode
// @desc    PUBLIC: Fetch details of a payment link for the checkout page
// @access  Public
router.get("/public/:linkCode", async (req, res) => {
  try {
    const { linkCode } = req.params;

    const linkRes = await pool.query(
      `SELECT pl.id, pl.link_code, pl.amount, pl.description, pl.status,
              pl.customer_name, pl.expires_at, pl.paid_at, pl.paid_by_name,
              pl.paid_by_method, pl.upi_string, pl.transaction_ref,
              u.name as merchant_name, u.email as merchant_email
       FROM payment_links pl
       JOIN users u ON pl.user_id = u.id
       WHERE pl.link_code = $1`,
      [linkCode]
    );

    if (linkRes.rows.length === 0) {
      return res.status(404).json({ message: "Payment link not found or expired." });
    }

    const link = linkRes.rows[0];
    const isExpired = new Date(link.expires_at) < new Date();

    res.json({
      linkCode: link.link_code,
      amount: parseFloat(link.amount),
      description: link.description,
      customerName: link.customer_name,
      status: isExpired && link.status === "active" ? "expired" : link.status,
      merchantName: link.merchant_name,
      merchantEmail: link.merchant_email,
      upiString: link.upi_string,
      expiresAt: link.expires_at,
      paidAt: link.paid_at,
      paidByName: link.paid_by_name,
      paidByMethod: link.paid_by_method,
      transactionRef: link.transaction_ref,
      isExpired,
    });
  } catch (error) {
    console.error("Public payment link error:", error);
    res.status(500).json({ message: "Failed to load payment link", error: error.message });
  }
});

// @route   POST /api/payment-links/public/:linkCode/settle
// @desc    PUBLIC: Process payer settlement for a payment link (credits merchant balance)
// @access  Public
router.post("/public/:linkCode/settle", async (req, res) => {
  const client = await pool.connect();
  try {
    const { linkCode } = req.params;
    const { payerName = "Customer", paymentMethod = "UPI App" } = req.body;

    await client.query("BEGIN");

    const linkRes = await client.query(
      "SELECT * FROM payment_links WHERE link_code = $1 FOR UPDATE",
      [linkCode]
    );

    if (linkRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Payment link not found." });
    }

    const link = linkRes.rows[0];

    if (link.status === "paid") {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "This payment link has already been settled and paid." });
    }

    if (new Date(link.expires_at) < new Date()) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "This payment link has expired." });
    }

    const amount = parseFloat(link.amount);
    const txRef = `TXN-PL-${Date.now().toString().slice(-8)}`;

    // 1. Mark link as paid
    const updatedLinkRes = await client.query(
      `UPDATE payment_links 
       SET status = 'paid', 
           paid_at = CURRENT_TIMESTAMP, 
           paid_by_name = $1, 
           paid_by_method = $2, 
           transaction_ref = $3
       WHERE id = $4
       RETURNING *`,
      [payerName, paymentMethod, txRef, link.id]
    );

    // 2. Credit merchant user balance atomically
    await client.query(
      "UPDATE users SET balance = balance + $1, reward_points = reward_points + 20 WHERE id = $2",
      [amount, link.user_id]
    );

    // 3. Record transaction for merchant
    await client.query(
      `INSERT INTO transactions (user_id, name, amount, category, status, notes)
       VALUES ($1, $2, $3, 'Payment Received', 'success', $4)`,
      [
        link.user_id,
        `Payment Link Received - ${payerName}`,
        amount,
        `Collected via ${link.link_code} for "${link.description}". Method: ${paymentMethod}`,
      ]
    );

    // 4. Create notification for merchant
    await client.query(
      `INSERT INTO notifications (user_id, title, message)
       VALUES ($1, '💰 Payment Link Paid!', $2)`,
      [
        link.user_id,
        `Received ₹${amount.toLocaleString("en-IN")} from ${payerName} via link ${link.link_code}! Deposited to wallet.`,
      ]
    );

    // 5. Award a bonus scratch card for merchant on receiving payment!
    await client.query(
      `INSERT INTO scratch_cards (user_id, title, description, reward_type, reward_value, merchant_name, source_event)
       VALUES ($1, '⚡ Payment Received Perk', 'Reward for successfully collecting payment via link!', 'cashback', 20, 'NovaPay Links', 'Payment Link Collection')`,
      [link.user_id]
    );

    await client.query("COMMIT");

    res.json({
      message: "Payment processed successfully!",
      receipt: {
        linkCode: link.link_code,
        amount,
        description: link.description,
        payerName,
        paymentMethod,
        transactionRef: txRef,
        paidAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Settle payment link error:", error);
    res.status(500).json({ message: "Failed to settle payment link", error: error.message });
  } finally {
    client.release();
  }
});

// @route   POST /api/payment-links/:id/cancel
// @desc    Cancel an active payment link
// @access  Private
router.post("/:id/cancel", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const linkId = req.params.id;

    const updateRes = await pool.query(
      `UPDATE payment_links 
       SET status = 'cancelled' 
       WHERE id = $1 AND user_id = $2 AND status = 'active'
       RETURNING *`,
      [linkId, userId]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ message: "Active link not found or already closed." });
    }

    res.json({
      message: "Payment link cancelled.",
      link: updateRes.rows[0],
    });
  } catch (error) {
    console.error("Cancel link error:", error);
    res.status(500).json({ message: "Failed to cancel link", error: error.message });
  }
});

export default router;
