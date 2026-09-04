import express from "express";
import Stripe from "stripe";
import pool from "../db.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

// ===========================================
// CREATE CHECKOUT SESSION
// ===========================================

router.post(
  "/create-checkout-session",
  protect,
  async (req, res) => {
    try {
      const rawAmount = Number(req.body.amount) || 500;
      const amount = Math.max(100, Math.min(500000, Math.floor(rawAmount)));

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],

        line_items: [
          {
            price_data: {
              currency: "inr",
              product_data: {
                name: "Wallet Recharge",
                description: "Instant balance recharge to your NovaPay account",
              },
              unit_amount: amount * 100,
            },
            quantity: 1,
          },
        ],

        mode: "payment",

        metadata: {
          userId: req.user.id.toString(),
          amount: amount.toString(),
        },

        success_url:
          `${frontendUrl}/success?session_id={CHECKOUT_SESSION_ID}`,

        cancel_url:
          `${frontendUrl}/cancel`,
      });

      res.json({
        url: session.url,
      });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: err.message,
      });
    }
  }
);

// ===========================================
// CONFIRM PAYMENT
// ===========================================

router.post(
  "/confirm-payment",
  protect,
  async (req, res) => {
    try {

      console.log("========== CONFIRM PAYMENT ==========");

      const { session_id } = req.body;

      if (!session_id) {
        return res.status(400).json({ error: "Session ID is required" });
      }

      console.log("Session ID:", session_id);

      const session = await stripe.checkout.sessions.retrieve(session_id);

      console.log("Payment Status:", session.payment_status);
      console.log("Metadata:", session.metadata);

      if (session.payment_status !== "paid") {
        return res.status(400).json({
          error: "Payment not completed",
        });
      }

      const amount = Number(session.metadata.amount);
      const userId = Number(session.metadata.userId);

      // Prevent duplicate recharge using session_id
      const existing = await pool.query(
        `
        SELECT id
        FROM transactions
        WHERE stripe_session_id = $1
        `,
        [session_id]
      );

      if (existing.rows.length > 0) {
        return res.json({
          message: "Payment already processed",
        });
      }

      // Update Balance
      const updated = await pool.query(
        `
        UPDATE users
        SET balance = balance + $1
        WHERE id = $2
        RETURNING balance
        `,
        [
          amount,
          userId,
        ]
      );

      console.log("Updated Balance:", updated.rows[0]);

      // Save Transaction
      await pool.query(
        `
        INSERT INTO transactions
        (
          name,
          amount,
          status,
          user_id,
          receiver_email,
          stripe_session_id
        )
        VALUES
        ($1,$2,$3,$4,$5,$6)
        `,
        [
          "Wallet Recharge",
          amount,
          "success",
          userId,
          null,
          session_id,
        ]
      );

      console.log("Transaction Saved");

      res.json({
        message: "Wallet Recharged Successfully",
        balance: updated.rows[0].balance,
      });

    } catch (err) {

      console.error("CONFIRM PAYMENT ERROR:", err);

      res.status(500).json({
        error: err.message,
      });
    }
  }
);

export default router;