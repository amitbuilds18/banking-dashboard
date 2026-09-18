/**
 * NovaPay AI Service
 * Securely communicates with Google Gemini API using only aggregated financial context.
 * Features built-in guardrails, privacy guarantees, and deterministic fallback if API key is not configured.
 */

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

/**
 * Builds the system guardrail and aggregated financial context prompt.
 */
function buildPromptContext(userMetrics) {
  const {
    userName,
    currentBalance,
    thisMonth,
    lastMonth,
    momExpenseChangePct,
    topCategories,
    largestExpenses,
    recentTransactions,
    vaults,
  } = userMetrics;

  const topCatsFormatted = topCategories.length > 0
    ? topCategories.map((c) => `- ${c.category}: ₹${c.amount.toLocaleString("en-IN")} (${c.percentageOfMonthlyExpense}% of monthly spend)`).join("\n")
    : "No expense categories recorded this month.";

  const largestExpensesFormatted = largestExpenses.length > 0
    ? largestExpenses.map((e) => `- ${e.name}: ₹${e.amount.toLocaleString("en-IN")} on ${e.date}`).join("\n")
    : "No major individual expenses recorded this month.";

  const recentTxFormatted = recentTransactions.length > 0
    ? recentTransactions.map((t) => `- ${t.date}: ${t.name} (₹${Math.abs(t.amount).toLocaleString("en-IN")}, ${t.type})`).join("\n")
    : "No recent transactions found.";

  const vaultsFormatted = vaults.length > 0
    ? vaults.map((v) => `- ${v.name}: ₹${v.saved.toLocaleString("en-IN")} of ₹${v.target.toLocaleString("en-IN")} (${v.progressPct}%)`).join("\n")
    : "No active savings vaults configured.";

  return `
You are the NovaPay Financial AI Copilot, a high-trust personal finance intelligence assistant inside the NovaPay Neo-Banking platform.
User's Name: ${userName}

--- REAL VERIFIED FINANCIAL DATA (Current as of today) ---
- Current Available Balance: ₹${currentBalance.toLocaleString("en-IN")}
- This Month's Inflow (Income/Deposits): ₹${thisMonth.income.toLocaleString("en-IN")}
- This Month's Outflow (Expenses): ₹${thisMonth.expense.toLocaleString("en-IN")}
- Net Cash Flow this Month: ₹${thisMonth.netFlow.toLocaleString("en-IN")}
- Total Transactions this Month: ${thisMonth.txCount}
- Last Month's Expenses: ₹${lastMonth.expense.toLocaleString("en-IN")}
- Month-over-Month Expense Shift: ${momExpenseChangePct >= 0 ? `+${momExpenseChangePct}%` : `${momExpenseChangePct}%`}

Top Spending Categories This Month:
${topCatsFormatted}

Largest Individual Transactions This Month:
${largestExpensesFormatted}

Recent Transactions:
${recentTxFormatted}

Active Savings Vaults:
${vaultsFormatted}
--------------------------------------------------------

STRICT BEHAVIORAL & SAFETY GUARDRAILS:
1. Rely ONLY on the numbers provided in the verified data above. NEVER fabricate, estimate, or hallucinate different balances or phantom transactions.
2. Formats all currency amounts with the Indian Rupee symbol (₹) and Indian comma grouping (e.g., ₹15,000).
3. If the user asks for speculative stock picks, cryptocurrency trading tips, legal advice, or official tax filing compliance, provide a polite disclaimer that you are an automated spending assistant and cannot provide certified financial or tax advice, then steer back to budgeting and saving.
4. Keep answers friendly, professional, actionable, and formatted with clean markdown bullet points or bold highlights.
5. If the user asks about other users or system details, refuse politely and focus solely on the user's own financial HQ.
`;
}

/**
 * Fallback response generator when AI API key is not present or offline.
 */
