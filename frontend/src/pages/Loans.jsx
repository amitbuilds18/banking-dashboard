import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import NotificationBell from "../components/NotificationBell";
import {
  FaHandHoldingUsd,
  FaMoneyBillWave,
  FaCalculator,
  FaCheckCircle,
  FaShieldAlt,
  FaHistory,
  FaFileInvoiceDollar,
  FaBolt,
  FaAward,
  FaTimes,
  FaInfoCircle,
  FaArrowRight,
  FaCalendarAlt,
  FaPercentage,
  FaUniversity,
  FaLock,
  FaReceipt,
  FaFileContract,
  FaCreditCard,
  FaClock,
  FaCheck,
  FaDownload,
  FaExclamationTriangle,
  FaWallet,
} from "react-icons/fa";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1"
    ? "https://banking-dashboard-anuc.vercel.app/api"
    : "http://localhost:5000/api");

const TENURE_OPTIONS = [
  { months: 3, label: "3 Mo", desc: "Short Run" },
  { months: 6, label: "6 Mo", desc: "Low Interest" },
  { months: 12, label: "12 Mo", desc: "Most Popular", highlight: true },
  { months: 18, label: "18 Mo", desc: "Balanced" },
  { months: 24, label: "24 Mo", desc: "Low EMI" },
  { months: 36, label: "36 Mo", desc: "Long Term" },
];

const LOAN_PURPOSES = [
  { id: "Personal Expense", label: "Personal & Lifestyle", icon: "✨" },
  { id: "Medical Emergency", label: "Medical & Health", icon: "🏥" },
  { id: "Home Renovation", label: "Home Renovation", icon: "🏠" },
  { id: "Education & Tech", label: "Education & Upskilling", icon: "🎓" },
  { id: "Travel & Vacation", label: "Travel & Holidays", icon: "✈️" },
  { id: "Business Growth", label: "Business Expansion", icon: "💼" },
];

