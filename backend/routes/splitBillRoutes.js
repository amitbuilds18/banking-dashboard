import express from "express";
import pool from "../db.js";
import protect from "../middleware/authMiddleware.js";
import { sendDebitNotification, sendCreditNotification } from "../services/emailService.js";

const router = express.Router();

/**
 * GET /api/split-bills
 * Fetches:
 * 1. Bills created by the user (with participants & collection status)
 * 2. Incoming requests where the user is listed as a participant
 */
router.get("/", protect, async (req, res) => {
  try {
    const userRes = await pool.query("SELECT email FROM users WHERE id = $1", [req.user.id]);
    const userEmail = userRes.rows[0]?.email?.toLowerCase() || "";

    // 1. Bills created by this user
    const createdBillsRes = await pool.query(
      `
      SELECT 
        b.id,
        b.title,
        b.total_amount,
        b.category,
        b.status,
        b.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', p.id,
              'name', p.name,
              'email', p.email,
              'share_amount', p.share_amount,
              'status', p.status,
              'settled_at', p.settled_at
            )
          ) FILTER (WHERE p.id IS NOT NULL), '[]'
        ) AS participants
      FROM split_bills b
      LEFT JOIN split_bill_participants p ON p.split_bill_id = b.id
      WHERE b.user_id = $1
      GROUP BY b.id
      ORDER BY b.created_at DESC
      `,
      [req.user.id]
    );

    // 2. Bills where current user is a participant and owes money
    const incomingRequestsRes = await pool.query(
      `
      SELECT 
        p.id as participant_id,
        p.share_amount,
        p.status,
        p.created_at,
        b.id as bill_id,
        b.title as bill_title,
        b.total_amount as bill_total,
        b.category,
        u.name as creator_name,
        u.email as creator_email
      FROM split_bill_participants p
      JOIN split_bills b ON b.id = p.split_bill_id
      JOIN users u ON u.id = b.user_id
      WHERE (LOWER(p.email) = $1 OR p.user_id = $2) AND b.user_id != $2
      ORDER BY p.created_at DESC
      `,
      [userEmail, req.user.id]
    );

    // Calculate totals
    let totalOwedToYou = 0;
    let totalYouOwe = 0;

    createdBillsRes.rows.forEach((bill) => {
      bill.participants.forEach((p) => {
        if (p.status === "pending") {
          totalOwedToYou += Number(p.share_amount || 0);
        }
      });
    });

    incomingRequestsRes.rows.forEach((reqItem) => {
      if (reqItem.status === "pending") {
        totalYouOwe += Number(reqItem.share_amount || 0);
      }
    });

    res.json({
      createdBills: createdBillsRes.rows,
      incomingRequests: incomingRequestsRes.rows,
      summary: {
        totalOwedToYou: Math.round(totalOwedToYou),
        totalYouOwe: Math.round(totalYouOwe),
        activeBillsCount: createdBillsRes.rows.filter((b) => b.status === "open").length,
      },
    });
  } catch (err) {
    console.error("Error fetching split bills:", err);
    res.status(500).json({ error: "Failed to fetch split bills" });
  }
});

/**
 * POST /api/split-bills
 * Creates a split bill and registers participant shares
 */
