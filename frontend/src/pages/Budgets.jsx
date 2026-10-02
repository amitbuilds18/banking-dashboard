import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import NotificationBell from "../components/NotificationBell";
import {
  FaChartPie,
  FaShieldAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaCalendarAlt,
  FaPlus,
  FaEdit,
  FaTrash,
  FaArrowRight,
  FaWallet,
  FaTimes,
  FaBolt,
  FaFire,
  FaRegLightbulb,
} from "react-icons/fa";

const API_BASE = "http://localhost:5000/api";

const PRESET_CATEGORIES = [
  { name: "Dining & Food", icon: "🍔", color: "from-amber-500 to-orange-600", defaultLimit: 8000 },
  { name: "Groceries", icon: "🛒", color: "from-emerald-500 to-teal-600", defaultLimit: 12000 },
  { name: "Shopping", icon: "🛍️", color: "from-purple-500 to-pink-600", defaultLimit: 7500 },
  { name: "Utility & Bills", icon: "⚡", color: "from-blue-500 to-cyan-600", defaultLimit: 5000 },
  { name: "Entertainment", icon: "🎬", color: "from-indigo-500 to-purple-600", defaultLimit: 3500 },
  { name: "Travel & Fuel", icon: "🚗", color: "from-rose-500 to-red-600", defaultLimit: 5000 },
  { name: "Health & Fitness", icon: "💊", color: "from-teal-500 to-emerald-600", defaultLimit: 4000 },
  { name: "General", icon: "📦", color: "from-slate-500 to-slate-700", defaultLimit: 5000 },
];

