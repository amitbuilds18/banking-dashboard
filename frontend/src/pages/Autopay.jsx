import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaSyncAlt,
  FaPlus,
  FaCalendarAlt,
  FaPlay,
  FaPause,
  FaTrash,
  FaCheckCircle,
  FaBolt,
  FaArrowLeft,
  FaTimes,
  FaTv,
  FaMusic,
  FaHome,
  FaWifi,
  FaChartLine,
  FaShieldAlt,
} from "react-icons/fa";
import API from "../services/api";
import { useToast } from "../context/ToastContext";

const PRESETS = [
  {
    title: "Netflix Premium 4K",
    category: "Subscription",
    amount: 649,
    frequency: "monthly",
    icon: "🎬",
    color: "from-rose-600 to-red-700",
    receiver_name: "Netflix India",
    receiver_account: "netflix.billing@upi",
  },
  {
    title: "Spotify Duo Hi-Fi",
    category: "Subscription",
    amount: 149,
    frequency: "monthly",
    icon: "🎵",
    color: "from-emerald-500 to-teal-600",
    receiver_name: "Spotify AB",
    receiver_account: "spotify.payments@upi",
  },
  {
    title: "Apartment House Rent",
    category: "Rent",
    amount: 18000,
    frequency: "monthly",
    icon: "🏠",
    color: "from-blue-600 to-indigo-700",
    receiver_name: "Landlord Ramesh",
    receiver_account: "ramesh.owner@hdfc",
  },
  {
    title: "JioFiber 100Mbps",
    category: "Utility",
    amount: 999,
    frequency: "monthly",
    icon: "🌐",
    color: "from-cyan-500 to-blue-600",
    receiver_name: "Reliance Jio Infocomm",
    receiver_account: "jiofiber.bill@icici",
  },
  {
    title: "Nifty 50 Index Fund SIP",
    category: "Investment",
    amount: 5000,
    frequency: "monthly",
    icon: "📈",
    color: "from-amber-500 to-yellow-600",
    receiver_name: "Groww Mutual Funds",
    receiver_account: "groww.mf@axis",
  },
];

const CATEGORIES = ["All", "Subscription", "Rent", "Utility", "Investment", "Insurance"];

