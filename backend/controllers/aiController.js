import { getUserFinancialMetrics } from "../utils/financialInsights.js";
import { answerFinancialQuery, generateSpendingSummary } from "../services/aiService.js";

/**
 * Handles conversational queries about the authenticated user's finances.
 * POST /api/ai/chat
 */
export async function chatWithAI(req, res) {
  try {
    const rawQuestion = req.body.question || req.body.message;

    if (!rawQuestion || typeof rawQuestion !== "string" || rawQuestion.trim().length === 0) {
      return res.status(400).json({ error: "Please provide a valid financial question." });
    }

    const question = rawQuestion.trim();
    if (question.length > 400) {
      return res.status(400).json({ error: "Question cannot exceed 400 characters." });
    }

    // Strictly aggregate financial metrics for the authenticated user only
    const userMetrics = await getUserFinancialMetrics(req.user.id);

    // Answer query using LLM or algorithmic fallback
    const reply = await answerFinancialQuery(userMetrics, question);

    res.json({
      reply,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("AI Chat Error:", error);
    res.status(500).json({ error: error.message || "Unable to process financial query at this time." });
  }
}

/**
 * Returns dynamic AI spending summary cards for dashboard display.
 * GET /api/ai/summary
 */
export async function getAISummary(req, res) {
  try {
    const userMetrics = await getUserFinancialMetrics(req.user.id);
    const summary = await generateSpendingSummary(userMetrics);

    res.json({
      summary,
      metrics: {
        currentBalance: userMetrics.currentBalance,
        monthlyExpense: userMetrics.thisMonth.expense,
        monthlyIncome: userMetrics.thisMonth.income,
        momChange: userMetrics.momExpenseChangePct,
        topCategory: userMetrics.topCategories[0] || null,
      },
    });
  } catch (error) {
    console.error("AI Summary Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate spending summary." });
  }
}