router.post("/", protect, async (req, res) => {
  const client = await pool.connect();
  try {
    const { title, total_amount, category = "Dining", participants = [] } = req.body;

    const numTotal = Number(total_amount);
    if (!title || !title.trim() || !numTotal || numTotal <= 0) {
      return res.status(400).json({ error: "Bill title and positive total amount are required" });
    }

    if (!Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ error: "At least one participant is required to split" });
    }

    await client.query("BEGIN");

    // Insert bill
    const billRes = await client.query(
      `
      INSERT INTO split_bills (user_id, title, total_amount, category, status)
      VALUES ($1, $2, $3, $4, 'open')
      RETURNING *
      `,
      [req.user.id, title.trim(), numTotal, category]
    );
    const bill = billRes.rows[0];

    // Insert participants
    const insertedParticipants = [];
    for (const p of participants) {
      const pEmail = (p.email || "").trim().toLowerCase();
      const pName = (p.name || pEmail.split("@")[0] || "Friend").trim();
      const pAmount = Number(p.share_amount || 0);

      if (pAmount <= 0) continue;

      // Check if participant is registered in users table
      const userMatch = await client.query(
        "SELECT id FROM users WHERE LOWER(email) = $1",
        [pEmail]
      );
      const linkedUserId = userMatch.rows[0]?.id || null;

      const partRes = await client.query(
        `
        INSERT INTO split_bill_participants (
          split_bill_id,
          user_id,
          name,
          email,
          share_amount,
          status
        )
        VALUES ($1, $2, $3, $4, $5, 'pending')
        RETURNING *
        `,
        [bill.id, linkedUserId, pName, pEmail, pAmount]
      );
      insertedParticipants.push(partRes.rows[0]);

      // If registered user, notify them in-app
      if (linkedUserId && linkedUserId !== req.user.id) {
        await client.query(
          `
          INSERT INTO notifications (user_id, title, message)
          VALUES ($1, $2, $3)
          `,
          [
            linkedUserId,
            "💸 Split Bill Request",
            `₹${pAmount.toLocaleString("en-IN")} requested by ${req.user.name || "friend"} for "${bill.title}".`,
          ]
        );
      }
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: `Split bill "${bill.title}" created with ${insertedParticipants.length} participants! 🧾`,
      bill: {
        ...bill,
        participants: insertedParticipants,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Create split bill error:", err);
    res.status(500).json({ error: err.message || "Failed to create split bill" });
  } finally {
    client.release();
  }
});

/**
 * POST /api/split-bills/settle/:participantId
 * Participant pays their share using their NovaPay balance, transferring funds to the bill creator
 */