export default function Autopay() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ totalItems: 0, activeCount: 0, monthlyCommitted: 0 });
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    category: "Subscription",
    amount: "",
    frequency: "monthly",
    receiver_name: "",
    receiver_account: "",
    icon: "⚡",
    color: "from-indigo-500 to-purple-600",
    auto_debit: true,
    next_execution: "",
  });

  const fetchRecurring = async () => {
    try {
      setLoading(true);
      const res = await API.get("/recurring");
      setItems(res.data.items || []);
      setSummary(res.data.summary || { totalItems: 0, activeCount: 0, monthlyCommitted: 0 });
    } catch (err) {
      console.error(err);
      showToast("Failed to load recurring mandates", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecurring();
  }, []);

  const handleApplyPreset = (preset) => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    setFormData({
      title: preset.title,
      category: preset.category,
      amount: preset.amount.toString(),
      frequency: preset.frequency,
      receiver_name: preset.receiver_name,
      receiver_account: preset.receiver_account,
      icon: preset.icon,
      color: preset.color,
      auto_debit: true,
      next_execution: nextMonth.toISOString().split("T")[0],
    });
    setShowAddModal(true);
  };

  const handleToggleStatus = async (item) => {
    const nextStatus = item.status === "active" ? "paused" : "active";
    try {
      await API.patch(`/recurring/${item.id}/status`, { status: nextStatus });
      showToast(
        `Autopay ${nextStatus === "active" ? "resumed" : "paused"} for ${item.title}`,
        "info"
      );
      fetchRecurring();
    } catch (err) {
      console.error(err);
      showToast("Failed to update status", "error");
    }
  };

  const handleTriggerNow = async (item) => {
    if (
      !window.confirm(
        `Execute autopay debit of ₹${Number(item.amount).toLocaleString(
          "en-IN"
        )} now for ${item.title}?`
      )
    ) {
      return;
    }

    setProcessingId(item.id);
    try {
      const res = await API.post(`/recurring/${item.id}/trigger`);
      showToast(res.data?.message || "Autopay executed successfully! 💸", "success");
      fetchRecurring();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || "Autopay execution failed";
      showToast(errMsg, "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Cancel recurring mandate for ${item.title}?`)) {
      return;
    }

    try {
      await API.delete(`/recurring/${item.id}`);
      showToast(`Mandate cancelled for ${item.title}`, "info");
      fetchRecurring();
    } catch (err) {
      console.error(err);
      showToast("Failed to cancel mandate", "error");
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.amount || Number(formData.amount) <= 0) {
      showToast("Please provide a valid title and amount", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await API.post("/recurring", formData);
      showToast(res.data?.message || "Recurring payment scheduled!", "success");
      setShowAddModal(false);
      setFormData({
        title: "",
        category: "Subscription",
        amount: "",
        frequency: "monthly",
        receiver_name: "",
        receiver_account: "",
        icon: "⚡",
        color: "from-indigo-500 to-purple-600",
        auto_debit: true,
        next_execution: "",
      });
      fetchRecurring();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || "Failed to schedule autopay";
      showToast(errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (filterCategory === "All") return true;
    return item.category === filterCategory;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-cyan-500 selection:text-slate-950 p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Top Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              onClick={() => navigate("/dashboard")}
              className="mb-2 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              <FaArrowLeft className="text-[10px]" /> Back to Dashboard
            </button>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-xl font-bold text-white shadow-lg shadow-indigo-500/20">
                <FaSyncAlt />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white sm:text-3xl">
                  Autopay & Subscriptions
                </h1>
                <p className="text-xs text-slate-400">
                  Automate recurring bills, rent, SIPs, and digital subscriptions
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110 active:scale-95"
          >
            <FaPlus /> New Mandate
          </button>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">
              Monthly Outflow Commitment
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">
                ₹{summary.monthlyCommitted.toLocaleString("en-IN")}
              </span>
              <span className="text-xs text-slate-400">/ month</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Calculated across all active automated mandates
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
              Active Autopay Rules
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-400">
                {summary.activeCount}
              </span>
              <span className="text-xs text-slate-400">of {summary.totalItems} total</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Zero manual payment reminders needed
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
              Next Execution
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-indigo-300">
                {items.length > 0 && items[0].next_execution
                  ? new Date(items[0].next_execution).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })
                  : "None scheduled"}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 truncate">
              {items.length > 0 ? items[0].title : "Setup standing instructions below"}
            </p>
          </div>
        </div>

        {/* 1-Click Popular Presets */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
                Fast Autopay Presets
              </span>
              <h3 className="text-sm font-bold text-white">1-Click Mandate Quick Setup</h3>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {PRESETS.map((p) => (
              <button
                key={p.title}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5 text-left transition hover:border-indigo-500/40 hover:bg-slate-850/80 active:scale-95"
              >
                <div>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${p.color} text-lg shadow-md mb-2 group-hover:scale-105 transition`}
                  >
                    {p.icon}
                  </div>
                  <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition truncate">
                    {p.title}
                  </h4>
                  <p className="text-[10px] text-slate-400">{p.category}</p>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2">
                  <span className="text-xs font-bold text-indigo-400">
                    ₹{p.amount.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 group-hover:text-white transition">
                    + Setup
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                filterCategory === cat
                  ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30"
                  : "border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Autopay Mandates List */}
        {loading ? (
          <div className="flex min-h-[250px] items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/40">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
              <p className="text-xs text-slate-400">Loading scheduled autopays...</p>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/20 p-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/80 text-2xl text-slate-500">
              <FaSyncAlt />
            </div>
            <h3 className="text-lg font-bold text-white">No Autopay Mandates Found</h3>
            <p className="mt-1 max-w-sm text-xs text-slate-400">
              Never miss a bill deadline. Set up standing instructions or choose from the popular presets above.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 px-4 py-2.5 text-xs font-bold text-indigo-400 hover:bg-indigo-500/20 transition"
            >
              <FaPlus /> Create First Mandate
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              const isPaused = item.status === "paused";
              const isProcessing = processingId === item.id;
              return (
                <div
                  key={item.id}
                  className={`group relative flex flex-col justify-between rounded-3xl border bg-slate-900/60 p-5 backdrop-blur-xl transition ${
                    isPaused
                      ? "border-slate-800/60 opacity-60"
                      : "border-slate-800 hover:border-slate-700 hover:bg-slate-900/80"
                  }`}
                >
                  <div>
                    {/* Top Row: Icon + Title + Status */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${
                            item.color || "from-indigo-500 to-purple-600"
                          } text-xl shadow-md`}
                        >
                          {item.icon || "⚡"}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-white truncate">
                            {item.title}
                          </h4>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">
                            {item.category} • {item.frequency}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                          isPaused
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    {/* Amount & Receiver Specs */}
                    <div className="mt-4 rounded-2xl border border-slate-800/80 bg-slate-950/40 p-3.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Amount</span>
                        <span className="text-base font-black text-white">
                          ₹{Number(item.amount).toLocaleString("en-IN")}
                        </span>
                      </div>

                      {item.receiver_account && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-[11px]">Payee Account</span>
                          <span className="font-mono text-slate-300 truncate max-w-[170px]">
                            {item.receiver_account}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                        <span className="text-slate-400 text-[11px] flex items-center gap-1">
                          <FaCalendarAlt className="text-slate-500" /> Next Due
                        </span>
                        <span className="font-semibold text-cyan-300">
                          {new Date(item.next_execution).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item)}
                        className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition ${
                          isPaused
                            ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                            : "bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700"
                        }`}
                        title={isPaused ? "Resume Autopay" : "Pause Autopay"}
                      >
                        {isPaused ? <FaPlay className="text-[9px]" /> : <FaPause className="text-[9px]" />}
                        <span>{isPaused ? "Resume" : "Pause"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-500 hover:text-rose-400 hover:border-rose-500/30 transition"
                        title="Delete Mandate"
                      >
                        <FaTrash className="text-xs" />
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleTriggerNow(item)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-indigo-500/20 hover:brightness-110 active:scale-95 disabled:opacity-50 transition"
                    >
                      {isProcessing ? "Processing..." : "⚡ Pay Now"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE AUTOPAY MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-white transition"
            >
              <FaTimes />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
                <FaSyncAlt />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">New Autopay Mandate</h3>
                <p className="text-xs text-slate-400">Schedule automatic recurring transfers</p>
              </div>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mandate Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Gym Membership, Home Wi-Fi"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-400 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="999"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-400 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Frequency
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-400 transition"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-400 transition"
                  >
                    <option value="Subscription">Subscription</option>
                    <option value="Rent">Rent</option>
                    <option value="Utility">Utility</option>
                    <option value="Investment">Investment</option>
                    <option value="Insurance">Insurance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    First Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.next_execution}
                    onChange={(e) => setFormData({ ...formData, next_execution: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-400 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Payee Account / UPI (Optional)
                </label>
                <input
                  type="text"
                  value={formData.receiver_account}
                  onChange={(e) => setFormData({ ...formData, receiver_account: e.target.value })}
                  placeholder="e.g. landlord@okhdfcbank"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-400 transition"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110 disabled:opacity-50"
                >
                  {submitting ? "Scheduling..." : "Confirm Autopay"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
