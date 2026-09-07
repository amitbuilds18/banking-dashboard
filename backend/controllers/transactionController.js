import pool from "../db.js";
import AppError from "../utils/AppError.js";

// GET
export const getTransactions = async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT * FROM transactions WHERE user_id=$1 ORDER BY id DESC",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

// ADD
export const addTransaction = async (req, res, next) => {
  try {
    const { name, amount } = req.body;

    if (!name || amount === undefined) {
      throw new AppError(400, "Name and amount are required");
    }

    const result = await pool.query(
      "INSERT INTO transactions (name, amount, status, user_id) VALUES ($1,$2,$3,$4) RETURNING *",
      [name, amount, "success", req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// SUMMARY
export const getSummary = async (req, res, next) => {
  try {
    const incomeRes = await pool.query(
      "SELECT SUM(amount) FROM transactions WHERE amount > 0 AND user_id=$1",
      [req.user.id]
    );

    const expenseRes = await pool.query(
      "SELECT SUM(amount) FROM transactions WHERE amount < 0 AND user_id=$1",
      [req.user.id]
    );

    const income = Number(incomeRes.rows[0].sum) || 0;
    const expense = Number(expenseRes.rows[0].sum) || 0;

    res.json({
      balance: income + expense,
      income,
      expense: Math.abs(expense),
      savings: Math.floor((income + expense) * 0.4),
    });
  } catch (error) {
    next(error);
  }
};

// CHART
export const getChart = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT name, SUM(amount) as value
       FROM transactions
       WHERE amount < 0 AND user_id=$1
       GROUP BY name`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};