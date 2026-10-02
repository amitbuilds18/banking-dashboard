import express from "express";
import pool from "../db.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

export const DEFAULT_BUDGET_CATEGORIES = [
  { category: "Dining & Food", allocated_limit: 8000, icon: "🍔", color: "from-amber-500 to-orange-600" },
  { category: "Groceries", allocated_limit: 12000, icon: "🛒", color: "from-emerald-500 to-teal-600" },
  { category: "Shopping", allocated_limit: 7500, icon: "🛍️", color: "from-purple-500 to-pink-600" },
  { category: "Utility & Bills", allocated_limit: 5000, icon: "⚡", color: "from-blue-500 to-cyan-600" },
  { category: "Entertainment", allocated_limit: 3500, icon: "🎬", color: "from-indigo-500 to-purple-600" },
  { category: "Travel & Fuel", allocated_limit: 5000, icon: "🚗", color: "from-rose-500 to-red-600" },
  { category: "General", allocated_limit: 5000, icon: "📦", color: "from-slate-500 to-slate-700" },
];

// Helper to determine status based on percentage
function getBudgetStatus(percentage) {
  if (percentage >= 100) return "exceeded";
  if (percentage >= 75) return "warning";
  return "safe";
}

// ===========================================
// 1. GET OVERALL MONTH BUDGET (Backward compatible for Dashboard Cards)
// ===========================================
router.get("/", protect, async (req, res) => {
  try {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();

    // 1. Overall monthly budget
    const budgetResult = await pool.query(
      `SELECT monthly_budget FROM budgets WHERE user_id = $1 AND month = $2 AND year = $3`,
      [req.user.id, month, year]
    );

    let budget = budgetResult.rows.length > 0 ? Number(budgetResult.rows[0].monthly_budget) : 0;

    // If no general budget is set, check if category budgets exist and sum them
    if (budget === 0) {
      const catSum = await pool.query(
        `SELECT COALESCE(SUM(allocated_limit), 0) AS total FROM category_budgets WHERE user_id = $1 AND month = $2 AND year = $3`,
        [req.user.id, month, year]
      );
      budget = Number(catSum.rows[0].total);
    }

    // 2. Current Month Expense
    const expenseResult = await pool.query(
      `SELECT COALESCE(ABS(SUM(amount)), 0) AS expense
       FROM transactions
       WHERE user_id = $1
       AND amount < 0
       AND EXTRACT(MONTH FROM created_at) = $2
       AND EXTRACT(YEAR FROM created_at) = $3`,
      [req.user.id, month, year]
    );

    const expense = Number(expenseResult.rows[0].expense);
    const hasBudget = budget > 0;

    res.json({
      budget,
      expense,
      remaining: hasBudget ? Math.max(0, budget - expense) : 0,
      percentage: hasBudget ? Number(((expense / budget) * 100).toFixed(2)) : 0,
    });
  } catch (err) {
    console.error("Budget Fetch Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ===========================================
// 2. GET CATEGORY BUDGETS WITH LIVE EXPENSES & VELOCITY
// ===========================================
router.get("/categories", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // 1. Fetch user's category budgets
    let budgetRows = (
      await pool.query(
        `SELECT * FROM category_budgets WHERE user_id = $1 AND month = $2 AND year = $3 ORDER BY id ASC`,
        [userId, month, year]
      )
    ).rows;

    // Seed defaults if user has none
    if (budgetRows.length === 0) {
      for (const def of DEFAULT_BUDGET_CATEGORIES) {
        await pool.query(
          `INSERT INTO category_budgets (user_id, category, allocated_limit, month, year, icon, color)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (user_id, category, month, year) DO NOTHING`,
          [userId, def.category, def.allocated_limit, month, year, def.icon, def.color]
        );
      }
      budgetRows = (
        await pool.query(
          `SELECT * FROM category_budgets WHERE user_id = $1 AND month = $2 AND year = $3 ORDER BY id ASC`,
          [userId, month, year]
        )
      ).rows;
    }

    // 2. Fetch spending grouped by category for this month
    const expenseRows = (
      await pool.query(
        `SELECT category, COALESCE(ABS(SUM(amount)), 0) AS total_spent, COUNT(id) as count
         FROM transactions
         WHERE user_id = $1 AND amount < 0
         AND EXTRACT(MONTH FROM created_at) = $2
         AND EXTRACT(YEAR FROM created_at) = $3
         GROUP BY category`,
        [userId, month, year]
      )
    ).rows;

    // Map spending to category budgets
    const expenseMap = new Map();
    expenseRows.forEach((r) => {
      const normalizedCat = (r.category || "General").trim().toLowerCase();
      expenseMap.set(normalizedCat, Number(r.total_spent));
    });

    // Helper matcher
    const getSpentForCategory = (catName) => {
      const name = catName.trim().toLowerCase();
      let matched = 0;
      for (const [key, val] of expenseMap.entries()) {
        if (key.includes(name) || name.includes(key)) {
          matched += val;
        }
      }
      return matched;
    };

    // Calculate days and velocity
    const daysInMonth = new Date(year, month, 0).getDate();
    const currentDay = now.getDate();
    const daysRemaining = Math.max(1, daysInMonth - currentDay);

    const categoriesWithStats = budgetRows.map((b) => {
      const limit = Number(b.allocated_limit);
      const spent = getSpentForCategory(b.category);
      const remaining = Math.max(0, limit - spent);
      const percentage = limit > 0 ? Number(((spent / limit) * 100).toFixed(1)) : 0;
      const status = getBudgetStatus(percentage);
      const safeDailySpend = Number((remaining / daysRemaining).toFixed(0));

      return {
        id: b.id,
        category: b.category,
        allocated_limit: limit,
        spent,
        remaining,
        percentage,
        status,
        icon: b.icon || "📊",
        color: b.color || "from-blue-500 to-indigo-600",
        safeDailySpend,
      };
    });

    const totalAllocated = categoriesWithStats.reduce((sum, c) => sum + c.allocated_limit, 0);
    const totalSpent = categoriesWithStats.reduce((sum, c) => sum + c.spent, 0);
    const totalRemaining = Math.max(0, totalAllocated - totalSpent);
    const overallPercentage = totalAllocated > 0 ? Number(((totalSpent / totalAllocated) * 100).toFixed(1)) : 0;
    const overallDailyAllowance = Number((totalRemaining / daysRemaining).toFixed(0));

    // Overspending & Warning Counts
    const breachedCount = categoriesWithStats.filter((c) => c.status === "exceeded").length;
    const warningCount = categoriesWithStats.filter((c) => c.status === "warning").length;

    // Check & trigger smart alert notifications if threshold crossed
    for (const c of categoriesWithStats) {
      if (c.status === "exceeded") {
        // Check if an overspend notification already exists for this category this month
        const existingAlert = await pool.query(
          `SELECT id FROM notifications 
           WHERE user_id = $1 AND title LIKE $2 AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
          [userId, `%Budget Exceeded: ${c.category}%`]
        );
        if (existingAlert.rows.length === 0) {
          await pool.query(
            `INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)`,
            [
              userId,
              `🚨 Budget Exceeded: ${c.category}`,
              `You have spent ₹${c.spent.toLocaleString("en-IN")} on ${c.category}, exceeding your limit of ₹${c.allocated_limit.toLocaleString("en-IN")} by ₹${(c.spent - c.allocated_limit).toLocaleString("en-IN")}!`,
            ]
          );
        }
      } else if (c.status === "warning") {
        const existingAlert = await pool.query(
          `SELECT id FROM notifications 
           WHERE user_id = $1 AND title LIKE $2 AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
          [userId, `%Budget Warning: ${c.category}%`]
        );
        if (existingAlert.rows.length === 0) {
          await pool.query(
            `INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)`,
            [
              userId,
              `⚠️ Budget Warning: ${c.category}`,
              `You have consumed ${c.percentage}% of your ${c.category} monthly budget (₹${c.spent.toLocaleString("en-IN")} / ₹${c.allocated_limit.toLocaleString("en-IN")}).`,
            ]
          );
        }
      }
    }

    res.json({
      success: true,
      month,
      year,
      monthName: now.toLocaleString("default", { month: "long" }),
      daysInMonth,
      currentDay,
      daysRemaining,
      summary: {
        totalAllocated,
        totalSpent,
        totalRemaining,
        overallPercentage,
        overallDailyAllowance,
        breachedCount,
        warningCount,
      },
      categories: categoriesWithStats,
    });
  } catch (err) {
    console.error("Fetch Category Budgets Error:", err);
    res.status(500).json({ error: "Failed to retrieve category budgets" });
  }
});

// ===========================================
// 3. SET OR UPDATE A CATEGORY BUDGET LIMIT
// ===========================================
router.post("/category", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, allocated_limit, icon, color } = req.body;

    const limit = Number(allocated_limit);
    if (!category || !limit || isNaN(limit) || limit <= 0) {
      return res.status(400).json({ error: "Valid category name and positive limit amount required" });
    }

    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();

    const result = await pool.query(
      `INSERT INTO category_budgets (user_id, category, allocated_limit, month, year, icon, color)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, category, month, year)
       DO UPDATE SET 
         allocated_limit = EXCLUDED.allocated_limit,
         icon = COALESCE(EXCLUDED.icon, category_budgets.icon),
         color = COALESCE(EXCLUDED.color, category_budgets.color)
       RETURNING *`,
      [
        userId,
        category.trim(),
        limit,
        month,
        year,
        icon || "📊",
        color || "from-blue-500 to-indigo-600",
      ]
    );

    res.json({
      success: true,
      message: `Budget limit for '${category}' updated to ₹${limit.toLocaleString("en-IN")}`,
      budget: result.rows[0],
    });
  } catch (err) {
    console.error("Save Category Budget Error:", err);
    res.status(500).json({ error: "Failed to update category budget" });
  }
});