export default function Budgets() {
  const { user, token } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [budgetData, setBudgetData] = useState(null);

  // Modals & Forms
  const [editModal, setEditModal] = useState(null); // { category, limit, icon, color }
  const [savingLoading, setSavingLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch Category Budgets
  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/budget/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setBudgetData(res.data);
      }
    } catch (err) {
      console.error("Failed to load budgets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchBudgets();
    }
  }, [token]);

  // Handle Save / Update Category Limit
  const handleSaveBudget = async (e) => {
    e.preventDefault();
    if (!editModal.category || !editModal.limit || Number(editModal.limit) <= 0) {
      setErrorMessage("Please enter a valid positive budget amount.");
      return;
    }

    try {
      setSavingLoading(true);
      setErrorMessage(null);
      const res = await axios.post(
        `${API_BASE}/budget/category`,
        {
          category: editModal.category,
          allocated_limit: Number(editModal.limit),
          icon: editModal.icon,
          color: editModal.color,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setEditModal(null);
        showToast(res.data.message);
        fetchBudgets();
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.error || "Failed to update category budget.");
    } finally {
      setSavingLoading(false);
    }
  };

  // Handle Delete / Reset Category Budget
  const handleDeleteBudget = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove the budget for ${name}?`)) return;

    try {
      const res = await axios.delete(`${API_BASE}/budget/category/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        showToast(res.data.message);
        fetchBudgets();
      }
    } catch (err) {
      console.error("Failed to delete budget:", err);
    }
  };

  const summary = budgetData?.summary || {
    totalAllocated: 0,
    totalSpent: 0,
    totalRemaining: 0,
    overallPercentage: 0,
    overallDailyAllowance: 0,
    breachedCount: 0,
    warningCount: 0,
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-white selection:bg-cyan-500 selection:text-slate-950">
      {/* Sidebar Navigation */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transition-transform duration-200 md:static md:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onClose={() => setMobileMenuOpen(false)} />
      </div>

      {mobileMenuOpen && (
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/80 backdrop-blur-sm md:hidden"
          aria-label="Close mobile menu"
        />
      )}

      {/* Main Canvas */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Header Banner */}
          <header className="relative overflow-hidden rounded-3xl border border-slate-700/70 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950/90 p-6 shadow-2xl backdrop-blur-xl">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="rounded-2xl border border-slate-700 bg-slate-800/80 p-2.5 text-slate-300 transition hover:bg-slate-700 hover:text-white md:hidden"
                  aria-label="Open menu"
                >
                  ☰
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl text-white shadow-lg shadow-indigo-500/20">
                    <FaChartPie />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400">
                        Financial Discipline & Controls
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300">
                        <FaCalendarAlt className="text-xs" /> {budgetData?.monthName || "Active Month"}{" "}
                        {budgetData?.year || ""} • {budgetData?.daysRemaining || 0} Days Left
                      </span>
                    </div>
                    <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                      Monthly Budget Planner
                    </h1>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Category limits, live expense velocity, and proactive overspending alerts.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setEditModal({
                      category: "",
                      limit: 5000,
                      icon: "📊",
                      color: "from-blue-500 to-indigo-600",
                    })
                  }
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:brightness-110 active:scale-95"
                >
                  <FaPlus />
                  <span>Add Limit</span>
                </button>
                <NotificationBell />
              </div>
            </div>
          </header>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="flex items-center justify-between rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-4 text-emerald-300 shadow-xl backdrop-blur-md animate-fade-in">
              <div className="flex items-center gap-3">
                <FaCheckCircle className="text-xl text-emerald-400" />
                <span className="text-sm font-semibold">{toastMessage}</span>
              </div>
              <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
                <FaTimes />
              </button>
            </div>
          )}

          {/* Overspending Alerts Banner (if any) */}
          {summary.breachedCount > 0 && (
            <div className="flex items-center gap-4 rounded-3xl border border-rose-500/40 bg-rose-500/10 p-5 text-rose-300 shadow-2xl backdrop-blur-xl">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/20 text-2xl text-rose-400">
                <FaExclamationTriangle />
              </div>
              <div>
                <h3 className="text-base font-black text-white">
                  Budget Exceeded in {summary.breachedCount} {summary.breachedCount === 1 ? "Category" : "Categories"}!
                </h3>
                <p className="mt-0.5 text-xs text-rose-200/90 leading-relaxed">
                  You have surpassed your allocated monthly boundaries. Consider rebalancing limits or curbing non-essential spending for the remainder of this month.
                </p>
              </div>
            </div>
          )}

          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Total Monthly Budget</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                  <FaWallet />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-white">
                ₹{summary.totalAllocated.toLocaleString("en-IN")}
              </p>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                <span>Across {budgetData?.categories?.length || 0} Categories</span>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Total Spent This Month</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                  <FaFire />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-cyan-400">
                ₹{summary.totalSpent.toLocaleString("en-IN")}
              </p>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                <span className="font-bold text-white">{summary.overallPercentage}%</span>
                <span>of total budget used</span>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Remaining Safe Spend</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <FaShieldAlt />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-emerald-400">
                ₹{summary.totalRemaining.toLocaleString("en-IN")}
              </p>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                <span>Available to spend cleanly</span>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Daily Safe Velocity</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                  <FaBolt />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-amber-400">
                ₹{summary.overallDailyAllowance.toLocaleString("en-IN")}{" "}
                <span className="text-xs font-normal text-slate-400">/ day</span>
              </p>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                <span>Safe pace for remaining {budgetData?.daysRemaining || 0} days</span>
              </div>
            </div>
          </div>

          {/* Overall Consumption Progress Bar */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">Monthly Overall Consumption</span>
                <span className="text-xs text-slate-400">
                  (₹{summary.totalSpent.toLocaleString("en-IN")} / ₹{summary.totalAllocated.toLocaleString("en-IN")})
                </span>
              </div>
              <span
                className={`font-black ${
                  summary.overallPercentage >= 100
                    ? "text-rose-400"
                    : summary.overallPercentage >= 75
                    ? "text-amber-400"
                    : "text-emerald-400"
                }`}
              >
                {summary.overallPercentage}%
              </span>
            </div>
            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  summary.overallPercentage >= 100
                    ? "bg-gradient-to-r from-rose-500 to-red-600"
                    : summary.overallPercentage >= 75
                    ? "bg-gradient-to-r from-amber-500 to-yellow-500"
                    : "bg-gradient-to-r from-emerald-500 to-teal-400"
                }`}
                style={{ width: `${Math.min(100, summary.overallPercentage)}%` }}
              />
            </div>
          </div>

          {/* Category Budgets Grid */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-black text-white">Category Spending Limits</h2>
                <p className="text-xs text-slate-400">
                  Live expenditure breakdown and threshold health status
                </p>
              </div>
            </div>

            {loading ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-12 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent" />
                <p className="mt-3 text-sm text-slate-400">Loading your category budgets...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {budgetData?.categories?.map((cat) => {
                  const isBreached = cat.status === "exceeded";
                  const isWarning = cat.status === "warning";
                  const isSafe = cat.status === "safe";

                  return (
                    <div
                      key={cat.id}
                      className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-5 shadow-xl backdrop-blur-xl transition hover:border-slate-700"
                    >
                      {/* Top Row: Icon + Name + Actions */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-800/80 text-xl">
                            {cat.icon}
                          </span>
                          <div>
                            <h3 className="font-bold text-white">{cat.category}</h3>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              {isSafe && (
                                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                                  Safe ({cat.percentage}%)
                                </span>
                              )}
                              {isWarning && (
                                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                                  Near Limit ({cat.percentage}%)
                                </span>
                              )}
                              {isBreached && (
                                <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-400">
                                  Exceeded ({cat.percentage}%)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Edit Button */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setEditModal({
                                category: cat.category,
                                limit: cat.allocated_limit,
                                icon: cat.icon,
                                color: cat.color,
                              })
                            }
                            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                            title="Edit Limit"
                          >
                            <FaEdit className="text-xs" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBudget(cat.id, cat.category)}
                            className="rounded-xl p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition"
                            title="Delete Budget"
                          >
                            <FaTrash className="text-xs" />
                          </button>
                        </div>
                      </div>

                      {/* Numbers */}
                      <div className="mt-4 flex items-baseline justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Spent
                          </p>
                          <p className="text-lg font-black text-white">
                            ₹{cat.spent.toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Limit
                          </p>
                          <p className="text-base font-bold text-slate-300">
                            ₹{cat.allocated_limit.toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isBreached
                                ? "bg-rose-500"
                                : isWarning
                                ? "bg-amber-400"
                                : "bg-emerald-400"
                            }`}
                            style={{ width: `${Math.min(100, cat.percentage)}%` }}
                          />
                        </div>
                      </div>

                      {/* Bottom Info: Daily Velocity & Remaining */}
                      <div className="mt-3.5 flex items-center justify-between border-t border-slate-800/80 pt-3 text-[11px]">
                        <span className="text-slate-400">
                          {isBreached ? (
                            <span className="font-semibold text-rose-400">
                              +₹{(cat.spent - cat.allocated_limit).toLocaleString("en-IN")} over
                            </span>
                          ) : (
                            <span>
                              Remaining: <strong className="text-white">₹{cat.remaining.toLocaleString("en-IN")}</strong>
                            </span>
                          )}
                        </span>
                        <span className="font-semibold text-slate-300">
                          Safe: ₹{cat.safeDailySpend}/day
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI Financial Coach Advice */}
          <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-purple-950/40 p-6 shadow-xl backdrop-blur-xl">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-2xl text-indigo-400">
                <FaRegLightbulb />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-white">Smart Budget Optimization Tip</h3>
                <p className="text-xs leading-relaxed text-slate-300">
                  {summary.breachedCount > 0
                    ? `You have exceeded limits in ${summary.breachedCount} categories. Shift unspent funds from safe categories or lower your daily velocity to recover by month-end.`
                    : `Excellent pacing! Your daily overall spend is capped at ₹${summary.overallDailyAllowance}/day. Keep your Groceries and Dining expenses below this velocity to end the month with surplus savings.`}
                </p>
                <div className="pt-2">
                  <Link
                    to="/transactions"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300"
                  >
                    <span>View Category Expense Records</span>
                    <FaArrowRight className="text-[10px]" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit / Add Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-xl">
                  {editModal.icon || "📊"}
                </span>
                <div>
                  <h3 className="text-lg font-black text-white">
                    {editModal.category ? `Edit ${editModal.category} Limit` : "Add Category Budget"}
                  </h3>
                  <p className="text-xs text-slate-400">Set monthly spending threshold</p>
                </div>
              </div>
              <button
                onClick={() => setEditModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="mt-5 space-y-4">
              {/* Category selector if new */}
              {!editModal.category && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Select Category
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {PRESET_CATEGORIES.map((cat) => (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() =>
                          setEditModal({
                            ...editModal,
                            category: cat.name,
                            icon: cat.icon,
                            color: cat.color,
                            limit: cat.defaultLimit,
                          })
                        }
                        className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 text-xs text-left hover:border-indigo-500"
                      >
                        <span>{cat.icon}</span>
                        <span className="font-semibold text-white truncate">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Amount Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Monthly Limit (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="500"
                    step="500"
                    required
                    value={editModal.limit}
                    onChange={(e) =>
                      setEditModal({ ...editModal, limit: Number(e.target.value) })
                    }
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 py-3 pl-9 pr-4 text-lg font-black text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Preset Limit Chips */}
              <div className="flex flex-wrap gap-2 pt-1">
                {[3000, 5000, 8000, 10000, 15000, 25000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setEditModal({ ...editModal, limit: preset })}
                    className={`rounded-xl border px-2.5 py-1 text-xs font-bold transition ${
                      editModal.limit === preset
                        ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                        : "border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white"
                    }`}
                  >
                    ₹{preset.toLocaleString("en-IN")}
                  </button>
                ))}
              </div>

              {errorMessage && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs font-semibold text-rose-300">
                  {errorMessage}
                </div>
              )}

              <div className="mt-6 flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModal(null)}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-3 text-xs font-bold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLoading}
                  className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3 text-xs font-bold text-white shadow-lg hover:brightness-110 disabled:opacity-50"
                >
                  {savingLoading ? "Saving..." : "Save Limit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
