import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import NotificationBell from "../components/NotificationBell";
import {
  FaPiggyBank,
  FaChartLine,
  FaShieldAlt,
  FaLock,
  FaCoins,
  FaCheckCircle,
  FaInfoCircle,
  FaArrowRight,
  FaCalendarAlt,
  FaPercent,
  FaTimes,
  FaExclamationTriangle,
  FaPlus,
  FaHistory,
  FaWallet,
} from "react-icons/fa";

const API_BASE = "http://localhost:5000/api";

const TENURE_OPTIONS = [
  { months: 3, rate: 6.0, label: "3 Months", tag: "Flexible" },
  { months: 6, rate: 6.5, label: "6 Months", tag: "Short Term" },
  { months: 12, rate: 7.25, label: "12 Months", tag: "🌟 Most Popular", highlight: true },
  { months: 24, rate: 7.7, label: "2 Years", tag: "Steady Growth" },
  { months: 36, rate: 8.1, label: "3 Years", tag: "High Yield" },
  { months: 60, rate: 8.5, label: "5 Years", tag: "Maximum Return" },
];

export default function FixedDeposits() {
  const { user, token } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deposits, setDeposits] = useState([]);
  const [summary, setSummary] = useState({
    totalPrincipal: 0,
    totalMaturityExpected: 0,
    totalAccruedInterest: 0,
    totalLifetimeReturns: 0,
    activeCount: 0,
    totalCount: 0,
    highestRate: 7.25,
  });

  // Booking Form State
  const [amount, setAmount] = useState(25000);
  const [selectedTenure, setSelectedTenure] = useState(12);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'active', 'matured', 'liquidated'

  // Modals
  const [confirmModal, setConfirmModal] = useState(null); // { type: 'create' | 'liquidate', data }
  const [certificateModal, setCertificateModal] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Fetch FD Portfolio
  const fetchDeposits = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/fixed-deposits`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setDeposits(res.data.deposits || []);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      }
    } catch (err) {
      console.error("Failed to load fixed deposits:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDeposits();
    }
  }, [token]);

  // Quarterly Compounding Calculator
  const calculateProjections = (principal, tenureMonths) => {
    const tenureObj = TENURE_OPTIONS.find((t) => t.months === tenureMonths) || TENURE_OPTIONS[2];
    const rate = tenureObj.rate;
    const n = 4; // quarterly
    const t = tenureMonths / 12;
    const r = rate / 100;
    const maturity = Math.round(principal * Math.pow(1 + r / n, n * t));
    const interest = Math.max(0, maturity - principal);

    const maturityDate = new Date();
    maturityDate.setMonth(maturityDate.getMonth() + tenureMonths);

    return {
      rate,
      maturity,
      interest,
      maturityDate: maturityDate.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    };
  };

  const currentProjection = calculateProjections(Number(amount) || 0, selectedTenure);

  // Handle Book Deposit Submit
  const handleBookDeposit = async () => {
    try {
      setBookingLoading(true);
      setErrorMessage(null);

      const res = await axios.post(
        `${API_BASE}/fixed-deposits/create`,
        {
          principal: Number(amount),
          tenureMonths: selectedTenure,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setConfirmModal(null);
        showToast(`🎉 Fixed Deposit ${res.data.deposit.deposit_number} booked successfully!`);
        fetchDeposits();
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.error || "Failed to book fixed deposit.");
    } finally {
      setBookingLoading(false);
    }
  };

  // Handle Liquidation
  const handleLiquidate = async (deposit) => {
    try {
      setBookingLoading(true);
      const res = await axios.post(
        `${API_BASE}/fixed-deposits/${deposit.id}/liquidate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setConfirmModal(null);
        showToast(
          `💸 Liquidated! ₹${Number(res.data.payoutAmount).toLocaleString("en-IN")} credited to your main balance.`
        );
        fetchDeposits();
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.error || "Failed to liquidate fixed deposit.");
    } finally {
      setBookingLoading(false);
    }
  };

  const filteredDeposits = deposits.filter((d) => {
    if (activeTab === "all") return true;
    return d.status === activeTab;
  });

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
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

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
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 text-2xl text-slate-950 shadow-lg shadow-amber-500/20">
                    <FaPiggyBank />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-400">
                        High-Yield Wealth Growth
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                        <FaShieldAlt className="text-xs" /> DICGC Insured up to ₹5 Lakh
                      </span>
                    </div>
                    <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                      Fixed Deposits & Term Savings
                    </h1>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Earn assured interest up to 8.50% p.a. with quarterly compounding and instant emergency liquidation.
                    </p>
                  </div>
                </div>
              </div>

              {/* Balance & Top-Up shortcut */}
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-slate-700/80 bg-slate-800/60 px-4 py-2.5 text-right backdrop-blur-md">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Main Account Balance
                  </p>
                  <p className="text-lg font-black text-emerald-400">
                    ₹{Number(user?.balance || 0).toLocaleString("en-IN")}
                  </p>
                </div>
                <Link
                  to="/payment"
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110 active:scale-95"
                >
                  <FaWallet />
                  <span>Top-Up</span>
                </Link>
                <NotificationBell />
              </div>
            </div>
          </header>

          {/* Toast Alert */}
          {toastMessage && (
            <div className="flex items-center justify-between rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-4 text-emerald-300 shadow-xl backdrop-blur-md animate-fade-in">
              <div className="flex items-center gap-3">
                <FaCheckCircle className="text-xl text-emerald-400" />
                <span className="text-sm font-semibold">{toastMessage}</span>
              </div>
              <button
                onClick={() => setToastMessage(null)}
                className="text-slate-400 hover:text-white"
              >
                <FaTimes />
              </button>
            </div>
          )}

          {/* Portfolio Metric Overview */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Active FD Investment</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                  <FaCoins />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-white">
                ₹{summary.totalPrincipal.toLocaleString("en-IN")}
              </p>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                <span className="font-semibold text-amber-400">{summary.activeCount} Active</span>
                <span>• Locked Capital</span>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Expected Maturity Value</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <FaChartLine />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-emerald-400">
                ₹{summary.totalMaturityExpected.toLocaleString("en-IN")}
              </p>
              <div className="mt-1 flex items-center gap-2 text-xs text-emerald-400/80">
                <span>+₹{(summary.totalMaturityExpected - summary.totalPrincipal).toLocaleString("en-IN")} Profit</span>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Interest Accrued To Date</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                  <FaPercent />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-cyan-400">
                ₹{summary.totalAccruedInterest.toLocaleString("en-IN")}
              </p>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                <span className="h-2 w-2 animate-ping rounded-full bg-cyan-400" />
                <span>Live Accrual (Quarterly)</span>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Highest Active Rate</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                  <FaPiggyBank />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-purple-400">
                {summary.highestRate || 7.25}% <span className="text-xs text-slate-400 font-normal">p.a.</span>
              </p>
              <div className="mt-1 text-xs text-slate-400">
                Total FDs Opened: <span className="font-bold text-white">{summary.totalCount}</span>
              </div>
            </div>
          </div>

          {/* FD Booking Studio & Calculator */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left: Interactive Booking Form */}
            <div className="lg:col-span-7 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                    <FaPlus />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Open a Fixed Deposit</h2>
                    <p className="text-xs text-slate-400">Customize amount & tenure with guaranteed return</p>
                  </div>
                </div>
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-300">
                  Instant Debit
                </span>
              </div>

              {/* Amount Input */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Deposit Amount (₹)
                  </label>
                  <span className="text-xs text-slate-400">
                    Min: ₹1,000 | Max: ₹50,00,000
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1000"
                    max="5000000"
                    step="500"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 py-3.5 pl-10 pr-4 text-xl font-black text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {[10000, 25000, 50000, 100000, 250000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(preset)}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                        amount === preset
                          ? "border-amber-400 bg-amber-400/10 text-amber-300"
                          : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-white"
                      }`}
                    >
                      +₹{preset.toLocaleString("en-IN")}
                    </button>
                  ))}
                </div>

                {/* Balance validation alert */}
                {amount > (user?.balance || 0) && (
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-400">
                    <FaExclamationTriangle />
                    <span>
                      Insufficient balance (₹{Number(user?.balance || 0).toLocaleString("en-IN")}). Please top-up first.
                    </span>
                  </p>
                )}
              </div>

              {/* Tenure Selection Cards */}
              <div className="mt-6 space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Select Investment Tenure
                </label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {TENURE_OPTIONS.map((opt) => {
                    const isSelected = selectedTenure === opt.months;
                    return (
                      <button
                        key={opt.months}
                        type="button"
                        onClick={() => setSelectedTenure(opt.months)}
                        className={`relative rounded-2xl border p-3.5 text-left transition-all ${
                          isSelected
                            ? "border-amber-400 bg-amber-500/15 shadow-lg shadow-amber-500/10"
                            : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                        }`}
                      >
                        {opt.tag && (
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold ${
                              isSelected
                                ? "bg-amber-400 text-slate-950"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {opt.tag}
                          </span>
                        )}
                        <p className="mt-2 text-sm font-black text-white">{opt.label}</p>
                        <p className="mt-0.5 text-xs font-bold text-amber-400">
                          {opt.rate}% <span className="text-[10px] text-slate-400 font-normal">p.a.</span>
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs font-semibold text-rose-300">
                  {errorMessage}
                </div>
              )}

              {/* CTA Action */}
              <button
                type="button"
                disabled={amount < 1000 || amount > (user?.balance || 0) || bookingLoading}
                onClick={() =>
                  setConfirmModal({
                    type: "create",
                    data: {
                      principal: amount,
                      tenure: selectedTenure,
                      projection: currentProjection,
                    },
                  })
                }
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 py-4 font-black text-slate-950 shadow-xl shadow-amber-500/20 transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span>Book Fixed Deposit</span>
                <FaArrowRight className="text-sm" />
              </button>
            </div>

            {/* Right: Live Dynamic Projection Box */}
            <div className="lg:col-span-5 flex flex-col justify-between rounded-3xl border border-amber-500/20 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950/90 p-6 shadow-2xl backdrop-blur-xl">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Maturity Projection
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <FaLock className="text-amber-400" /> Guaranteed
                  </span>
                </div>

                {/* Big Expected Maturity */}
                <div className="mt-6 rounded-2xl border border-slate-800/80 bg-slate-950/70 p-5 text-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Guaranteed Payout on Maturity
                  </p>
                  <p className="mt-2 text-4xl font-black text-amber-400">
                    ₹{currentProjection.maturity.toLocaleString("en-IN")}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Maturity on: <span className="font-bold text-white">{currentProjection.maturityDate}</span>
                  </p>
                </div>

                {/* Breakdown List */}
                <div className="mt-6 space-y-3 divide-y divide-slate-800/80 text-sm">
                  <div className="flex justify-between pt-2">
                    <span className="text-slate-400">Invested Principal</span>
                    <span className="font-bold text-white">₹{Number(amount || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between pt-3">
                    <span className="text-slate-400">Interest Earned</span>
                    <span className="font-bold text-emerald-400">+₹{currentProjection.interest.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between pt-3">
                    <span className="text-slate-400">Interest Rate</span>
                    <span className="font-bold text-amber-400">{currentProjection.rate}% p.a.</span>
                  </div>
                  <div className="flex justify-between pt-3">
                    <span className="text-slate-400">Compounding Cycle</span>
                    <span className="font-bold text-slate-200">Quarterly (4x / Year)</span>
                  </div>
                  <div className="flex justify-between pt-3">
                    <span className="text-slate-400">Premature Withdrawal</span>
                    <span className="font-bold text-cyan-400">Allowed Anytime</span>
                  </div>
                </div>
              </div>

              {/* Bottom Guarantee Badge */}
              <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex items-start gap-3">
                  <FaShieldAlt className="mt-0.5 text-base text-emerald-400 shrink-0" />
                  <p className="text-xs leading-relaxed text-slate-300">
                    Your deposits are protected with bank-grade 256-bit encryption. Returns are fixed at booking and cannot decrease even if interest rates fall in the market.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Portfolio & Active Deposits Section */}
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-black text-white">Your Fixed Deposits Portfolio</h2>
                <p className="text-xs text-slate-400">
                  Track ongoing deposits, accrued interest, and liquidation options
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex rounded-2xl border border-slate-800 bg-slate-900/80 p-1">
                {[
                  { key: "all", label: "All" },
                  { key: "active", label: "Active" },
                  { key: "matured", label: "Matured" },
                  { key: "liquidated", label: "Closed" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                      activeTab === tab.key
                        ? "bg-amber-400 text-slate-950"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-12 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
                <p className="mt-3 text-sm text-slate-400">Loading your deposit portfolio...</p>
              </div>
            ) : filteredDeposits.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-2xl text-amber-400">
                  <FaPiggyBank />
                </div>
                <h3 className="mt-4 text-base font-bold text-white">No Fixed Deposits Found</h3>
                <p className="mt-1 text-xs text-slate-400">
                  {activeTab === "all"
                    ? "Start growing your savings with guaranteed returns up to 8.50% p.a."
                    : `No deposits in '${activeTab}' state.`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {filteredDeposits.map((fd) => {
                  const isActive = fd.status === "active";
                  const isMatured = fd.status === "matured";
                  const isLiquidated = fd.status === "liquidated";

                  return (
                    <div
                      key={fd.id}
                      className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-6 shadow-xl backdrop-blur-xl transition hover:border-slate-700"
                    >
                      {/* Top Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs font-bold text-slate-400">
                            {fd.deposit_number}
                          </span>
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                            {fd.tenure_months}M @ {fd.interest_rate}% p.a.
                          </span>
                        </div>

                        {/* Status Badge */}
                        {isActive && (
                          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                            Active
                          </span>
                        )}
                        {isMatured && (
                          <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300">
                            Matured 🎉
                          </span>
                        )}
                        {isLiquidated && (
                          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-400">
                            Liquidated 💸
                          </span>
                        )}
                      </div>

                      {/* Amounts Display */}
                      <div className="mt-4 grid grid-cols-2 gap-4 rounded-2xl bg-slate-950/60 p-4">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Principal Amount
                          </p>
                          <p className="mt-1 text-lg font-black text-white">
                            ₹{fd.principal_amount.toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {isLiquidated ? "Amount Paid Out" : "Maturity Value"}
                          </p>
                          <p className="mt-1 text-lg font-black text-emerald-400">
                            ₹{(fd.payout_amount || fd.maturity_amount).toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar (for Active) */}
                      {isActive && (
                        <div className="mt-4 space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">
                              Tenure Progress ({fd.progress_percentage}%)
                            </span>
                            <span className="font-semibold text-amber-400">
                              Matures in {fd.days_remaining} Days
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
                              style={{ width: `${fd.progress_percentage}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-400">
                            <span>Started: {new Date(fd.start_date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                            <span>Matures: {new Date(fd.maturity_date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                          </div>
                        </div>
                      )}

                      {/* Live Accrued Earnings Chip */}
                      <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/40 px-3.5 py-2">
                        <span className="text-xs text-slate-400">Accrued Interest So Far:</span>
                        <span className="text-xs font-black text-cyan-400">
                          +₹{fd.accrued_interest.toLocaleString("en-IN")}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-5 flex items-center gap-2">
                        {isActive && (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmModal({
                                type: "liquidate",
                                data: fd,
                              })
                            }
                            className="flex-1 rounded-xl border border-rose-500/40 bg-rose-500/10 py-2.5 text-xs font-bold text-rose-300 transition hover:bg-rose-500/20 active:scale-95"
                          >
                            Liquidate / Cash Out
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setCertificateModal(fd)}
                          className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
                        >
                          <FaHistory className="text-xs" />
                          <span>Certificate</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            {confirmModal.type === "create" ? (
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-2xl text-amber-400">
                  <FaPiggyBank />
                </div>
                <h3 className="mt-4 text-xl font-black text-white">Confirm Fixed Deposit</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Please verify your deposit booking details before confirming.
                </p>

                <div className="mt-4 space-y-2 rounded-2xl bg-slate-950/60 p-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Principal Amount:</span>
                    <span className="font-bold text-white">
                      ₹{confirmModal.data.principal.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tenure:</span>
                    <span className="font-bold text-white">{confirmModal.data.tenure} Months</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Interest Rate:</span>
                    <span className="font-bold text-amber-400">{confirmModal.data.projection.rate}% p.a.</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Guaranteed Return:</span>
                    <span className="font-bold text-emerald-400">
                      ₹{confirmModal.data.projection.maturity.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Maturity Date:</span>
                    <span className="font-bold text-slate-200">{confirmModal.data.projection.maturityDate}</span>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmModal(null)}
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-800/80 py-3 text-xs font-bold text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={bookingLoading}
                    onClick={handleBookDeposit}
                    className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 py-3 text-xs font-bold text-slate-950 shadow-lg hover:brightness-110 disabled:opacity-50"
                  >
                    {bookingLoading ? "Processing..." : "Confirm & Pay"}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 text-2xl text-rose-400">
                  <FaExclamationTriangle />
                </div>
                <h3 className="mt-4 text-xl font-black text-white">Premature Liquidation</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Are you sure you want to cash out deposit {confirmModal.data.deposit_number}?
                </p>

                <div className="mt-4 space-y-2 rounded-2xl bg-slate-950/60 p-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Principal Refund:</span>
                    <span className="font-bold text-white">
                      ₹{confirmModal.data.principal_amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Accrued Interest (Net):</span>
                    <span className="font-bold text-emerald-400">
                      +₹{Math.max(0, Math.round(confirmModal.data.accrued_interest * 0.9)).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-800 pt-2 font-bold">
                    <span className="text-slate-300">Total Credit to Wallet:</span>
                    <span className="text-sm text-cyan-400">
                      ₹{(
                        confirmModal.data.principal_amount +
                        Math.max(0, Math.round(confirmModal.data.accrued_interest * 0.9))
                      ).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmModal(null)}
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-800/80 py-3 text-xs font-bold text-slate-300 hover:bg-slate-700"
                  >
                    Keep Deposit
                  </button>
                  <button
                    type="button"
                    disabled={bookingLoading}
                    onClick={() => handleLiquidate(confirmModal.data)}
                    className="flex-1 rounded-xl bg-rose-600 py-3 text-xs font-bold text-white shadow-lg hover:bg-rose-500 disabled:opacity-50"
                  >
                    {bookingLoading ? "Liquidating..." : "Yes, Liquidate Now"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Certificate / Receipt Modal */}
      {certificateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-amber-500/40 bg-slate-900 p-8 shadow-2xl">
            <button
              onClick={() => setCertificateModal(null)}
              className="absolute right-5 top-5 text-slate-400 hover:text-white"
            >
              <FaTimes className="text-lg" />
            </button>

            <div className="text-center border-b border-slate-800 pb-5">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-2xl text-amber-400">
                <FaShieldAlt />
              </div>
              <h3 className="mt-3 text-xl font-black uppercase tracking-wider text-white">
                Fixed Deposit Certificate
              </h3>
              <p className="text-xs text-slate-400">NovaPay Banking Corporation</p>
            </div>

            <div className="mt-6 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Certificate / Ref ID:</span>
                <span className="font-mono font-bold text-white">{certificateModal.deposit_number}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Depositor Name:</span>
                <span className="font-bold text-white">{user?.name || "NovaPay Account Holder"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Principal Deposit:</span>
                <span className="font-bold text-white">₹{certificateModal.principal_amount.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Contracted Rate:</span>
                <span className="font-bold text-amber-400">{certificateModal.interest_rate}% p.a.</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Tenure:</span>
                <span className="font-bold text-white">{certificateModal.tenure_months} Months</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Maturity Payout Value:</span>
                <span className="font-bold text-emerald-400">₹{certificateModal.maturity_amount.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Commencement Date:</span>
                <span className="text-slate-200">{new Date(certificateModal.start_date).toLocaleDateString("en-IN")}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Maturity Date:</span>
                <span className="text-slate-200">{new Date(certificateModal.maturity_date).toLocaleDateString("en-IN")}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Status:</span>
                <span className="font-bold uppercase text-amber-400">{certificateModal.status}</span>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full rounded-xl bg-amber-400 py-3 text-xs font-bold text-slate-950 hover:bg-amber-300"
              >
                Print Official Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
