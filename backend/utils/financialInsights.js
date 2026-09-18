import pool from "../db.js";

/**
 * Aggregates user's financial metrics strictly for the authenticated userId.
 * Performs deterministic SQL calculations without exposing raw database tables or executing dynamic queries.
 */
export async function getUserFinancialMetrics(userId) {
  // 1. Fetch user's current balance
  const userRes = await pool.query(
    "SELECT id, name, email, balance FROM users WHERE id = $1",
    [userId]
  );
  if (userRes.rows.length === 0) {
    throw new Error("User not found");
  }
  const user = userRes.rows[0];
  const balance = Number(user.balance || 0);

  // 2. Date calculations for current month and previous month
  const now = new Date();
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).toISOString();

  // 3. Current Month Outflow & Inflow
  const currentMonthTxRes = await pool.query(
    `SELECT 
       COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS income,
       COALESCE(ABS(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END)), 0) AS expense,
       COUNT(*) AS total_count
     FROM transactions
     WHERE user_id = $1 AND created_at >= $2`,
    [userId, startOfCurrentMonth]
  );

  const currentIncome = Number(currentMonthTxRes.rows[0]?.income || 0);
  const currentExpense = Number(currentMonthTxRes.rows[0]?.expense || 0);
  const currentCount = Number(currentMonthTxRes.rows[0]?.total_count || 0);

  // 4. Last Month Outflow & Inflow
  const lastMonthTxRes = await pool.query(
    `SELECT 
       COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS income,
       COALESCE(ABS(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END)), 0) AS expense
     FROM transactions
     WHERE user_id = $1 AND created_at >= $2 AND created_at <= $3`,
    [userId, startOfLastMonth, endOfLastMonth]
  );

  const lastMonthIncome = Number(lastMonthTxRes.rows[0]?.income || 0);
  const lastMonthExpense = Number(lastMonthTxRes.rows[0]?.expense || 0);

  // Month-over-month expense change percentage
  let momExpenseChangePct = 0;
  if (lastMonthExpense > 0) {
    momExpenseChangePct = Math.round(((currentExpense - lastMonthExpense) / lastMonthExpense) * 100);
  }

  // 5. Current month top spending categories / merchants
  const categoriesRes = await pool.query(
    `SELECT 
       name,
       ABS(SUM(amount)) AS total_spent,
       COUNT(*) as frequency
     FROM transactions
     WHERE user_id = $1 AND amount < 0 AND created_at >= $2
     GROUP BY name
     ORDER BY total_spent DESC
     LIMIT 5`,
    [userId, startOfCurrentMonth]
  );

  const topCategories = categoriesRes.rows.map((row) => ({
    category: row.name,
    amount: Number(row.total_spent),
    count: Number(row.frequency),
    percentageOfMonthlyExpense: currentExpense > 0 
      ? Math.round((Number(row.total_spent) / currentExpense) * 100) 
      : 0,
  }));

  // 6. Top 3 largest individual expenses this month
  const largestTxRes = await pool.query(
    `SELECT name, ABS(amount) as amount, created_at
     FROM transactions
     WHERE user_id = $1 AND amount < 0 AND created_at >= $2
     ORDER BY ABS(amount) DESC
     LIMIT 3`,
    [userId, startOfCurrentMonth]
  );

  const largestExpenses = largestTxRes.rows.map((row) => ({
    name: row.name,
    amount: Number(row.amount),
    date: new Date(row.created_at).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    }),
  }));

  // 7. Recent 5 transactions overview
  const recentTxRes = await pool.query(
    `SELECT name, amount, status, created_at
     FROM transactions
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 5`,
    [userId]
  );

  const recentTransactions = recentTxRes.rows.map((row) => ({
    name: row.name,
    amount: Number(row.amount),
    type: Number(row.amount) >= 0 ? "credit" : "debit",
    date: new Date(row.created_at).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    }),
  }));

  // 8. User's active savings vaults
  const vaultsRes = await pool.query(
    `SELECT name, target_amount, current_amount
     FROM vaults
     WHERE user_id = $1
     ORDER BY current_amount DESC
     LIMIT 3`,
    [userId]
  );

  const vaults = vaultsRes.rows.map((v) => ({
    name: v.name,
    target: Number(v.target_amount),
    saved: Number(v.current_amount),
    progressPct: Number(v.target_amount) > 0 ? Math.round((Number(v.current_amount) / Number(v.target_amount)) * 100) : 0,
  }));

  return {
    userName: user.name,
    currentBalance: balance,
    thisMonth: {
      income: currentIncome,
      expense: currentExpense,
      netFlow: currentIncome - currentExpense,
      txCount: currentCount,
    },
    lastMonth: {
      income: lastMonthIncome,
      expense: lastMonthExpense,
    },
    momExpenseChangePct,
    topCategories,
    largestExpenses,
    recentTransactions,
    vaults,
  };
}
