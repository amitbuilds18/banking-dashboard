import { useEffect, useState } from "react";
import API from "../services/api";

export default function Cards() {
  const [data, setData] = useState({
    balance: 0,
    income: 0,
    expense: 0,
    savings: 0,
  });

  const [budget, setBudget] = useState({
    budget: 0,
    expense: 0,
    remaining: 0,
    percentage: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const hasBudget = Number(budget.budget) > 0;
  const percentage = Number(budget.percentage) || 0;

  useEffect(() => {
    const loadData = async () => {
      try {
        const summaryRes = await API.get("/transactions/summary");
        const summary = summaryRes.data;

        if (!summary.error) {
          setData(summary);
        }

        const budgetRes = await API.get("/budget");
        const budgetData = budgetRes.data;

        if (!budgetData.error) {
          setBudget(budgetData);
        }

        setError("");
      } catch (err) {
        console.error(err);
        setError("Unable to load dashboard summary. Please refresh.");
      } finally {
        setLoading(false);
      }
    };

    loadData();

    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  if (error && !loading) {
    return (
      <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      <Card title="💰 Balance" value={data.balance} loading={loading} />
      <Card title="📈 Income" value={data.income} loading={loading} />
      <Card title="📉 Expense" value={data.expense} loading={loading} />
      <Card title="💵 Savings" value={data.savings} loading={loading} />

      <div className="bg-gray-800 p-4 rounded-xl">
        <h4 className="text-gray-400">📅 Monthly Budget</h4>

        {loading ? (
          <div className="h-6 bg-gray-700 rounded mt-2 animate-pulse"></div>
        ) : (
          <>
            <p className="text-2xl font-bold mt-2">
              ₹{Number(budget.budget).toLocaleString("en-IN")}
            </p>

            <p className="text-sm text-gray-400 mt-2">
              Spent ₹{Number(budget.expense).toLocaleString("en-IN")}
            </p>

            <p className={`text-sm ${hasBudget ? "text-green-400" : "text-slate-400"}`}>
              {hasBudget
                ? `Remaining ₹${Number(budget.remaining).toLocaleString("en-IN")}`
                : "No budget set yet"}
            </p>

            {hasBudget && (
              <>
                <div className="w-full h-3 bg-gray-700 rounded-full mt-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-700 ${
                      percentage >= 100
                        ? "bg-red-500"
                        : percentage >= 80
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    }`}
                    style={{
                      width: `${Math.min(percentage, 100)}%`,
                    }}
                  />
                </div>

                <p className="mt-2 text-sm">
                  {percentage >= 100 ? (
                    <span className="text-red-500">🔴 Budget Exceeded</span>
                  ) : percentage >= 80 ? (
                    <span className="text-yellow-400">🟡 Budget Almost Full</span>
                  ) : (
                    <span className="text-green-400">🟢 Budget Healthy</span>
                  )}
                </p>
              </>
            )}

            {!hasBudget && (
              <p className="mt-2 text-sm text-slate-400">Set a monthly budget to track spending.</p>
            )}
          </>
        )}
      </div>

      <div className="bg-gray-800 p-4 rounded-xl">
        <h4 className="text-gray-400">📊 Budget Used</h4>

        {loading ? (
          <div className="h-6 bg-gray-700 rounded mt-2 animate-pulse"></div>
        ) : (
          <>
            <p className="text-3xl font-bold mt-2">{hasBudget ? `${percentage}%` : "0%"}</p>
            <p className="text-gray-400 text-sm mt-2">{hasBudget ? "Monthly Usage" : "No Budget Set"}</p>
          </>
        )}
      </div>
    </div>
  );
}

function Card({ title, value, loading }) {

  return (

    <div className="bg-gray-800 p-4 rounded-xl hover:scale-105 transition-all">

      <h4 className="text-gray-400">
        {title}
      </h4>

      {loading ? (

        <div className="h-6 bg-gray-700 rounded mt-2 animate-pulse"></div>

      ) : (

        <p className="text-2xl font-bold mt-2">
          ₹{Number(value).toLocaleString("en-IN")}
        </p>

      )}

    </div>

  );

}