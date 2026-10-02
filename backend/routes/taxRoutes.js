import express from "express";
import pool from "../db.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// Helper: Calculate New Tax Regime (FY 2025-26 Budget Slabs)
function computeNewRegimeTax(grossIncome) {
  const standardDeduction = 75000;
  const taxableIncome = Math.max(0, grossIncome - standardDeduction);

  if (taxableIncome <= 700000) {
    // 87A Full Rebate under New Regime up to 7 Lakhs
    return {
      grossIncome,
      deductions: standardDeduction,
      taxableIncome,
      baseTax: 0,
      cess: 0,
      totalTax: 0,
      rebate87A: true,
    };
  }

  let tax = 0;
  // Slabs:
  // 0 - 3L: 0%
  // 3L - 7L: 5% (max 20,000)
  // 7L - 10L: 10% (max 30,000)
  // 10L - 12L: 15% (max 30,000)
  // 12L - 15L: 20% (max 60,000)
  // > 15L: 30%

  if (taxableIncome > 300000) {
    tax += Math.min(taxableIncome - 300000, 400000) * 0.05;
  }
  if (taxableIncome > 700000) {
    tax += Math.min(taxableIncome - 700000, 300000) * 0.1;
  }
  if (taxableIncome > 1000000) {
    tax += Math.min(taxableIncome - 1000000, 200000) * 0.15;
  }
  if (taxableIncome > 1200000) {
    tax += Math.min(taxableIncome - 1200000, 300000) * 0.2;
  }
  if (taxableIncome > 1500000) {
    tax += (taxableIncome - 1500000) * 0.3;
  }

  const baseTax = Math.round(tax);
  const cess = Math.round(baseTax * 0.04);
  const totalTax = baseTax + cess;

  return {
    grossIncome,
    deductions: standardDeduction,
    taxableIncome,
    baseTax,
    cess,
    totalTax,
    rebate87A: false,
  };
}

// Helper: Calculate Old Tax Regime
function computeOldRegimeTax(grossIncome, userDeductions = {}) {
  const standardDeduction = 50000;
  const sec80C = Math.min(150000, Number(userDeductions.declared_80c) || 0);
  const sec80D = Math.min(25000, Number(userDeductions.declared_80d) || 0);
  const secNPS = Math.min(50000, Number(userDeductions.declared_nps) || 0);
  const homeLoan = Math.min(200000, Number(userDeductions.home_loan_interest) || 0);
  const hra = Number(userDeductions.declared_hra) || 0;

  const totalDeductions = standardDeduction + sec80C + sec80D + secNPS + homeLoan + hra;
  const taxableIncome = Math.max(0, grossIncome - totalDeductions);

  if (taxableIncome <= 500000) {
    // 87A Full Rebate under Old Regime up to 5 Lakhs
    return {
      grossIncome,
      deductions: totalDeductions,
      taxableIncome,
      baseTax: 0,
      cess: 0,
      totalTax: 0,
      rebate87A: true,
      deductionBreakdown: {
        standardDeduction,
        sec80C,
        sec80D,
        secNPS,
        homeLoan,
        hra,
      },
    };
  }

  let tax = 0;
  // 0 - 2.5L: Nil
  // 2.5L - 5L: 5% (max 12,500)
  // 5L - 10L: 20% (max 1,00,000)
  // > 10L: 30%

  if (taxableIncome > 250000) {
    tax += Math.min(taxableIncome - 250000, 250000) * 0.05;
  }
  if (taxableIncome > 500000) {
    tax += Math.min(taxableIncome - 500000, 500000) * 0.2;
  }
  if (taxableIncome > 1000000) {
    tax += (taxableIncome - 1000000) * 0.3;
  }

  const baseTax = Math.round(tax);
  const cess = Math.round(baseTax * 0.04);
  const totalTax = baseTax + cess;

  return {
    grossIncome,
    deductions: totalDeductions,
    taxableIncome,
    baseTax,
    cess,
    totalTax,
    rebate87A: false,
    deductionBreakdown: {
      standardDeduction,
      sec80C,
      sec80D,
      secNPS,
      homeLoan,
      hra,
    },
  };
}

