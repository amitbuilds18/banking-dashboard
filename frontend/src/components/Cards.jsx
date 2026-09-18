import { useEffect, useState } from "react";
import {
  FaWallet,
  FaArrowUp,
  FaArrowDown,
  FaPiggyBank,
  FaEye,
  FaEyeSlash,
  FaCalendarAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaChartPie,
} from "react-icons/fa";
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
  const [hideBalance, setHideBalance] = useState(false);

  const hasBudget = Number(budget.budget) > 0;
  const percentage = Number(budget.percentage) || 0;

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [summaryRes, budgetRes] = await Promise.allSettled([
          API.get("/transactions/summary"),
          API.get("/budget"),
        ]);

        if (!isMounted) return;

        if (summaryRes.status === "fulfilled" && !summaryRes.value.data.error) {
          setData(summaryRes.value.data);
        }

        if (budgetRes.status === "fulfilled" && !budgetRes.value.data.error) {
          setBudget(budgetRes.value.data);
        }

        setError("");
      } catch (err) {
        console.error("Dashboard metrics error:", err);
        if (isMounted) {
          setError("Unable to load dashboard summary. Please refresh.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  if (error && !loading) {
    return (
      <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-semibold text-red-300">
        {error}
      </div>
    );
  }

  const formatAmount = (val) => {
    if (hideBalance) return "••••••••";
    return `₹${Number(val || 0).toLocaleString("en-IN")}`;
  };

  return (
    <div className="space-y-6">
      {/* 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Available Balance */}
        <div className="group relative overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-900/85 p-5 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-cyan-500/40 hover:shadow-cyan-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-600 to-cyan-400 text-white shadow-lg shadow-blue-500/20">
                <FaWallet className="text-lg" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
                  Total Liquid
                </span>
                <h4 className="text-xs font-semibold text-slate-400">Available Balance</h4>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setHideBalance((prev) => !prev)}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
              title={hideBalance ? "Reveal balance" : "Hide balance"}
              aria-label={hideBalance ? "Reveal balance" : "Hide balance"}
            >
              {hideBalance ? <FaEyeSlash className="text-sm" /> : <FaEye className="text-sm" />}
            </button>
          </div>

          <div className="mt-4">
            {loading ? (
              <div className="h-8 w-36 animate-pulse rounded-lg bg-slate-800" />
            ) : (
              <p className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                {formatAmount(data.balance)}
              </p>
            )}
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" /> Main Wallet
              </span>
              <span className="text-[11px] text-slate-500">Live account</span>
            </div>
          </div>
        </div>

        {/* Card 2: Inflow / Income */}
        <div className="group relative overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-900/85 p-5 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-emerald-500/40 hover:shadow-emerald-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
                <FaArrowUp className="text-lg" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
                  Inbound
                </span>
                <h4 className="text-xs font-semibold text-slate-400">Total Income</h4>
              </div>
            </div>
          </div>

          <div className="mt-4">
            {loading ? (
              <div className="h-8 w-36 animate-pulse rounded-lg bg-slate-800" />
            ) : (
              <p className="text-2xl font-black tracking-tight text-emerald-400 sm:text-3xl">
                {formatAmount(data.income)}
              </p>
            )}
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/20">
                Credits & Transfers
              </span>
              <span className="text-[11px] text-slate-500">All deposits</span>
            </div>
          </div>
        </div>

        {/* Card 3: Outflow / Expense */}
        <div className="group relative overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-900/85 p-5 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-rose-500/40 hover:shadow-rose-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/20">
                <FaArrowDown className="text-lg" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-400">
                  Outbound
                </span>
                <h4 className="text-xs font-semibold text-slate-400">Total Outflow</h4>
              </div>
            </div>
          </div>

          <div className="mt-4">
            {loading ? (
              <div className="h-8 w-36 animate-pulse rounded-lg bg-slate-800" />
            ) : (
              <p className="text-2xl font-black tracking-tight text-rose-400 sm:text-3xl">
                {formatAmount(data.expense)}
              </p>
            )}
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/20">
                Debits & Spends
              </span>
              <span className="text-[11px] text-slate-500">Expenses</span>
            </div>
          </div>
        </div>

        {/* Card 4: Automated Savings */}
        <div className="group relative overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-900/85 p-5 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-purple-500/40 hover:shadow-purple-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/20">
                <FaPiggyBank className="text-lg" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400">
                  Reserve
                </span>
                <h4 className="text-xs font-semibold text-slate-400">Target Savings</h4>
              </div>
            </div>
          </div>

          <div className="mt-4">
            {loading ? (
              <div className="h-8 w-36 animate-pulse rounded-lg bg-slate-800" />
            ) : (
              <p className="text-2xl font-black tracking-tight text-purple-300 sm:text-3xl">
                {formatAmount(data.savings)}
              </p>
            )}
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-500/20">
                40% Reserve Ratio
              </span>
              <span className="text-[11px] text-slate-500">Safe buffer</span>
            </div>
          </div>
        </div>
      </div>

      {/* Executive Monthly Budget Velocity Widget */}
      <div className="rounded-3xl border border-slate-700/80 bg-slate-900/85 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20">
              <FaCalendarAlt className="text-base" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
                Spending Velocity
              </span>
              <h3 className="text-base font-bold text-white">Monthly Budget & Burn Pace</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasBudget ? (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                  percentage >= 100
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    : percentage >= 80
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                }`}
              >
                {percentage >= 100 ? (
                  <>
                    <FaExclamationTriangle /> Budget Exceeded ({percentage}%)
                  </>
                ) : percentage >= 80 ? (
                  <>
                    <FaExclamationTriangle /> 80%+ Consumed ({percentage}%)
                  </>
                ) : (
                  <>
                    <FaCheckCircle /> Budget Healthy ({percentage}%)
                  </>
                )}
              </span>
            ) : (
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-400 border border-slate-700">
                Tracking Default
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="mt-4 h-16 animate-pulse rounded-2xl bg-slate-800" />
        ) : (
          <div className="mt-5 grid gap-5 md:grid-cols-12 md:items-center">
            {/* Left Metrics */}
            <div className="grid grid-cols-3 gap-3 md:col-span-8">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5">
                <span className="text-[11px] text-slate-400">Allocated Budget</span>
                <p className="mt-1 text-base font-bold text-white">
                  {formatAmount(budget.budget)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5">
                <span className="text-[11px] text-slate-400">Spent So Far</span>
                <p className="mt-1 text-base font-bold text-rose-400">
                  {formatAmount(budget.expense)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5">
                <span className="text-[11px] text-slate-400">Remaining</span>
                <p
                  className={`mt-1 text-base font-bold ${
                    Number(budget.remaining) >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {formatAmount(budget.remaining)}
                </p>
              </div>
            </div>

            {/* Right Meter */}
            <div className="md:col-span-4">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span>Usage Gauge</span>
                <span className="font-bold text-white">{percentage}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    percentage >= 100
                      ? "bg-gradient-to-r from-rose-500 to-red-600"
                      : percentage >= 80
                      ? "bg-gradient-to-r from-amber-500 to-orange-500"
                      : "bg-gradient-to-r from-emerald-500 to-cyan-500"
                  }`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400">
                {hasBudget
                  ? `${Math.max(0, 100 - percentage)}% allowance remaining for the month`
                  : "Set a monthly target to enforce automated spend limits"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}