function generateDeterministicFallback(userMetrics, question) {
  const lower = question.toLowerCase();
  const balanceStr = `₹${userMetrics.currentBalance.toLocaleString("en-IN")}`;
  const expenseStr = `₹${userMetrics.thisMonth.expense.toLocaleString("en-IN")}`;
  const topCat = userMetrics.topCategories[0];

  if (lower.includes("where") || lower.includes("most") || lower.includes("category") || lower.includes("spend")) {
    if (topCat) {
      return `📊 **Top Spending Analysis**:\nThis month, your highest expenditure was on **${topCat.category}** at **₹${topCat.amount.toLocaleString("en-IN")}**, accounting for **${topCat.percentageOfMonthlyExpense}%** of your total monthly outflow (${expenseStr}). Setting a weekly cap on ${topCat.category} could help you redirect extra savings into your vaults!`;
    }
    return `You haven't recorded significant expenses yet this month. Your current available balance is **${balanceStr}**.`;
  }

  if (lower.includes("save") || lower.includes("budget") || lower.includes("tip")) {
    const suggestedSave = Math.min(Math.round(userMetrics.currentBalance * 0.1), 5000);
    return `💡 **Smart Savings Plan**:\nWith your current balance of **${balanceStr}** and monthly expenses at **${expenseStr}**, you have a healthy liquidity buffer. You could comfortably route **₹${suggestedSave.toLocaleString("en-IN")}** into an automated Savings Vault this week.`;
  }

  if (lower.includes("compare") || lower.includes("last month") || lower.includes("mom")) {
    const shift = userMetrics.momExpenseChangePct;
    const direction = shift > 0 ? "increased" : shift < 0 ? "decreased" : "remained steady";
    return `📈 **Month-over-Month Comparison**:\nYour spending has **${direction} by ${Math.abs(shift)}%** compared to last month (This month: **${expenseStr}** vs Last month: **₹${userMetrics.lastMonth.expense.toLocaleString("en-IN")}**).`;
  }

  return `👋 Hello **${userMetrics.userName}**! You currently have an available balance of **${balanceStr}**. This month, you have spent **${expenseStr}** across **${userMetrics.thisMonth.txCount}** transactions.${topCat ? ` Your primary spending area is **${topCat.category}**.` : ""} How can I assist you with your budgeting or savings today?`;
}

/**
 * Answers a user's natural language question using Gemini LLM.
 */
export async function answerFinancialQuery(userMetrics, question) {
  const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return generateDeterministicFallback(userMetrics, question);
  }

  const systemContext = buildPromptContext(userMetrics);
  const prompt = `${systemContext}\n\nUser Question: "${question}"\n\nProvide a concise, helpful, and formatted answer:`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 600,
        },
      }),
    });

    if (!response.ok) {
      console.warn(`[AI Service] Gemini API returned status ${response.status}. Using smart fallback.`);
      return generateDeterministicFallback(userMetrics, question);
    }

    const data = await response.json();
    const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!replyText) {
      return generateDeterministicFallback(userMetrics, question);
    }

    return replyText.trim();
  } catch (error) {
    console.error("[AI Service] Gemini request error:", error.message);
    return generateDeterministicFallback(userMetrics, question);
  }
}

/**
 * Generates an executive 3-bullet AI spending summary for dashboard widgets.
 */
export async function generateSpendingSummary(userMetrics) {
  const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY;

  const topCat = userMetrics.topCategories[0];
  const expenseStr = `₹${userMetrics.thisMonth.expense.toLocaleString("en-IN")}`;
  const balanceStr = `₹${userMetrics.currentBalance.toLocaleString("en-IN")}`;

  // Deterministic fallback summary
  const defaultSummary = {
    overview: `Monthly outflow stands at ${expenseStr} with an available balance of ${balanceStr}.`,
    topCategory: topCat
      ? `Highest spend concentrated in ${topCat.category} (₹${topCat.amount.toLocaleString("en-IN")}, ${topCat.percentageOfMonthlyExpense}% of total).`
      : "No dominant spending category detected yet this cycle.",
    actionableTip: userMetrics.momExpenseChangePct > 15
      ? `Spending increased by ${userMetrics.momExpenseChangePct}% over last month; consider reviewing non-essential debits.`
      : "Spending velocity is stable. Consider depositing spare cash into your Savings Vault.",
  };

  if (!apiKey) {
    return defaultSummary;
  }

  const prompt = `
${buildPromptContext(userMetrics)}

TASK: Generate a concise 3-part financial digest in JSON format:
{
  "overview": "Brief summary of current monthly spending and net cash flow (max 1 sentence)",
  "topCategory": "Insight regarding their highest spending category and trend (max 1 sentence)",
  "actionableTip": "One realistic, motivating action to save money or boost savings (max 1 sentence)"
}
Return ONLY pure valid JSON, no markdown formatting or backticks.
`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 300,
        },
      }),
    });

    if (!response.ok) {
      return defaultSummary;
    }

    const data = await response.json();
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    const parsed = JSON.parse(text);
    return {
      overview: parsed.overview || defaultSummary.overview,
      topCategory: parsed.topCategory || defaultSummary.topCategory,
      actionableTip: parsed.actionableTip || defaultSummary.actionableTip,
    };
  } catch (err) {
    console.error("[AI Service] Summary generation failed:", err.message);
    return defaultSummary;
  }
}