// @route   GET /api/tax/overview
// @desc    Get user's live tax estimation, regime comparison, deductions, advance tax calendar
// @access  Private
router.get("/overview", protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Fetch user & balance
    const userRes = await pool.query(
      "SELECT id, name, email, balance, is_kyc_verified FROM users WHERE id = $1",
      [userId]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const user = userRes.rows[0];

    // 2. Fetch or create tax profile
    let profileRes = await pool.query("SELECT * FROM tax_profiles WHERE user_id = $1", [userId]);
    let taxProfile = null;
    if (profileRes.rows.length === 0) {
      const insRes = await pool.query(
        `INSERT INTO tax_profiles (user_id, financial_year, preferred_regime, declared_80c, declared_80d, declared_nps)
         VALUES ($1, '2025-26', 'new', 150000, 25000, 50000)
         RETURNING *`,
        [userId]
      );
      taxProfile = insRes.rows[0];
    } else {
      taxProfile = profileRes.rows[0];
    }

    // 3. Aggregate user's actual income sources from transactions & FDs
    const inflowsRes = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_credits
       FROM transactions 
       WHERE user_id = $1 
         AND amount > 0 
         AND category NOT IN ('Recharge', 'Transfer', 'Self Transfer')`,
      [userId]
    );

    const fdInterestRes = await pool.query(
      `SELECT COALESCE(SUM(interest_earned), 0) as total_fd_interest 
       FROM fixed_deposits 
       WHERE user_id = $1`,
      [userId]
    );

    const goldHoldingsRes = await pool.query(
      `SELECT COALESCE(SUM(total_invested), 0) as gold_inv 
       FROM gold_holdings 
       WHERE user_id = $1`,
      [userId]
    );

    const rawInflows = parseFloat(inflowsRes.rows[0].total_credits || 0);
    const fdInterest = parseFloat(fdInterestRes.rows[0].total_fd_interest || 0);
    // Baseline realistic annual CTC estimate for display (or actual credits if > 12L)
    const baseAnnualSalary = Math.max(1250000, rawInflows > 100000 ? rawInflows * 2.5 : 1250000);
    const totalGrossIncome = Math.round(baseAnnualSalary + fdInterest);

    // 4. Compute both regimes
    const newRegime = computeNewRegimeTax(totalGrossIncome);
    const oldRegime = computeOldRegimeTax(totalGrossIncome, taxProfile);

    // Recommendation
    const recommendedRegime = newRegime.totalTax <= oldRegime.totalTax ? "new" : "old";
    const savings = Math.abs(oldRegime.totalTax - newRegime.totalTax);

    // 5. Advance Tax Installments (Based on Recommended Regime)
    const finalTax = recommendedRegime === "new" ? newRegime.totalTax : oldRegime.totalTax;
    const advancePaid = parseFloat(taxProfile.advance_tax_paid || 0);

    const advanceTaxCalendar = [
      {
        quarter: "Q1",
        label: "1st Installment (15%)",
        dueDate: "15 June 2025",
        targetPercent: 15,
        targetAmount: Math.round(finalTax * 0.15),
        status: advancePaid >= finalTax * 0.15 ? "PAID" : "DUE",
      },
      {
        quarter: "Q2",
        label: "2nd Installment (45%)",
        dueDate: "15 September 2025",
        targetPercent: 45,
        targetAmount: Math.round(finalTax * 0.45),
        status: advancePaid >= finalTax * 0.45 ? "PAID" : "DUE",
      },
      {
        quarter: "Q3",
        label: "3rd Installment (75%)",
        dueDate: "15 December 2025",
        targetPercent: 75,
        targetAmount: Math.round(finalTax * 0.75),
        status: advancePaid >= finalTax * 0.75 ? "PAID" : "DUE",
      },
      {
        quarter: "Q4",
        label: "4th Installment (100%)",
        dueDate: "15 March 2026",
        targetPercent: 100,
        targetAmount: finalTax,
        status: advancePaid >= finalTax ? "PAID" : "DUE",
      },
    ];

    // 6. Paid Challans History
    const challansRes = await pool.query(
      `SELECT * FROM tax_challans WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      financialYear: taxProfile.financial_year || "2025-26",
      assessmentYear: "2026-27",
      grossIncome: totalGrossIncome,
      salaryComponent: baseAnnualSalary,
      fdInterestComponent: fdInterest,
      preferredRegime: taxProfile.preferred_regime || "new",
      recommendedRegime,
      taxSavings: savings,
      newRegime,
      oldRegime,
      advanceTaxCalendar,
      advancePaid,
      balance: parseFloat(user.balance),
      taxProfile,
      challans: challansRes.rows,
    });
  } catch (error) {
    console.error("Tax overview error:", error);
    res.status(500).json({ message: "Failed to fetch tax overview", error: error.message });
  }
});

