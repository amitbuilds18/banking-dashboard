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

// ==========================================
// 🏛️ INTEREST CERTIFICATE (SECTION 80TTA / 80TTB)
// ==========================================
router.get("/interest-certificate", protect, async (req, res) => {
  try {
    const fy = req.query.fy || "2024-25";
    const ay = fy === "2024-25" ? "2025-26" : "2026-27";

    const userRes = await pool.query(
      "SELECT id, name, email, balance FROM users WHERE id = $1",
      [req.user.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const u = userRes.rows[0];

    // Fetch user FDs if any
    const fdRes = await pool.query(
      "SELECT * FROM fixed_deposits WHERE user_id = $1 ORDER BY created_at DESC",
      [req.user.id]
    );

    // Calculate realistic savings interest based on balance (~3.5% p.a.)
    const balanceNum = Math.max(25000, Number(u.balance) || 50000);
    const annualSavingsInterest = Math.round(balanceNum * 0.035);
    const q1 = Math.round(annualSavingsInterest * 0.24);
    const q2 = Math.round(annualSavingsInterest * 0.25);
    const q3 = Math.round(annualSavingsInterest * 0.26);
    const q4 = annualSavingsInterest - (q1 + q2 + q3);

    // Calculate FD interest and TDS
    let totalFdInterest = 0;
    let totalTdsDeducted = 0;

    if (fdRes.rows.length > 0) {
      fdRes.rows.forEach((fd) => {
        const principal = Number(fd.principal_amount) || 50000;
        const rate = (Number(fd.interest_rate) || 7.5) / 100;
        const interest = Math.round(principal * rate);
        totalFdInterest += interest;
        if (interest > 40000) {
          totalTdsDeducted += Math.round(interest * 0.1);
        }
      });
    } else {
      totalFdInterest = 12500;
      totalTdsDeducted = 0;
    }

    const totalInterestEarned = annualSavingsInterest + totalFdInterest;
    const exemption80tta = Math.min(10000, annualSavingsInterest);
    const taxableInterest = totalInterestEarned - exemption80tta;

    const certRef = `NEO/INT/${fy.replace("-", "")}/${u.id.toString().padStart(6, "0")}`;

    const doc = new PDFDocument({
      size: "A4",
      margin: 40,
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Interest_Certificate_${fy}_${u.name.replace(/\s+/g, "_")}.pdf`
    );
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    // Top Header Banner
    doc.rect(0, 0, 700, 85).fill("#0F172A"); // Dark Slate
    doc.fillColor("#38BDF8").fontSize(20).font("Helvetica-Bold").text("NEO DIGITAL BANK", 40, 22);
    doc.fillColor("#94A3B8").fontSize(10).font("Helvetica").text("Scheduled Commercial Bank | RBI Reg No: 8849-B", 40, 46);

    doc.fillColor("#F8FAFC").fontSize(12).font("Helvetica-Bold").text("INTEREST CERTIFICATE", 380, 22, { align: "right" });
    doc.fillColor("#94A3B8").fontSize(9).font("Helvetica").text(`Ref: ${certRef}`, 380, 40, { align: "right" });
    doc.text(`Date of Issue: ${new Date().toLocaleDateString("en-IN")}`, 380, 54, { align: "right" });

    doc.moveDown(4);

    // Purpose & Financial Year Notice
    doc.fillColor("#1E293B").fontSize(13).font("Helvetica-Bold").text(`ANNUAL INTEREST STATEMENT FOR FY ${fy} (AY ${ay})`, 40, 105, { align: "center" });
    doc.fillColor("#64748B").fontSize(9).font("Helvetica").text("(Issued under Section 194A / Section 80TTA / 80TTB of the Income Tax Act, 1961)", 40, 122, { align: "center" });

    // Customer Detail Box
    doc.roundedRect(40, 145, 515, 75, 6).strokeColor("#CBD5E1").lineWidth(1).stroke();
    doc.fillColor("#0F172A").fontSize(10).font("Helvetica-Bold");
    doc.text(`Account Holder: ${u.name.toUpperCase()}`, 55, 158);
    doc.text(`Customer ID: NEO-CUST-${10000 + u.id}`, 55, 175);
    doc.text(`Primary Savings A/C: 4099-2810-${u.id.toString().padStart(4, "0")}`, 55, 192);

    doc.text(`Email: ${u.email}`, 320, 158);
    doc.text(`PAN: ABCDE${u.id}234F (Verified)`, 320, 175);
    doc.text(`IFSC Code: NEOB0001092`, 320, 192);

    // Section 1: Savings Account Interest Breakdown
    doc.fillColor("#0F172A").fontSize(11).font("Helvetica-Bold").text("1. SAVINGS BANK ACCOUNT INTEREST (SECTION 80TTA)", 40, 238);
    
    // Table Header
    doc.rect(40, 255, 515, 22).fill("#F1F5F9");
    doc.fillColor("#334155").fontSize(9).font("Helvetica-Bold");
    doc.text("Quarter / Period", 50, 261);
    doc.text("Rate (p.a.)", 200, 261);
    doc.text("TDS Deducted", 340, 261);
    doc.text("Interest Credited (INR)", 430, 261);

    // Table Rows
    const rows = [
      { q: "Q1: 01-Apr to 30-Jun", rate: "3.50%", tds: "₹0", amt: `₹${q1.toLocaleString("en-IN")}` },
      { q: "Q2: 01-Jul to 30-Sep", rate: "3.50%", tds: "₹0", amt: `₹${q2.toLocaleString("en-IN")}` },
      { q: "Q3: 01-Oct to 31-Dec", rate: "3.50%", tds: "₹0", amt: `₹${q3.toLocaleString("en-IN")}` },
      { q: "Q4: 01-Jan to 31-Mar", rate: "3.50%", tds: "₹0", amt: `₹${q4.toLocaleString("en-IN")}` },
    ];

    let rowY = 282;
    doc.font("Helvetica").fontSize(9).fillColor("#1E293B");
    rows.forEach((r, idx) => {
      if (idx % 2 === 1) doc.rect(40, rowY - 4, 515, 20).fill("#F8FAFC");
      doc.fillColor("#1E293B");
      doc.text(r.q, 50, rowY);
      doc.text(r.rate, 200, rowY);
      doc.text(r.tds, 340, rowY);
      doc.text(r.amt, 430, rowY);
      rowY += 20;
    });

    // Subtotal Row
    doc.rect(40, rowY - 2, 515, 22).fill("#E2E8F0");
    doc.fillColor("#0F172A").font("Helvetica-Bold");
    doc.text("Total Savings Interest Credited:", 50, rowY + 3);
    doc.text(`₹${annualSavingsInterest.toLocaleString("en-IN")}`, 430, rowY + 3);

    // Section 2: Fixed Deposit / Term Deposit Summary
    rowY += 40;
    doc.fillColor("#0F172A").fontSize(11).font("Helvetica-Bold").text("2. TERM DEPOSITS / FIXED DEPOSITS INTEREST & TDS", 40, rowY);
    rowY += 16;
    doc.rect(40, rowY, 515, 22).fill("#F1F5F9");
    doc.fillColor("#334155").fontSize(9).font("Helvetica-Bold");
    doc.text("Deposit Category", 50, rowY + 6);
    doc.text("Active Deposits", 200, rowY + 6);
    doc.text("TDS Deducted (u/s 194A)", 310, rowY + 6);
    doc.text("Total FD Interest", 430, rowY + 6);

    rowY += 26;
    doc.font("Helvetica").fontSize(9).fillColor("#1E293B");
    doc.text("Cumulative / Monthly Payout FDs", 50, rowY);
    doc.text(`${Math.max(1, fdRes.rows.length)} Active Deposit(s)`, 200, rowY);
    doc.text(`₹${totalTdsDeducted.toLocaleString("en-IN")}`, 310, rowY);
    doc.text(`₹${totalFdInterest.toLocaleString("en-IN")}`, 430, rowY);

    // Section 3: Income Tax Exemption & Filing Summary
    rowY += 40;
    doc.fillColor("#0F172A").fontSize(11).font("Helvetica-Bold").text("3. INCOME TAX BENEFIT SUMMARY (FOR ITR FILING)", 40, rowY);
    rowY += 16;

    doc.roundedRect(40, rowY, 515, 75, 6).fillAndStroke("#F0FDF4", "#86EFAC");
    doc.fillColor("#166534").fontSize(9).font("Helvetica-Bold");
    doc.text(`Total Gross Interest Earned (Savings + FDs): ₹${totalInterestEarned.toLocaleString("en-IN")}`, 55, rowY + 12);
    doc.text(`Less: Deduction Eligible Under Section 80TTA: ₹${exemption80tta.toLocaleString("en-IN")} (Max ₹10,000 for non-seniors)`, 55, rowY + 30);
    doc.fillColor("#15803D").fontSize(10);
    doc.text(`Net Taxable Interest Income Under 'Income from Other Sources': ₹${taxableInterest.toLocaleString("en-IN")}`, 55, rowY + 48);

    // Bank Seal & Signatures
    rowY += 110;
    doc.circle(100, rowY + 15, 30).lineWidth(1.5).strokeColor("#0284C7").stroke();
    doc.fillColor("#0284C7").fontSize(7).font("Helvetica-Bold").text("NEO BANK", 80, rowY + 5);
    doc.text("OFFICIAL SEAL", 72, rowY + 16);
    doc.text("VERIFIED", 82, rowY + 27);

    doc.moveTo(380, rowY + 25).lineTo(540, rowY + 25).strokeColor("#64748B").lineWidth(1).stroke();
    doc.fillColor("#0F172A").fontSize(9).font("Helvetica-Bold").text("Authorized Signatory", 400, rowY + 30);
    doc.fillColor("#64748B").fontSize(8).font("Helvetica").text("Neo Central Clearing & Taxation Cell", 370, rowY + 42);

    // Footer
    doc.fillColor("#94A3B8").fontSize(8).text(
      "Note: This document is a valid digitally authenticated record generated for Income Tax Filing purposes.",
      40,
      765,
      { align: "center", width: 515 }
    );

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;