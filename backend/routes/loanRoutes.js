import express from "express";
import pool from "../db.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// Helper: Calculate reducing balance monthly EMI
function calculateEmi(principal, annualRate, tenureMonths) {
  const monthlyRate = annualRate / 12 / 100;
  if (monthlyRate === 0) return Math.round(principal / tenureMonths);
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  return Math.round((principal * monthlyRate * factor) / (factor - 1));
}

// @route   GET /api/loans/summary
// @desc    Get user credit score, pre-approved credit line, active borrowings & stats
// @access  Private
router.get("/summary", protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Fetch user profile
    const userRes = await pool.query(
      "SELECT id, name, email, balance, is_kyc_verified, credit_score FROM users WHERE id = $1",
      [userId]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const user = userRes.rows[0];

    // 2. Fetch active loan aggregates
    const statsRes = await pool.query(
      `SELECT 
         COUNT(*) FILTER (WHERE status = 'active') as active_count,
         COUNT(*) FILTER (WHERE status = 'closed') as closed_count,
         COALESCE(SUM(remaining_amount) FILTER (WHERE status = 'active'), 0) as total_debt,
         COALESCE(SUM(principal_amount), 0) as total_borrowed
       FROM loans 
       WHERE user_id = $1`,
      [userId]
    );

    const activeCount = parseInt(statsRes.rows[0].active_count || 0);
    const closedCount = parseInt(statsRes.rows[0].closed_count || 0);
    const totalDebt = parseFloat(statsRes.rows[0].total_debt || 0);
    const totalBorrowed = parseFloat(statsRes.rows[0].total_borrowed || 0);

    // Dynamic pre-approved limit based on KYC
    const preApprovedLimit = user.is_kyc_verified ? 500000 : 150000;
    const availableLimit = Math.max(0, preApprovedLimit - totalDebt);

    // 3. Next upcoming EMI
    const nextDueRes = await pool.query(
      `SELECT id, loan_account_no, emi_amount, next_emi_date, purpose
       FROM loans 
       WHERE user_id = $1 AND status = 'active'
       ORDER BY next_emi_date ASC 
       LIMIT 1`,
      [userId]
    );

    res.json({
      creditScore: user.credit_score || 782,
      bureauRating: (user.credit_score || 782) >= 750 ? "Excellent" : (user.credit_score || 782) >= 650 ? "Good" : "Fair",
      preApprovedLimit,
      availableLimit,
      totalDebt,
      totalBorrowed,
      activeLoansCount: activeCount,
      closedLoansCount: closedCount,
      isKycVerified: Boolean(user.is_kyc_verified),
      nextDue: nextDueRes.rows[0] || null,
      balance: parseFloat(user.balance),
    });
  } catch (error) {
    console.error("Loan summary error:", error);
    res.status(500).json({ message: "Failed to fetch credit line summary", error: error.message });
  }
});