export default function Loans() {
  const { user, token } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Summary & Loans Data
  const [summary, setSummary] = useState({
    creditScore: 782,
    bureauRating: "Excellent",
    preApprovedLimit: 500000,
    availableLimit: 500000,
    totalDebt: 0,
    totalBorrowed: 0,
    activeLoansCount: 0,
    closedLoansCount: 0,
    isKycVerified: false,
    nextDue: null,
    balance: 50000,
  });
  const [loans, setLoans] = useState([]);
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'active', 'closed'

  // Application Studio State
  const [amount, setAmount] = useState(50000);
  const [tenure, setTenure] = useState(12);
  const [purpose, setPurpose] = useState("Personal Expense");
  const [submitting, setSubmitting] = useState(false);

  // Modals
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [payEmiModal, setPayEmiModal] = useState(null); // loan object
  const [forecloseModal, setForecloseModal] = useState(null); // loan object
  const [scheduleModal, setScheduleModal] = useState(null); // { loan, schedule }
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [nocModal, setNocModal] = useState(null); // noc data
  const [nocLoading, setNocLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = "success") => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Reducing Balance EMI Calculation
  const calculateLiveEmi = (p, tenureMonths, annualRate = 11.49) => {
    const monthlyRate = annualRate / 12 / 100;
    if (monthlyRate === 0) return Math.round(p / tenureMonths);
    const factor = Math.pow(1 + monthlyRate, tenureMonths);
    return Math.round((p * monthlyRate * factor) / (factor - 1));
  };

  const currentEmi = calculateLiveEmi(amount, tenure);
  const totalPayable = currentEmi * tenure;
  const totalInterest = totalPayable - amount;

  // Load Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      const [summaryRes, loansRes] = await Promise.all([
        axios.get(`${API_BASE}/loans/summary`, { headers }),
        axios.get(`${API_BASE}/loans`, { headers }),
      ]);

      setSummary(summaryRes.data);
      setLoans(loansRes.data);
    } catch (err) {
      console.error("Failed to load loan data:", err);
      showToast("Unable to refresh loans data.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  // Handle Loan Disbursal
  const handleApplyLoan = async () => {
    try {
      setSubmitting(true);
      const res = await axios.post(
        `${API_BASE}/loans/apply`,
        { amount, tenureMonths: tenure, purpose },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setApplyModalOpen(false);
      showToast(`🎉 ₹${amount.toLocaleString("en-IN")} credited directly to your bank account!`);
      await fetchData();
    } catch (err) {
      console.error("Loan application failed:", err);
      showToast(err.response?.data?.message || "Loan disbursal failed.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Pay EMI
  const handlePayEmi = async (loanId) => {
    try {
      setSubmitting(true);
      const res = await axios.post(
        `${API_BASE}/loans/${loanId}/pay-emi`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPayEmiModal(null);
      showToast(res.data.message || "EMI paid successfully!");
      await fetchData();
    } catch (err) {
      console.error("EMI payment failed:", err);
      showToast(err.response?.data?.message || "Failed to pay EMI.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Foreclose
  const handleForeclose = async (loanId) => {
    try {
      setSubmitting(true);
      const res = await axios.post(
        `${API_BASE}/loans/${loanId}/foreclose`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setForecloseModal(null);
      showToast("🏆 Loan foreclosed successfully! 0% penalty applied.");
      await fetchData();
    } catch (err) {
      console.error("Foreclosure failed:", err);
      showToast(err.response?.data?.message || "Failed to foreclose loan.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // View Amortization Schedule
  const openScheduleModal = async (loan) => {
    try {
      setScheduleLoading(true);
      const res = await axios.get(`${API_BASE}/loans/${loan.id}/schedule`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setScheduleModal(res.data);
    } catch (err) {
      console.error("Failed to load schedule:", err);
      showToast("Unable to load amortization schedule.", "error");
    } finally {
      setScheduleLoading(false);
    }
  };

  // View / Print NOC
  const openNocModal = async (loan) => {
    try {
      setNocLoading(true);
      const res = await axios.get(`${API_BASE}/loans/${loan.id}/noc`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNocModal(res.data);
    } catch (err) {
      console.error("Failed to load NOC:", err);
      showToast(err.response?.data?.message || "Failed to load NOC.", "error");
    } finally {
      setNocLoading(false);
    }
  };

  const filteredLoans = loans.filter((l) => {
    if (activeTab === "active") return l.status === "active";
    if (activeTab === "closed") return l.status === "closed";
    return true;
  });

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border backdrop-blur-md transition-all animate-bounce ${
            toastMessage.type === "error"
              ? "bg-rose-950/90 border-rose-500/50 text-rose-200"
              : "bg-emerald-950/90 border-emerald-500/50 text-emerald-200"
          }`}
        >
          {toastMessage.type === "error" ? <FaExclamationTriangle /> : <FaCheckCircle />}
          <span className="font-medium text-sm">{toastMessage.msg}</span>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-slate-900/60 backdrop-blur-xl border-b border-slate-800/80">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              ☰
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <FaHandHoldingUsd className="text-emerald-400" />
                  Instant Credit Line & Personal Loans
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Pre-Approved
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Instant collateral-free disbursal directly to your account in under 30 seconds
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
              <FaWallet className="text-blue-400" />
              <span className="text-slate-400">Balance:</span>
              <span className="font-semibold text-emerald-400">
                ₹{summary.balance.toLocaleString("en-IN")}
              </span>
            </div>
            <NotificationBell />
          </div>
        </header>

        {/* Page Body */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Header Summary Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Credit Score Bureau Meter */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-slate-800/80 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <FaShieldAlt className="text-emerald-400" /> CIBIL Experian Score
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {summary.bureauRating}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                  {summary.creditScore}
                </span>
                <span className="text-xs text-slate-500">/ 900</span>
              </div>
              <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1.5 rounded-full"
                  style={{ width: `${(summary.creditScore / 900) * 100}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
                <span className="text-emerald-400">●</span> 100% On-Time Repayment History
              </p>
            </div>

            {/* Pre-Approved Credit Limit */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-slate-800/80 relative overflow-hidden group hover:border-cyan-500/40 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <FaBolt className="text-cyan-400" /> Available Credit
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Instant
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">
                  ₹{summary.availableLimit.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-1.5 rounded-full"
                  style={{
                    width: `${
                      summary.preApprovedLimit > 0
                        ? (summary.availableLimit / summary.preApprovedLimit) * 100
                        : 100
                    }%`,
                  }}
                />
              </div>
              <p className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Total Limit: ₹{summary.preApprovedLimit.toLocaleString("en-IN")}</span>
                {!summary.isKycVerified && (
                  <Link to="/kyc" className="text-cyan-400 hover:underline">
                    Upgrade KYC →
                  </Link>
                )}
              </p>
            </div>

            {/* Active Outstanding Debt */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-slate-800/80 relative overflow-hidden group hover:border-amber-500/40 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <FaFileInvoiceDollar className="text-amber-400" /> Active Debt
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {summary.activeLoansCount} Active
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-amber-300">
                  ₹{summary.totalDebt.toLocaleString("en-IN")}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Lifetime Borrowed: ₹{summary.totalBorrowed.toLocaleString("en-IN")}
              </p>
              <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
                <FaCheckCircle className="text-emerald-400" /> 0% Prepayment Charges
              </div>
            </div>

            {/* Next Due EMI */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-slate-800/80 relative overflow-hidden group hover:border-purple-500/40 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <FaCalendarAlt className="text-purple-400" /> Next Upcoming EMI
                </span>
                {summary.nextDue && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Auto-Debit Ready
                  </span>
                )}
              </div>
              {summary.nextDue ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">
                      ₹{parseFloat(summary.nextDue.emi_amount).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">
                    Due Date:{" "}
                    <span className="text-purple-300 font-semibold">
                      {new Date(summary.nextDue.next_emi_date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {summary.nextDue.loan_account_no} • {summary.nextDue.purpose}
                  </p>
                </>
              ) : (
                <div className="py-2 text-center">
                  <p className="text-sm font-semibold text-emerald-400">No Pending EMIs</p>
                  <p className="text-xs text-slate-500 mt-1">You are completely debt-free!</p>
                </div>
              )}
            </div>
          </div>

          {/* KYC Upgrade Banner if unverified */}
          {!summary.isKycVerified && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-slate-900 border border-blue-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-lg">
                  <FaLock />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Unlock Maximum Credit Limit of ₹5,00,000
                  </h4>
                  <p className="text-xs text-slate-400">
                    Complete your 1-minute DigiLocker e-KYC with PAN and Aadhaar to instantly 3x
                    your loan limit.
                  </p>
                </div>
              </div>
              <Link
                to="/kyc"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-lg shadow-blue-500/20 flex items-center gap-1.5 whitespace-nowrap"
              >
                Complete DigiLocker KYC <FaArrowRight />
              </Link>
            </div>
          )}

          {/* Instant Loan Disbursal Studio & Simulator */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Interactive Controls (7 cols) */}
            <div className="lg:col-span-7 p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <FaCalculator className="text-emerald-400" />
                    Instant Disbursal Studio
                  </h2>
                  <p className="text-xs text-slate-400">
                    Configure your loan requirements with 100% transparent zero-hidden fees
                  </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                  <FaBolt /> 30-Sec Disbursal
                </div>
              </div>

              {/* Amount Slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Borrowing Amount
                  </label>
                  <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                    ₹{amount.toLocaleString("en-IN")}
                  </span>
                </div>

                <input
                  type="range"
                  min="10000"
                  max={Math.max(10000, summary.availableLimit)}
                  step="5000"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />

                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Min: ₹10,000</span>
                  <span>Available: ₹{summary.availableLimit.toLocaleString("en-IN")}</span>
                </div>

                {/* Quick Amount Chips */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {[25000, 50000, 100000, 200000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(Math.min(preset, summary.availableLimit))}
                      className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                        amount === preset
                          ? "bg-emerald-500 text-slate-950 font-bold"
                          : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      ₹{(preset / 1000).toFixed(0)}k
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAmount(summary.availableLimit)}
                    className="px-3 py-1 text-xs rounded-lg font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
                  >
                    Max Limit
                  </button>
                </div>
              </div>

              {/* Tenure Selection */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Repayment Tenure
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {TENURE_OPTIONS.map((opt) => (
                    <button
                      key={opt.months}
                      type="button"
                      onClick={() => setTenure(opt.months)}
                      className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center ${
                        tenure === opt.months
                          ? "bg-emerald-500/20 border-emerald-500 text-white shadow-lg shadow-emerald-500/10"
                          : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                      }`}
                    >
                      <span className="text-sm font-bold">{opt.label}</span>
                      <span className="text-[10px] text-slate-400">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Purpose Selector */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Loan Purpose
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {LOAN_PURPOSES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPurpose(p.id)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all flex items-center gap-2 ${
                        purpose === p.id
                          ? "bg-slate-800 border-emerald-500 text-white"
                          : "bg-slate-900/40 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                      }`}
                    >
                      <span className="text-base">{p.icon}</span>
                      <span className="truncate">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Real-time Live Quotation Card (5 cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/20 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden">
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FaFileContract className="text-emerald-400" /> Repayment Quotation
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    11.49% p.a.
                  </span>
                </div>

                {/* Big EMI Highlight */}
                <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-center space-y-1">
                  <p className="text-xs text-slate-400">Monthly EMI Payable</p>
                  <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300">
                    ₹{currentEmi.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    for {tenure} months • Auto-debited on 1st of every month
                  </p>
                </div>

                {/* Financial Breakdown Table */}
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-800/50">
                    <span className="text-slate-400">Principal Loan Amount</span>
                    <span className="font-semibold text-white">
                      ₹{amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/50">
                    <span className="text-slate-400">Annual Interest Rate</span>
                    <span className="font-semibold text-emerald-400">11.49% p.a. (Reducing)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/50">
                    <span className="text-slate-400">Total Interest Payable</span>
                    <span className="font-semibold text-slate-300">
                      ₹{totalInterest.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/50">
                    <span className="text-slate-400">Documentation & Processing Fee</span>
                    <span className="font-semibold text-emerald-400">
                      ₹0 <span className="line-through text-slate-500 ml-1">₹999</span> (Waived)
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/50">
                    <span className="text-slate-400">Foreclosure Charges</span>
                    <span className="font-semibold text-emerald-400">₹0 (Zero Penalty)</span>
                  </div>
                  <div className="flex justify-between py-1 font-bold text-sm text-white pt-1">
                    <span>Total Amount Payable</span>
                    <span>₹{totalPayable.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                  <FaShieldAlt className="text-emerald-400 shrink-0 text-sm" />
                  <span>
                    Disbursed directly into your NeoBank main wallet. No hidden deductions or insurance add-ons.
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6 pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  disabled={summary.availableLimit < 10000 || amount > summary.availableLimit}
                  onClick={() => setApplyModalOpen(true)}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FaBolt className="text-base" />
                  Disburse ₹{amount.toLocaleString("en-IN")} Instantly
                </button>
              </div>
            </div>
          </div>

          {/* Active Loans & History Hub */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FaHistory className="text-cyan-400" />
                  My Credit Accounts & Loans
                </h3>
                <p className="text-xs text-slate-400">
                  Manage active repayment schedules, pay monthly EMIs or foreclose with zero charges
                </p>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
                {[
                  { id: "all", label: `All (${loans.length})` },
                  { id: "active", label: `Active (${summary.activeLoansCount})` },
                  { id: "closed", label: `Settled (${summary.closedLoansCount})` },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === t.id
                        ? "bg-slate-800 text-white shadow"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Loans Grid / Cards */}
            {filteredLoans.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800/80">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-500 text-2xl mb-3">
                  <FaHandHoldingUsd />
                </div>
                <h4 className="text-base font-bold text-white">No Loans Found</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {activeTab === "active"
                    ? "You do not have any active loans. You are completely debt-free!"
                    : "You haven't booked any loans yet. Use the simulator above to get instant pre-approved credit."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredLoans.map((loan) => {
                  const progressPct =
                    loan.total_emis > 0
                      ? Math.min(100, Math.round((loan.emis_paid / loan.total_emis) * 100))
                      : 0;

                  return (
                    <div
                      key={loan.id}
                      className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 transition-all space-y-4 relative overflow-hidden backdrop-blur-xl"
                    >
                      {/* Top Header of Card */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-300">
                              {loan.loan_account_no}
                            </span>
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                loan.status === "active"
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : "bg-slate-700/50 text-slate-300 border border-slate-600/30"
                              }`}
                            >
                              {loan.status === "active" ? "ACTIVE LOAN" : "CLOSED & SETTLED"}
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-white mt-1">{loan.purpose}</h4>
                          <p className="text-[11px] text-slate-400">
                            Disbursed:{" "}
                            {new Date(loan.disbursed_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-slate-400">Principal</p>
                          <p className="text-xl font-black text-white">
                            ₹{parseFloat(loan.principal_amount).toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>

                      {/* Repayment Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">
                            Repaid {loan.emis_paid} of {loan.total_emis} EMIs
                          </span>
                          <span className="font-semibold text-emerald-400">{progressPct}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              loan.status === "closed"
                                ? "bg-emerald-400"
                                : "bg-gradient-to-r from-emerald-500 to-cyan-500"
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Stats Row */}
                      <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center text-xs">
                        <div>
                          <p className="text-[10px] text-slate-400">Monthly EMI</p>
                          <p className="font-bold text-emerald-300 mt-0.5">
                            ₹{parseFloat(loan.emi_amount).toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">Remaining Debt</p>
                          <p className="font-bold text-white mt-0.5">
                            ₹{parseFloat(loan.remaining_amount).toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">Interest Rate</p>
                          <p className="font-bold text-slate-300 mt-0.5">{loan.interest_rate}%</p>
                        </div>
                      </div>

                      {/* Next EMI Badge or Closed Notice */}
                      {loan.status === "active" ? (
                        <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-purple-950/30 border border-purple-500/20 text-purple-200">
                          <span className="flex items-center gap-1.5">
                            <FaCalendarAlt className="text-purple-400" /> Next Due:{" "}
                            {new Date(loan.next_emi_date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          <span className="font-semibold text-purple-300">Auto-Debit Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-emerald-200">
                          <span className="flex items-center gap-1.5">
                            <FaCheckCircle className="text-emerald-400" /> Fully Settled & Closed
                          </span>
                          <span className="font-semibold text-emerald-300">NOC Available</span>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
                        {loan.status === "active" && (
                          <>
                            <button
                              type="button"
                              onClick={() => setPayEmiModal(loan)}
                              className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                            >
                              <FaCheck /> Pay EMI (₹{parseFloat(loan.emi_amount).toLocaleString("en-IN")})
                            </button>
                            <button
                              type="button"
                              onClick={() => setForecloseModal(loan)}
                              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-all flex items-center justify-center gap-1"
                            >
                              Foreclose
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => openScheduleModal(loan)}
                          className="py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-all flex items-center justify-center gap-1.5"
                        >
                          <FaReceipt /> Schedule
                        </button>

                        {loan.status === "closed" && (
                          <button
                            type="button"
                            onClick={() => openNocModal(loan)}
                            className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/20"
                          >
                            <FaAward /> Download NOC Certificate
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* MODAL 1: Confirm Disbursal Modal */}
      {applyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FaBolt className="text-emerald-400" />
                Confirm Instant Disbursal
              </h3>
              <button
                onClick={() => setApplyModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
              <p className="text-xs text-slate-400">Total In-Hand Disbursal Amount</p>
              <p className="text-3xl font-extrabold text-emerald-400">
                ₹{amount.toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] text-slate-400">
                100% credited to your NeoBank wallet instantly
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Tenure</span>
                <span className="font-semibold text-white">{tenure} Months</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Monthly EMI</span>
                <span className="font-semibold text-emerald-400">
                  ₹{currentEmi.toLocaleString("en-IN")} / mo
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Purpose</span>
                <span className="font-semibold text-white">{purpose}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">First EMI Due Date</span>
                <span className="font-semibold text-white">
                  {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
              <FaShieldAlt className="text-emerald-400 shrink-0 text-sm mt-0.5" />
              <span>
                By clicking Confirm, you authorize the credit disbursal and agree to the 11.49% p.a.
                reducing-balance terms. No pre-closure penalty applies.
              </span>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setApplyModalOpen(false)}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleApplyLoan}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {submitting ? "Disbursing..." : "Confirm & Disburse Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Pay Single EMI Modal */}
      {payEmiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FaReceipt className="text-emerald-400" />
                Pay Monthly EMI
              </h3>
              <button
                onClick={() => setPayEmiModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-1">
              <p className="text-xs text-slate-400">Debit Amount for EMI #{payEmiModal.emis_paid + 1}</p>
              <p className="text-3xl font-extrabold text-emerald-400">
                ₹{parseFloat(payEmiModal.emi_amount).toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] text-slate-400">
                Will be debited from your current wallet balance: ₹{summary.balance.toLocaleString("en-IN")}
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Loan Account</span>
                <span className="font-mono font-semibold text-white">
                  {payEmiModal.loan_account_no}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Progress After Payment</span>
                <span className="font-semibold text-emerald-400">
                  {payEmiModal.emis_paid + 1} of {payEmiModal.total_emis} EMIs Completed
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Credit Score Reward</span>
                <span className="font-semibold text-emerald-400">+3 Points Boost</span>
              </div>
            </div>

            {summary.balance < parseFloat(payEmiModal.emi_amount) && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2">
                <FaExclamationTriangle className="shrink-0" />
                <span>
                  Insufficient balance. Please add funds to your wallet to complete this payment.
                </span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPayEmiModal(null)}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting || summary.balance < parseFloat(payEmiModal.emi_amount)}
                onClick={() => handlePayEmi(payEmiModal.id)}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {submitting ? "Processing..." : "Pay EMI Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Foreclose Modal */}
      {forecloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FaShieldAlt className="text-cyan-400" />
                Foreclose Loan in Full
              </h3>
              <button
                onClick={() => setForecloseModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-center space-y-1">
              <p className="text-xs text-slate-400">Total Settlement Balance</p>
              <p className="text-3xl font-extrabold text-cyan-300">
                ₹{parseFloat(forecloseModal.remaining_amount).toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] text-emerald-400 font-semibold">
                0% Foreclosure Penalty • Full Debt Clearance
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Loan Account</span>
                <span className="font-mono font-semibold text-white">
                  {forecloseModal.loan_account_no}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Prepayment Penalty</span>
                <span className="font-semibold text-emerald-400">₹0 (Zero Charges)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">CIBIL Score Reward</span>
                <span className="font-semibold text-emerald-400">+10 Points Boost</span>
              </div>
            </div>

            {summary.balance < parseFloat(forecloseModal.remaining_amount) && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2">
                <FaExclamationTriangle className="shrink-0" />
                <span>Insufficient balance for full foreclosure settlement.</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setForecloseModal(null)}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting || summary.balance < parseFloat(forecloseModal.remaining_amount)}
                onClick={() => handleForeclose(forecloseModal.id)}
                className="flex-1 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {submitting ? "Processing..." : "Confirm Foreclosure"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Amortization Schedule Modal */}
      {scheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-3xl max-h-[85vh] p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FaReceipt className="text-emerald-400" />
                  Repayment Amortization Schedule
                </h3>
                <p className="text-xs text-slate-400">
                  Account: {scheduleModal.loan.loan_account_no} • {scheduleModal.loan.purpose}
                </p>
              </div>
              <button
                onClick={() => setScheduleModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <FaTimes />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">EMI #</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3 text-right">EMI Amount</th>
                    <th className="py-2.5 px-3 text-right">Principal</th>
                    <th className="py-2.5 px-3 text-right">Interest</th>
                    <th className="py-2.5 px-3 text-right">Remaining</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {scheduleModal.schedule.map((item) => (
                    <tr key={item.emiNumber} className="hover:bg-slate-800/30">
                      <td className="py-2 px-3 font-mono font-bold text-slate-300">
                        #{item.emiNumber}
                      </td>
                      <td className="py-2 px-3 text-slate-400">{item.dueDate}</td>
                      <td className="py-2 px-3 text-right font-semibold text-white">
                        ₹{item.emiAmount.toLocaleString("en-IN")}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-300">
                        ₹{item.principalComponent.toLocaleString("en-IN")}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-400">
                        ₹{item.interestComponent.toLocaleString("en-IN")}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-300">
                        ₹{item.remainingBalance.toLocaleString("en-IN")}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            item.status === "Paid"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setScheduleModal(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-all"
              >
                Close Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Official No Objection Certificate (NOC) */}
      {nocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-2xl p-8 rounded-3xl bg-slate-900 border-2 border-emerald-500/30 shadow-2xl space-y-6 relative overflow-hidden">
            {/* Watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none select-none">
              <span className="text-8xl font-black rotate-[-25deg] text-emerald-400">
                PAID &amp; SETTLED
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-2xl">
                  <FaAward />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">NO OBJECTION CERTIFICATE (NOC)</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Certificate ID: {nocModal.certificateId}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setNocModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <p>
                This document certifies that the customer detailed below has completely and
                satisfactorily liquidated and settled all principal, interest, and ancillary
                liabilities with <strong className="text-white">{nocModal.lenderName}</strong> under
                the subject credit facility:
              </p>

              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase">Borrower Name</p>
                  <p className="font-bold text-white mt-0.5">{nocModal.borrowerName}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase">Loan Account No.</p>
                  <p className="font-mono font-bold text-emerald-400 mt-0.5">
                    {nocModal.loanAccountNo}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase">Principal Borrowed</p>
                  <p className="font-bold text-white mt-0.5">
                    ₹{nocModal.principalAmount.toLocaleString("en-IN")}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase">Closure Status</p>
                  <p className="font-bold text-emerald-400 mt-0.5">FULL &amp; FINAL SETTLEMENT</p>
                </div>
              </div>

              <p>
                As of <strong className="text-white">{new Date(nocModal.closedDate).toLocaleDateString("en-IN")}</strong>,
                there are zero outstanding dues or claims pending against this loan account. All
                credit bureau registries (CIBIL, Experian, Equifax, CRIF) have been officially
                notified of complete discharge.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">{nocModal.authorizedSignatory}</p>
                <p className="text-[10px] text-slate-500">RBI Regulated NBFC Lending Partner</p>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5"
              >
                <FaDownload /> Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