// @route   POST /api/tax/update-profile
// @desc    Update deductions (80C, 80D, HRA, NPS, Home Loan)
// @access  Private
router.post("/update-profile", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { preferredRegime, declared80C, declared80D, declaredHra, declaredNps, homeLoanInterest } =
      req.body;

    const updateRes = await pool.query(
      `UPDATE tax_profiles
       SET preferred_regime = COALESCE($1, preferred_regime),
           declared_80c = COALESCE($2, declared_80c),
           declared_80d = COALESCE($3, declared_80d),
           declared_hra = COALESCE($4, declared_hra),
           declared_nps = COALESCE($5, declared_nps),
           home_loan_interest = COALESCE($6, home_loan_interest),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $7
       RETURNING *`,
      [
        preferredRegime,
        declared80C,
        declared80D,
        declaredHra,
        declaredNps,
        homeLoanInterest,
        userId,
      ]
    );

    res.json({
      message: "Tax deductions profile updated!",
      profile: updateRes.rows[0],
    });
  } catch (error) {
    console.error("Update tax profile error:", error);
    res.status(500).json({ message: "Failed to update tax profile", error: error.message });
  }
});

// @route   POST /api/tax/pay-advance-tax
// @desc    Direct advance tax payment from wallet balance with official Challan 280 generation
// @access  Private
router.post("/pay-advance-tax", protect, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const { amount, taxType = "Advance Tax (100)" } = req.body;

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount < 100) {
      return res.status(400).json({ message: "Minimum tax payment amount is ₹100." });
    }

    await client.query("BEGIN");

    // 1. Verify user balance
    const userRes = await client.query(
      "SELECT balance, name FROM users WHERE id = $1 FOR UPDATE",
      [userId]
    );
    const balance = parseFloat(userRes.rows[0].balance);

    if (balance < payAmount) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: `Insufficient balance to pay tax. Required: ₹${payAmount.toLocaleString(
          "en-IN"
        )}, Available: ₹${balance.toLocaleString("en-IN")}.`,
      });
    }

    // 2. Deduct balance
    const updatedUserRes = await client.query(
      "UPDATE users SET balance = balance - $1 WHERE id = $2 RETURNING balance",
      [payAmount, userId]
    );

    // 3. Generate Official Challan 280 CIN & Numbers
    const challanNo = `ITD-CH280-${Date.now().toString().slice(-8)}`;
    const cin = `0210041${Date.now().toString().slice(-6)}001`;

    const challanRes = await client.query(
      `INSERT INTO tax_challans (
         user_id, challan_no, financial_year, assessment_year, tax_type,
         amount, bsr_code, cin, status
       ) VALUES ($1, $2, '2025-26', '2026-27', $3, $4, '0210041', $5, 'success')
       RETURNING *`,
      [userId, challanNo, taxType, payAmount, cin]
    );

    // 4. Update tax profile advance_tax_paid
    await client.query(
      `UPDATE tax_profiles 
       SET advance_tax_paid = advance_tax_paid + $1, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2`,
      [payAmount, userId]
    );

    // 5. Record transaction
    await client.query(
      `INSERT INTO transactions (user_id, name, amount, category, status, notes)
       VALUES ($1, $2, $3, 'Taxes & Government', 'success', $4)`,
      [
        userId,
        `Income Tax Department - Challan 280`,
        payAmount,
        `Advance Tax payment for FY 2025-26 (AY 2026-27). Challan: ${challanNo}`,
      ]
    );

    // 6. Push notification
    await client.query(
      `INSERT INTO notifications (user_id, title, message)
       VALUES ($1, '🏛️ Tax Challan 280 Generated', $2)`,
      [
        userId,
        `Advance Tax payment of ₹${payAmount.toLocaleString("en-IN")} successful! CIN: ${cin}. Challan saved to Tax Hub.`,
      ]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "Advance tax paid successfully! Challan 280 generated.",
      challan: challanRes.rows[0],
      newBalance: parseFloat(updatedUserRes.rows[0].balance),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Pay tax error:", error);
    res.status(500).json({ message: "Failed to process tax payment", error: error.message });
  } finally {
    client.release();
  }
});

export default router;