// @route   GET /api/loans
// @desc    List all personal loans for the logged-in user
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const loansRes = await pool.query(
      `SELECT id, loan_account_no, principal_amount, tenure_months, interest_rate,
              emi_amount, total_payable, remaining_amount, emis_paid, total_emis,
              purpose, status, next_emi_date, disbursed_at, closed_at, created_at
       FROM loans 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json(loansRes.rows);
  } catch (error) {
    console.error("Fetch loans error:", error);
    res.status(500).json({ message: "Failed to fetch loans", error: error.message });
  }
});

// @route   POST /api/loans/apply
// @desc    Instant pre-approved loan application & immediate wallet disbursal
// @access  Private
router.post("/apply", protect, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const { amount, tenureMonths, purpose = "Personal Expense" } = req.body;

    const principal = parseFloat(amount);
    const tenure = parseInt(tenureMonths);

    if (isNaN(principal) || principal < 10000 || principal > 500000) {
      return res.status(400).json({ message: "Loan amount must be between ₹10,000 and ₹5,00,000." });
    }

    const validTenures = [3, 6, 9, 12, 18, 24, 36];
    if (!validTenures.includes(tenure)) {
      return res.status(400).json({ message: "Please select a valid tenure (3, 6, 9, 12, 18, 24, or 36 months)." });
    }

    await client.query("BEGIN");

    // Fetch user and verify credit limit
    const userRes = await client.query("SELECT * FROM users WHERE id = $1 FOR UPDATE", [userId]);
    if (userRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "User not found" });
    }
    const user = userRes.rows[0];

    const maxLimit = user.is_kyc_verified ? 500000 : 150000;

    const debtRes = await client.query(
      "SELECT COALESCE(SUM(remaining_amount), 0) as current_debt FROM loans WHERE user_id = $1 AND status = 'active'",
      [userId]
    );
    const currentDebt = parseFloat(debtRes.rows[0].current_debt || 0);

    if (currentDebt + principal > maxLimit) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: `Exceeds your approved credit limit. Available: ₹${(maxLimit - currentDebt).toLocaleString("en-IN")}. Complete DigiLocker KYC to increase limit to ₹5,00,000.`,
      });
    }

    // Standard interest rate: 11.49% p.a.
    const interestRate = 11.49;
    const emiAmount = calculateEmi(principal, interestRate, tenure);
    const totalPayable = emiAmount * tenure;
    const loanAccountNo = `LN-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    // 1. Credit funds directly to user account balance
    const updatedUserRes = await client.query(
      "UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance",
      [principal, userId]
    );

    // 2. Insert transaction record
    await client.query(
      `INSERT INTO transactions (user_id, name, amount, category, status, notes)
       VALUES ($1, $2, $3, 'Loan Disbursal', 'success', $4)`,
      [
        userId,
        `Credit Line Disbursal - ${loanAccountNo}`,
        principal,
        `Pre-Approved Personal Loan for ${purpose}. Tenure: ${tenure} months @ ${interestRate}% p.a.`,
      ]
    );

    // 3. Insert Loan record
    const loanInsertRes = await client.query(
      `INSERT INTO loans (
         user_id, loan_account_no, principal_amount, tenure_months, interest_rate,
         emi_amount, total_payable, remaining_amount, emis_paid, total_emis,
         purpose, status, next_emi_date, disbursed_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10, 'active', CURRENT_DATE + INTERVAL '1 month', CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        userId,
        loanAccountNo,
        principal,
        tenure,
        interestRate,
        emiAmount,
        totalPayable,
        totalPayable, // initial remaining is total payable
        tenure,
        purpose,
      ]
    );

    // 4. Create notification
    await client.query(
      `INSERT INTO notifications (user_id, title, message)
       VALUES ($1, '⚡ Instant Credit Disbursed', $2)`,
      [
        userId,
        `₹${principal.toLocaleString("en-IN")} credited directly to your bank account! Monthly EMI: ₹${emiAmount.toLocaleString("en-IN")}. Loan A/C: ${loanAccountNo}.`,
      ]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "Loan disbursed instantly to your bank account!",
      loan: loanInsertRes.rows[0],
      newBalance: parseFloat(updatedUserRes.rows[0].balance),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Loan application error:", error);
    res.status(500).json({ message: "Failed to disburse loan", error: error.message });
  } finally {
    client.release();
  }
});

// @route   POST /api/loans/:id/pay-emi
// @desc    Repay 1 monthly EMI for an active loan
// @access  Private
router.post("/:id/pay-emi", protect, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const loanId = req.params.id;

    await client.query("BEGIN");

    // Fetch loan
    const loanRes = await client.query(
      "SELECT * FROM loans WHERE id = $1 AND user_id = $2 FOR UPDATE",
      [loanId, userId]
    );
    if (loanRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Loan account not found." });
    }
    const loan = loanRes.rows[0];

    if (loan.status !== "active") {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "This loan is already fully settled and closed." });
    }

    const emiAmount = Math.min(parseFloat(loan.remaining_amount), parseFloat(loan.emi_amount));

    // Check user balance
    const userRes = await client.query("SELECT balance, credit_score FROM users WHERE id = $1 FOR UPDATE", [userId]);
    const currentBalance = parseFloat(userRes.rows[0].balance);

    if (currentBalance < emiAmount) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: `Insufficient bank balance. You need ₹${emiAmount.toLocaleString("en-IN")} to pay this EMI. Current balance: ₹${currentBalance.toLocaleString("en-IN")}.`,
      });
    }

    // Deduct EMI from bank balance
    const updatedUserRes = await client.query(
      "UPDATE users SET balance = balance - $1, credit_score = LEAST(900, credit_score + 3) WHERE id = $2 RETURNING balance, credit_score",
      [emiAmount, userId]
    );

    // Calculate updated loan state
    const newEmisPaid = loan.emis_paid + 1;
    const newRemaining = Math.max(0, parseFloat(loan.remaining_amount) - emiAmount);
    const isClosed = newEmisPaid >= loan.total_emis || newRemaining <= 0;
    const newStatus = isClosed ? "closed" : "active";

    const updatedLoanRes = await client.query(
      `UPDATE loans 
       SET emis_paid = $1,
           remaining_amount = $2,
           next_emi_date = CASE WHEN $3 = 'closed' THEN next_emi_date ELSE next_emi_date + INTERVAL '1 month' END,
           status = $3,
           closed_at = CASE WHEN $3 = 'closed' THEN CURRENT_TIMESTAMP ELSE NULL END
       WHERE id = $4
       RETURNING *`,
      [newEmisPaid, newRemaining, newStatus, loanId]
    );

    // Record repayment entry
    const monthlyRate = parseFloat(loan.interest_rate) / 12 / 100;
    const interestComp = Math.round(parseFloat(loan.remaining_amount) * monthlyRate);
    const principalComp = Math.max(0, emiAmount - interestComp);
    const txRef = `EMI-${Date.now().toString().slice(-8)}`;

    await client.query(
      `INSERT INTO loan_repayments (loan_id, user_id, emi_number, amount, principal_component, interest_component, payment_type, transaction_ref)
       VALUES ($1, $2, $3, $4, $5, $6, 'emi', $7)`,
      [loanId, userId, newEmisPaid, emiAmount, principalComp, interestComp, txRef]
    );

    // Record general transaction
    await client.query(
      `INSERT INTO transactions (user_id, name, amount, category, status, notes)
       VALUES ($1, $2, $3, 'Loan EMI', 'success', $4)`,
      [
        userId,
        `EMI Payment #${newEmisPaid} - ${loan.loan_account_no}`,
        emiAmount,
        `Monthly repayment for ${loan.purpose}. Remaining: ₹${newRemaining.toLocaleString("en-IN")}`,
      ]
    );

    // Notification
    const notifMsg = isClosed
      ? `🎉 Congratulations! Loan ${loan.loan_account_no} is 100% PAID OFF and officially CLOSED. Your CIBIL score increased!`
      : `✅ EMI #${newEmisPaid} of ₹${emiAmount.toLocaleString("en-IN")} debited successfully for ${loan.loan_account_no}. Next due: ${new Date(updatedLoanRes.rows[0].next_emi_date).toLocaleDateString("en-IN")}.`;

    await client.query(
      `INSERT INTO notifications (user_id, title, message)
       VALUES ($1, $2, $3)`,
      [userId, isClosed ? "🎉 Loan Fully Closed!" : "EMI Paid Successfully", notifMsg]
    );

    await client.query("COMMIT");

    res.json({
      message: isClosed ? "Loan fully repaid and closed!" : "EMI paid successfully!",
      loan: updatedLoanRes.rows[0],
      newBalance: parseFloat(updatedUserRes.rows[0].balance),
      newCreditScore: updatedUserRes.rows[0].credit_score,
      isClosed,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Pay EMI error:", error);
    res.status(500).json({ message: "Failed to process EMI payment", error: error.message });
  } finally {
    client.release();
  }
});

