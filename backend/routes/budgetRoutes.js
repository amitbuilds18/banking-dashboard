import express from "express";
import pool from "../db.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();


// ===========================================
// GET CURRENT MONTH BUDGET
// ===========================================

router.get("/", protect, async (req, res) => {
  try {

    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();

    // Budget
    const budgetResult = await pool.query(
      `
      SELECT monthly_budget
      FROM budgets
      WHERE user_id = $1
      AND month = $2
      AND year = $3
      `,
      [req.user.id, month, year]
    );

    const budget =
      budgetResult.rows.length > 0
        ? Number(budgetResult.rows[0].monthly_budget)
        : 0;

    // Current Month Expense
    const expenseResult = await pool.query(
      `
      SELECT
      COALESCE(ABS(SUM(amount)),0) AS expense

      FROM transactions

      WHERE user_id = $1
      AND amount < 0
      AND EXTRACT(MONTH FROM created_at) = $2
      AND EXTRACT(YEAR FROM created_at) = $3
      `,
      [req.user.id, month, year]
    );

    const expense = Number(expenseResult.rows[0].expense);
    const hasBudget = budget > 0;

    res.json({
      budget,
      expense,
      remaining: hasBudget ? budget - expense : 0,
      percentage: hasBudget ? Number(((expense / budget) * 100).toFixed(2)) : 0,
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message,
    });

  }
});


// ===========================================
// CREATE / UPDATE BUDGET
// ===========================================

router.post("/", protect, async (req, res) => {

  try {

    const { monthly_budget } = req.body;

    if (!monthly_budget) {

      return res.status(400).json({
        error: "Monthly budget is required",
      });

    }

    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();

    const existing = await pool.query(
      `
      SELECT id
      FROM budgets
      WHERE user_id = $1
      AND month = $2
      AND year = $3
      `,
      [req.user.id, month, year]
    );

    if (existing.rows.length > 0) {

      await pool.query(
        `
        UPDATE budgets

        SET monthly_budget = $1

        WHERE user_id = $2
        AND month = $3
        AND year = $4
        `,
        [
          monthly_budget,
          req.user.id,
          month,
          year,
        ]
      );

      return res.json({
        message: "Budget Updated Successfully",
      });

    }

    await pool.query(
      `
      INSERT INTO budgets
      (
        user_id,
        monthly_budget,
        month,
        year
      )

      VALUES
      ($1,$2,$3,$4)
      `,
      [
        req.user.id,
        monthly_budget,
        month,
        year,
      ]
    );

    res.json({
      message: "Budget Added Successfully",
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message,
    });

  }
});


// ===========================================
// DELETE CURRENT MONTH BUDGET
// ===========================================

router.delete("/", protect, async (req, res) => {

  try {

    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();

    await pool.query(
      `
      DELETE FROM budgets

      WHERE user_id = $1
      AND month = $2
      AND year = $3
      `,
      [
        req.user.id,
        month,
        year,
      ]
    );

    res.json({
      message: "Budget Deleted",
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message,
    });

  }
});

export default router;