router.post("/settle/:participantId", protect, async (req, res) => {
  const client = await pool.connect();
  try {
    const { participantId } = req.params;

    await client.query("BEGIN");

    // Fetch participant entry
    const partRes = await client.query(
      `
      SELECT p.*, b.title as bill_title, b.user_id as creator_id
      FROM split_bill_participants p
      JOIN split_bills b ON b.id = p.split_bill_id
      WHERE p.id = $1 FOR UPDATE
      `,
      [participantId]
    );

    if (partRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Split request not found" });
    }

    const part = partRes.rows[0];
    if (part.status === "settled") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "This share is already settled" });
    }

    const shareAmount = Number(part.share_amount);

    // Payer is current user
    const payerRes = await client.query(
      "SELECT id, name, email, balance FROM users WHERE id = $1 FOR UPDATE",
      [req.user.id]
    );
    const payer = payerRes.rows[0];
    const payerBalance = Number(payer.balance || 0);

    if (payerBalance < shareAmount) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: `Insufficient balance to settle share. Required: ₹${shareAmount.toLocaleString("en-IN")}, Available: ₹${payerBalance.toLocaleString("en-IN")}`,
      });
    }

    // Bill Creator receives the money
    const creatorRes = await client.query(
      "SELECT id, name, email, balance FROM users WHERE id = $1 FOR UPDATE",
      [part.creator_id]
    );
    const creator = creatorRes.rows[0];

    // Deduct payer balance
    await client.query(
      "UPDATE users SET balance = balance - $1 WHERE id = $2",
      [shareAmount, payer.id]
    );

    // Credit creator balance
    await client.query(
      "UPDATE users SET balance = balance + $1 WHERE id = $2",
      [shareAmount, creator.id]
    );

    // Mark participant as settled
    await client.query(
      `
      UPDATE split_bill_participants
      SET status = 'settled', settled_at = CURRENT_TIMESTAMP, user_id = $1
      WHERE id = $2
      `,
      [payer.id, participantId]
    );

    // Check if entire bill is settled
    const remainingPending = await client.query(
      "SELECT id FROM split_bill_participants WHERE split_bill_id = $1 AND status = 'pending'",
      [part.split_bill_id]
    );
    if (remainingPending.rowCount === 0) {
      await client.query(
        "UPDATE split_bills SET status = 'settled' WHERE id = $1",
        [part.split_bill_id]
      );
    }

    // Record transactions
    await client.query(
      `
      INSERT INTO transactions (user_id, name, amount, status, category, receiver_email)
      VALUES ($1, $2, $3, 'success', 'Dining', $4)
      `,
      [
        payer.id,
        `Split Share: ${part.bill_title}`,
        -shareAmount,
        creator.email,
      ]
    );

    await client.query(
      `
      INSERT INTO transactions (user_id, name, amount, status, category, receiver_email)
      VALUES ($1, $2, $3, 'success', 'Dining', $4)
      `,
      [
        creator.id,
        `Split Collected: ${part.bill_title} (${payer.name})`,
        shareAmount,
        payer.email,
      ]
    );

    // Notify creator
    await client.query(
      `
      INSERT INTO notifications (user_id, title, message)
      VALUES ($1, $2, $3)
      `,
      [
        creator.id,
        "✅ Split Share Settled",
        `₹${shareAmount.toLocaleString("en-IN")} received from ${payer.name} for "${part.bill_title}".`,
      ]
    );

    await client.query("COMMIT");

    // Async Email notification
    sendDebitNotification({
      senderEmail: payer.email,
      senderName: payer.name,
      receiverEmail: creator.email,
      amount: shareAmount,
      balance: payerBalance - shareAmount,
    }).catch((e) => console.warn("Split email error:", e.message));

    res.json({
      message: `Successfully settled your ₹${shareAmount.toLocaleString("en-IN")} share for "${part.bill_title}"! 💸`,
      newBalance: payerBalance - shareAmount,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Settle split error:", err);
    res.status(500).json({ error: err.message || "Failed to settle split share" });
  } finally {
    client.release();
  }
});

/**
 * POST /api/split-bills/nudge/:participantId
 * Sends a polite in-app and email reminder to the participant
 */
router.post("/nudge/:participantId", protect, async (req, res) => {
  try {
    const { participantId } = req.params;

    const partRes = await pool.query(
      `
      SELECT p.*, b.title as bill_title, u.name as creator_name
      FROM split_bill_participants p
      JOIN split_bills b ON b.id = p.split_bill_id
      JOIN users u ON u.id = b.user_id
      WHERE p.id = $1 AND b.user_id = $2
      `,
      [participantId, req.user.id]
    );

    if (partRes.rowCount === 0) {
      return res.status(404).json({ error: "Participant entry not found" });
    }

    const part = partRes.rows[0];

    // If user is registered, notify in-app
    if (part.user_id) {
      await pool.query(
        `
        INSERT INTO notifications (user_id, title, message)
        VALUES ($1, $2, $3)
        `,
        [
          part.user_id,
          "🔔 Friendly Nudge",
          `${part.creator_name} requested ₹${Number(part.share_amount).toLocaleString("en-IN")} for "${part.bill_title}".`,
        ]
      );
    }

    res.json({ message: `Reminder nudge sent to ${part.name} (${part.email})! 🔔` });
  } catch (err) {
    console.error("Nudge error:", err);
    res.status(500).json({ error: "Failed to send reminder" });
  }
});

/**
 * DELETE /api/split-bills/:id
 * Deletes a split bill created by the user
 */
router.delete("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM split_bills WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Bill not found or unauthorized" });
    }

    res.json({ message: "Split bill cancelled and deleted successfully" });
  } catch (err) {
    console.error("Delete split bill error:", err);
    res.status(500).json({ error: "Failed to delete split bill" });
  }
});

export default router;
