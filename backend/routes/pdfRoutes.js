import express from "express";
import PDFDocument from "pdfkit";
import pool from "../db.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/statement", protect, async (req, res) => {
  try {
    // User Details
    const user = await pool.query(
      `
      SELECT id, name, email, balance
      FROM users
      WHERE id = $1
      `,
      [req.user.id]
    );

    // Transactions
    const transactions = await pool.query(
      `
      SELECT
        name,
        receiver_email,
        amount,
        status,
        created_at
      FROM transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [req.user.id]
    );

    const u = user.rows[0];

    const doc = new PDFDocument({
      size: "A4",
      margin: 40,
    });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=BankStatement.pdf"
    );

    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    // ==========================================
    // HEADER
    // ==========================================

    doc.rect(0, 0, 700, 90).fill("#1E3A8A");

    doc
      .fillColor("white")
      .fontSize(24)
      .text("FINANCE DASHBOARD", 0, 25, {
        align: "center",
      });

    doc
      .fontSize(12)
      .text("Digital Banking System", {
        align: "center",
      });

    doc.fillColor("black");

    doc.moveDown(4);

    // ==========================================
    // TITLE
    // ==========================================

    doc
      .fontSize(18)
      .text("BANK STATEMENT", {
        align: "center",
      });

    doc.moveDown();

    // ==========================================
    // USER DETAILS BOX
    // ==========================================

    doc.roundedRect(40, 140, 520, 100, 8).stroke();

    doc.fontSize(12);

    doc.text(`Account Holder : ${u.name}`, 55, 155);
    doc.text(`Email : ${u.email}`, 55, 175);
    doc.text(`Account No : XXXX-XXXX-${1000 + u.id}`, 55, 195);

    doc.text(`Current Balance : ₹${u.balance}`, 320, 155);
    doc.text(
      `Statement Date : ${new Date().toLocaleDateString()}`,
      320,
      175
    );

    // ==========================================
    // TABLE HEADER
    // ==========================================

    let y = 270;

    doc.rect(40, y, 520, 25).fill("#2563EB");

    doc.fillColor("white").font("Helvetica-Bold");

    doc.text("Date", 50, y + 7);
    doc.text("Type", 120, y + 7);
    doc.text("Receiver", 250, y + 7);
    doc.text("Amount", 420, y + 7);
    doc.text("Status", 500, y + 7);

    doc.fillColor("black").font("Helvetica");

    y += 25;

    // ==========================================
    // TRANSACTIONS
    // ==========================================

    let totalIncome = 0;
    let totalExpense = 0;

    transactions.rows.forEach((t) => {

      const amount = Number(t.amount);

      if (amount > 0) {
        totalIncome += amount;
      } else {
        totalExpense += Math.abs(amount);
      }

      doc.rect(40, y, 520, 22).stroke();

      doc.text(
        new Date(t.created_at).toLocaleDateString(),
        50,
        y + 5
      );

      doc.text(t.name, 120, y + 5);

      doc.text(
        t.receiver_email || "-",
        250,
        y + 5
      );

      if (amount >= 0) {
        doc.fillColor("green");
      } else {
        doc.fillColor("red");
      }

      doc.text(`₹${amount}`, 420, y + 5);

      doc.fillColor("black");

      doc.text(t.status, 500, y + 5);

      y += 22;

      // New page if needed
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
    });

    // ==========================================
    // SUMMARY BOX
    // ==========================================

    y += 20;

    doc.roundedRect(40, y, 520, 90, 8).stroke();

    doc.font("Helvetica-Bold");

    doc.text(
      `Total Transactions : ${transactions.rows.length}`,
      55,
      y + 15
    );

    doc.text(
      `Total Income : ₹${totalIncome}`,
      55,
      y + 35
    );

    doc.text(
      `Total Expense : ₹${totalExpense}`,
      300,
      y + 15
    );

    doc.text(
      `Current Balance : ₹${u.balance}`,
      300,
      y + 35
    );

    // ==========================================
    // SIGNATURE
    // ==========================================

    y += 130;

    doc.moveTo(400, y).lineTo(560, y).stroke();

    doc.text(
      "Authorized Signature",
      415,
      y + 5
    );

    // ==========================================
    // FOOTER
    // ==========================================

    doc.font("Helvetica");

    doc.fontSize(10);

    doc.text(
      "This is a computer generated bank statement.",
      0,
      770,
      {
        align: "center",
      }
    );

    doc.text(
      "Finance Dashboard © 2026",
      {
        align: "center",
      }
    );

    doc.text(
      "Page 1 of 1",
      {
        align: "right",
      }
    );

    doc.end();

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
});

export default router;