// ===========================================
// 4. RESET OR DELETE A CATEGORY BUDGET
// ===========================================
router.delete("/category/:id", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const id = parseInt(req.params.id, 10);

    const result = await pool.query(
      `DELETE FROM category_budgets WHERE id = $1 AND user_id = $2 RETURNING category`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Category budget not found" });
    }

    res.json({
      success: true,
      message: `Budget for ${result.rows[0].category} deleted successfully.`,
    });
  } catch (err) {
    console.error("Delete Category Budget Error:", err);
    res.status(500).json({ error: "Failed to delete category budget" });
  }
});

// ===========================================
// 5. UPDATE OVERALL MONTHLY BUDGET TARGET
// ===========================================
router.post("/", protect, async (req, res) => {
  try {
    const { monthly_budget } = req.body;
    if (!monthly_budget) {
      return res.status(400).json({ error: "Monthly budget is required" });
    }

    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();

    const existing = await pool.query(
      `SELECT id FROM budgets WHERE user_id = $1 AND month = $2 AND year = $3`,
      [req.user.id, month, year]
    );

    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE budgets SET monthly_budget = $1 WHERE user_id = $2 AND month = $3 AND year = $4`,
        [monthly_budget, req.user.id, month, year]
      );
      return res.json({ message: "Budget Updated Successfully" });
    }

    await pool.query(
      `INSERT INTO budgets (user_id, monthly_budget, month, year) VALUES ($1, $2, $3, $4)`,
      [req.user.id, monthly_budget, month, year]
    );

    res.json({ message: "Budget Added Successfully" });
  } catch (err) {
    console.error("Overall Budget Error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;