// @route   POST /api/loans/:id/foreclose
// @desc    Foreclose loan in full with 0 pre-payment penalty
// @access  Private
router.post("/:id/foreclose", protect, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const loanId = req.params.id;

    await client.query("BEGIN");

    const loanRes = await client.query(
      "SELECT * FROM loans WHERE id = $1 AND user_id = $2 FOR UPDATE",
      [loanId, userId]
    );
    if (loanRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Loan account not found." });
    }
    const loan = loanRes.rows[0];

    if (loan.status !== "active") {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Loan is already closed." });
    }

    const payAmount = parseFloat(loan.remaining_amount);

    const userRes = await client.query("SELECT balance, credit_score FROM users WHERE id = $1 FOR UPDATE", [userId]);
    const currentBalance = parseFloat(userRes.rows[0].balance);

    if (currentBalance < payAmount) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: `Insufficient balance for full foreclosure. Required: ₹${payAmount.toLocaleString("en-IN")}, Available: ₹${currentBalance.toLocaleString("en-IN")}.`,
      });
    }

    // Deduct full remaining balance
    const updatedUserRes = await client.query(
      "UPDATE users SET balance = balance - $1, credit_score = LEAST(900, credit_score + 10) WHERE id = $2 RETURNING balance, credit_score",
      [payAmount, userId]
    );

    // Update loan to closed
    const updatedLoanRes = await client.query(
      `UPDATE loans 
       SET remaining_amount = 0,
           emis_paid = total_emis,
           status = 'closed',
           closed_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [loanId]
    );

    const txRef = `FCL-${Date.now().toString().slice(-8)}`;

    // Record repayment
    await client.query(
      `INSERT INTO loan_repayments (loan_id, user_id, emi_number, amount, principal_component, interest_component, payment_type, transaction_ref)
       VALUES ($1, $2, $3, $4, $4, 0, 'foreclosure', $5)`,
      [loanId, userId, loan.total_emis, payAmount, txRef]
    );

    // Transaction
    await client.query(
      `INSERT INTO transactions (user_id, name, amount, category, status, notes)
       VALUES ($1, $2, $3, 'Loan EMI', 'success', $4)`,
      [
        userId,
        `Foreclosure - ${loan.loan_account_no}`,
        payAmount,
        `Full settlement with 0% foreclosure charges. All debt cleared.`,
      ]
    );

    // Notification
    await client.query(
      `INSERT INTO notifications (user_id, title, message)
       VALUES ($1, '🏆 Debt Cleared & Loan Foreclosed', $2)`,
      [
        userId,
        `Your loan ${loan.loan_account_no} of ₹${parseFloat(loan.principal_amount).toLocaleString("en-IN")} is completely cleared! CIBIL score boosted +10 points.`,
      ]
    );

    await client.query("COMMIT");

    res.json({
      message: "Loan foreclosed successfully! 0% penalty applied.",
      loan: updatedLoanRes.rows[0],
      newBalance: parseFloat(updatedUserRes.rows[0].balance),
      newCreditScore: updatedUserRes.rows[0].credit_score,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Foreclosure error:", error);
    res.status(500).json({ message: "Failed to foreclose loan", error: error.message });
  } finally {
    client.release();
  }
});

// @route   GET /api/loans/:id/schedule
// @desc    Get detailed month-by-month repayment schedule & amortization table
// @access  Private
router.get("/:id/schedule", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const loanId = req.params.id;

    const loanRes = await pool.query(
      "SELECT * FROM loans WHERE id = $1 AND user_id = $2",
      [loanId, userId]
    );
    if (loanRes.rows.length === 0) {
      return res.status(404).json({ message: "Loan not found" });
    }
    const loan = loanRes.rows[0];

    // Fetch actual repayments done
    const repaymentsRes = await pool.query(
      "SELECT * FROM loan_repayments WHERE loan_id = $1 ORDER BY emi_number ASC",
      [loanId]
    );
    const repaymentsMap = {};
    repaymentsRes.rows.forEach((r) => {
      repaymentsMap[r.emi_number] = r;
    });

    const schedule = [];
    const monthlyRate = parseFloat(loan.interest_rate) / 12 / 100;
    let balance = parseFloat(loan.principal_amount);
    const emi = parseFloat(loan.emi_amount);
    const startDate = new Date(loan.disbursed_at);

    for (let i = 1; i <= loan.total_emis; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      const interestComp = Math.round(balance * monthlyRate);
      const principalComp = Math.min(balance, Math.round(emi - interestComp));
      balance = Math.max(0, balance - principalComp);

      const isPaid = i <= loan.emis_paid || loan.status === "closed";
      const actualPayment = repaymentsMap[i] || null;

      schedule.push({
        emiNumber: i,
        dueDate: dueDate.toISOString().split("T")[0],
        emiAmount: emi,
        principalComponent: principalComp,
        interestComponent: interestComp,
        remainingBalance: balance,
        status: isPaid ? "Paid" : "Upcoming",
        paidAt: actualPayment ? actualPayment.paid_at : null,
        transactionRef: actualPayment ? actualPayment.transaction_ref : null,
      });
    }

    res.json({
      loan,
      schedule,
    });
  } catch (error) {
    console.error("Amortization schedule error:", error);
    res.status(500).json({ message: "Failed to generate schedule", error: error.message });
  }
});

// @route   GET /api/loans/:id/noc
// @desc    Generate digital No Objection Certificate (NOC) for closed loans
// @access  Private
router.get("/:id/noc", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const loanId = req.params.id;

    const loanRes = await pool.query(
      `SELECT l.*, u.name as borrower_name, u.email as borrower_email, u.phone as borrower_phone
       FROM loans l
       JOIN users u ON l.user_id = u.id
       WHERE l.id = $1 AND l.user_id = $2`,
      [loanId, userId]
    );

    if (loanRes.rows.length === 0) {
      return res.status(404).json({ message: "Loan record not found." });
    }
    const loan = loanRes.rows[0];

    if (loan.status !== "closed") {
      return res.status(400).json({
        message: "No Objection Certificate can only be generated for completely closed loans.",
      });
    }

    res.json({
      certificateId: `NOC-${loan.loan_account_no}-${new Date().getFullYear()}`,
      loanAccountNo: loan.loan_account_no,
      borrowerName: loan.borrower_name,
      borrowerEmail: loan.borrower_email,
      borrowerPhone: loan.borrower_phone,
      principalAmount: parseFloat(loan.principal_amount),
      totalRepaid: parseFloat(loan.total_payable),
      disbursedDate: loan.disbursed_at,
      closedDate: loan.closed_at || loan.created_at,
      lenderName: "Apex NeoBank Ltd. (RBI Regulated NBFC-P2P)",
      status: "FULL_AND_FINAL_SETTLEMENT",
      issuedAt: new Date().toISOString(),
      authorizedSignatory: "Chief Credit Risk Officer, Apex NeoBank",
    });
  } catch (error) {
    console.error("NOC error:", error);
    res.status(500).json({ message: "Failed to generate NOC", error: error.message });
  }
});

export default router;
