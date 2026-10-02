import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import NotificationBell from "../components/NotificationBell";
import {
  FaBalanceScale,
  FaFileInvoiceDollar,
  FaCalendarCheck,
  FaCheckCircle,
  FaSlidersH,
  FaUniversity,
  FaShieldAlt,
  FaTimes,
  FaPrint,
  FaArrowRight,
  FaBolt,
  FaWallet,
  FaInfoCircle,
  FaExclamationTriangle,
  FaDownload,
  FaCoins,
} from "react-icons/fa";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1"
    ? "https://banking-dashboard-anuc.vercel.app/api"
    : "http://localhost:5000/api");

export default function TaxPlanner() {
  const { user, token } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Tax Overview Data
  const [taxData, setTaxData] = useState({
    financialYear: "2025-26",
    assessmentYear: "2026-27",
    grossIncome: 1250000,
    salaryComponent: 1250000,
    fdInterestComponent: 0,
    preferredRegime: "new",
    recommendedRegime: "new",
    taxSavings: 18400,
    newRegime: {
      grossIncome: 1250000,
      deductions: 75000,
      taxableIncome: 1175000,
      baseTax: 76250,
      cess: 3050,
      totalTax: 79300,
    },
    oldRegime: {
      grossIncome: 1250000,
      deductions: 275000,
      taxableIncome: 975000,
      baseTax: 107500,
      cess: 4300,
      totalTax: 111800,
      deductionBreakdown: {
        standardDeduction: 50000,
        sec80C: 150000,
        sec80D: 25000,
        secNPS: 50000,
        homeLoan: 0,
        hra: 0,
      },
    },
    advanceTaxCalendar: [],
    advancePaid: 0,
    balance: 50000,
    challans: [],
  });

  // Deduction Form State
  const [sec80C, setSec80C] = useState(150000);
  const [sec80D, setSec80D] = useState(25000);
  const [secNPS, setSecNPS] = useState(50000);
  const [homeLoan, setHomeLoan] = useState(0);
  const [hra, setHra] = useState(0);
  const [savingDeductions, setSavingDeductions] = useState(false);

  // Pay Advance Tax Modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState(15000);
  const [payingTax, setPayingTax] = useState(false);
  const [generatedChallan, setGeneratedChallan] = useState(null);

  // Toast
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = "success") => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchTaxOverview = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/tax/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTaxData(res.data);

      if (res.data.taxProfile) {
        setSec80C(Number(res.data.taxProfile.declared_80c) || 150000);
        setSec80D(Number(res.data.taxProfile.declared_80d) || 25000);
        setSecNPS(Number(res.data.taxProfile.declared_nps) || 50000);
        setHomeLoan(Number(res.data.taxProfile.home_loan_interest) || 0);
        setHra(Number(res.data.taxProfile.declared_hra) || 0);
      }
    } catch (err) {
      console.error("Failed to load tax overview:", err);
      showToast("Unable to load tax overview", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchTaxOverview();
  }, [token]);

  // Handle Switch Regime
  const handleSelectRegime = async (regime) => {
    try {
      await axios.post(
        `${API_BASE}/tax/update-profile`,
        { preferredRegime: regime },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast(`Selected ${regime.toUpperCase()} Tax Regime as default!`);
      await fetchTaxOverview();
    } catch (err) {
      showToast("Failed to switch regime", "error");
    }
  };

  // Handle Save Deductions
  const handleSaveDeductions = async (e) => {
    e.preventDefault();
    try {
      setSavingDeductions(true);
      await axios.post(
        `${API_BASE}/tax/update-profile`,
        {
          declared80C: Number(sec80C),
          declared80D: Number(sec80D),
          declaredNps: Number(secNPS),
          homeLoanInterest: Number(homeLoan),
          declaredHra: Number(hra),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast("Tax deductions updated & recalculated!");
      await fetchTaxOverview();
    } catch (err) {
      showToast("Failed to update deductions", "error");
    } finally {
      setSavingDeductions(false);
    }
  };

  // Handle Pay Advance Tax
  const handlePayTax = async () => {
    try {
      setPayingTax(true);
      const res = await axios.post(
        `${API_BASE}/tax/pay-advance-tax`,
        { amount: payAmount },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGeneratedChallan(res.data.challan);
      showToast(res.data.message);
      await fetchTaxOverview();
    } catch (err) {
      showToast(err.response?.data?.message || "Tax payment failed", "error");
    } finally {
      setPayingTax(false);
    }
  };

  const selectedTax =
    taxData.preferredRegime === "new"
      ? taxData.newRegime.totalTax
      : taxData.oldRegime.totalTax;

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden">
      {/* Toast */}
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

      {/* Challan 280 Receipt Modal */}
      {generatedChallan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-slate-900 border-2 border-emerald-500/30 shadow-2xl space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg">
                  <FaUniversity />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">ITNS 280 TAX CHALLAN</h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Income Tax Department, Govt of India
                  </p>
                </div>
              </div>
              <button
                onClick={() => setGeneratedChallan(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
              <p className="text-xs text-slate-400">Total Advance Tax Deposited</p>
              <p className="text-3xl font-extrabold text-emerald-400">
                ₹{parseFloat(generatedChallan.amount).toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] text-slate-300 font-semibold">
                Status: FULL PAYMENT RECEIVED (RBI Regulated Gateway)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Challan Ref</p>
                <p className="font-mono font-bold text-white">{generatedChallan.challan_no}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase">CIN Number</p>
                <p className="font-mono font-bold text-emerald-400">{generatedChallan.cin}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase">BSR Code</p>
                <p className="font-mono font-bold text-white">{generatedChallan.bsr_code}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Assessment Year</p>
                <p className="font-bold text-white">{generatedChallan.assessment_year}</p>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setGeneratedChallan(null)}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs"
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <FaDownload /> Print ITNS 280
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Advance Tax Modal */}
      {payModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FaUniversity className="text-emerald-400" />
                Pay Advance Tax (Challan 280)
              </h3>
              <button
                onClick={() => setPayModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-1">
              <p className="text-xs text-slate-400">Advance Tax Payment Amount</p>
              <div className="relative max-w-[200px] mx-auto">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">
                  ₹
                </span>
                <input
                  type="number"
                  min="100"
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 text-2xl font-black text-center text-emerald-400 bg-transparent border-b border-emerald-500 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Available Wallet Balance: ₹{taxData.balance.toLocaleString("en-IN")}
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Financial Year</span>
                <span className="font-bold text-white">{taxData.financialYear}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Major Head</span>
                <span className="font-semibold text-white">0021 (Income Tax - Other than Companies)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Minor Head</span>
                <span className="font-semibold text-emerald-400">100 (Advance Tax)</span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPayModalOpen(false)}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={payingTax || payAmount < 100 || taxData.balance < payAmount}
                onClick={async () => {
                  await handlePayTax();
                  setPayModalOpen(false);
                }}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <FaBolt />
                {payingTax ? "Processing..." : `Pay ₹${payAmount.toLocaleString("en-IN")}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />

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
                  <FaBalanceScale className="text-emerald-400" />
                  Smart Tax Optimizer &amp; Advance Tax Hub
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  FY {taxData.financialYear}
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Budget 2025 slabs • New vs Old Regime comparison • Direct ITNS 280 Advance Tax
                settlement
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
              <FaWallet className="text-blue-400" />
              <span className="text-slate-400">Balance:</span>
              <span className="font-semibold text-emerald-400">
                ₹{taxData.balance.toLocaleString("en-IN")}
              </span>
            </div>
            <NotificationBell />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Smart Recommendation Banner */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-indigo-950/50 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-2xl shrink-0">
                <FaBolt />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  💡 Tax Savings Recommendation: Choose the{" "}
                  <span className="uppercase text-emerald-400">
                    {taxData.recommendedRegime} Tax Regime
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  You save approximately{" "}
                  <strong className="text-emerald-400 font-bold">
                    ₹{taxData.taxSavings.toLocaleString("en-IN")}
                  </strong>{" "}
                  in income tax by selecting the {taxData.recommendedRegime.toUpperCase()} regime.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleSelectRegime(taxData.recommendedRegime)}
              className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20 whitespace-nowrap"
            >
              Apply Recommended Regime
            </button>
          </div>

          {/* Section 1: Side-by-Side Regime Comparator Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CARD 1: NEW TAX REGIME */}
            <div
              className={`p-6 rounded-3xl border transition-all space-y-5 relative backdrop-blur-xl ${
                taxData.preferredRegime === "new"
                  ? "bg-slate-900/90 border-emerald-500/60 shadow-xl shadow-emerald-500/10"
                  : "bg-slate-900/50 border-slate-800/80 hover:border-slate-700"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">New Tax Regime</h3>
                    {taxData.recommendedRegime === "new" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        RECOMMENDED
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Budget 2025 Slabs • Zero paperwork</p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-slate-400">Total Tax Payable</p>
                  <p className="text-2xl font-black text-emerald-400">
                    ₹{taxData.newRegime.totalTax.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              {/* Slabs Breakdown */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Gross Estimated Income</span>
                  <span className="font-semibold text-white">
                    ₹{taxData.grossIncome.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Standard Deduction</span>
                  <span className="font-semibold text-emerald-400">-₹75,000 (Flat)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Net Taxable Income</span>
                  <span className="font-bold text-white">
                    ₹{taxData.newRegime.taxableIncome.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Base Income Tax</span>
                  <span className="font-semibold text-slate-200">
                    ₹{taxData.newRegime.baseTax.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Health &amp; Education Cess (4%)</span>
                  <span className="font-semibold text-slate-400">
                    ₹{taxData.newRegime.cess.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSelectRegime("new")}
                className={`w-full py-3 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                  taxData.preferredRegime === "new"
                    ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20"
                    : "bg-slate-800 hover:bg-slate-700 text-white"
                }`}
              >
                {taxData.preferredRegime === "new" ? (
                  <>
                    <FaCheckCircle /> Currently Active Regime
                  </>
                ) : (
                  "Switch to New Regime"
                )}
              </button>
            </div>

            {/* CARD 2: OLD TAX REGIME */}
            <div
              className={`p-6 rounded-3xl border transition-all space-y-5 relative backdrop-blur-xl ${
                taxData.preferredRegime === "old"
                  ? "bg-slate-900/90 border-emerald-500/60 shadow-xl shadow-emerald-500/10"
                  : "bg-slate-900/50 border-slate-800/80 hover:border-slate-700"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">Old Tax Regime</h3>
                    {taxData.recommendedRegime === "old" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        RECOMMENDED
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Section 80C, 80D, HRA &amp; Home Loan
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-slate-400">Total Tax Payable</p>
                  <p className="text-2xl font-black text-white">
                    ₹{taxData.oldRegime.totalTax.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              {/* Slabs Breakdown */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Gross Estimated Income</span>
                  <span className="font-semibold text-white">
                    ₹{taxData.grossIncome.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Standard Deduction</span>
                  <span className="font-semibold text-slate-300">-₹50,000</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Total Deductions (80C, 80D, NPS)</span>
                  <span className="font-semibold text-emerald-400">
                    -₹{(taxData.oldRegime.deductions - 50000).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Net Taxable Income</span>
                  <span className="font-bold text-white">
                    ₹{taxData.oldRegime.taxableIncome.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Total Tax + Cess</span>
                  <span className="font-semibold text-slate-300">
                    ₹{taxData.oldRegime.totalTax.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSelectRegime("old")}
                className={`w-full py-3 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                  taxData.preferredRegime === "old"
                    ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20"
                    : "bg-slate-800 hover:bg-slate-700 text-white"
                }`}
              >
                {taxData.preferredRegime === "old" ? (
                  <>
                    <FaCheckCircle /> Currently Active Regime
                  </>
                ) : (
                  "Switch to Old Regime"
                )}
              </button>
            </div>
          </div>

          {/* Section 2: Advance Tax Calendar & Payment Hub */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FaCalendarCheck className="text-emerald-400" />
                  Advance Tax Compliance &amp; Challan 280
                </h3>
                <p className="text-xs text-slate-400">
                  Pay quarterly installments directly to avoid Section 234B &amp; 234C interest penalties
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPayModalOpen(true)}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
              >
                <FaUniversity /> Pay Advance Tax Now
              </button>
            </div>

            {/* 4 Quarters Progress Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {taxData.advanceTaxCalendar.map((q) => {
                return (
                  <div
                    key={q.quarter}
                    className={`p-4 rounded-2xl border transition-all ${
                      q.status === "PAID"
                        ? "bg-emerald-950/20 border-emerald-500/30"
                        : "bg-slate-950/60 border-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xs text-white">{q.label}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          q.status === "PAID"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {q.status}
                      </span>
                    </div>

                    <p className="text-xl font-black text-white mt-1">
                      ₹{q.targetAmount.toLocaleString("en-IN")}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">Due: {q.dueDate}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Deduction Optimizer Studio (Sliders) */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FaSlidersH className="text-amber-400" />
                  Deduction Optimizer Studio
                </h3>
                <p className="text-xs text-slate-400">
                  Simulate your investments across Section 80C, 80D Mediclaim, NPS &amp; Home Loan
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-400">Applies to Old Regime</span>
            </div>

            <form onSubmit={handleSaveDeductions} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 80C */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-300">
                      Section 80C (PPF, ELSS, 5-Yr Fixed Deposit)
                    </span>
                    <span className="font-bold text-emerald-400">
                      ₹{sec80C.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="150000"
                    step="5000"
                    value={sec80C}
                    onChange={(e) => setSec80C(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>₹0</span>
                    <span>Max: ₹1,50,000</span>
                  </div>
                </div>

                {/* 80D */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-300">
                      Section 80D (Health Insurance Mediclaim)
                    </span>
                    <span className="font-bold text-emerald-400">
                      ₹{sec80D.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25000"
                    step="1000"
                    value={sec80D}
                    onChange={(e) => setSec80D(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>₹0</span>
                    <span>Max: ₹25,000</span>
                  </div>
                </div>

                {/* NPS 80CCD(1B) */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-300">
                      Section 80CCD(1B) (National Pension Scheme)
                    </span>
                    <span className="font-bold text-emerald-400">
                      ₹{secNPS.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50000"
                    step="2500"
                    value={secNPS}
                    onChange={(e) => setSecNPS(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>₹0</span>
                    <span>Max: ₹50,000</span>
                  </div>
                </div>

                {/* Home Loan Section 24b */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-300">
                      Section 24(b) (Home Loan Interest Deduction)
                    </span>
                    <span className="font-bold text-emerald-400">
                      ₹{homeLoan.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200000"
                    step="10000"
                    value={homeLoan}
                    onChange={(e) => setHomeLoan(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>₹0</span>
                    <span>Max: ₹2,00,000</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingDeductions}
                  className="py-3 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {savingDeductions ? "Updating..." : "Recalculate & Save Profile"}
                </button>
              </div>
            </form>
          </div>

          {/* Section 4: Paid Challans 280 History */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FaReceipt className="text-emerald-400" />
                Income Tax Challans (ITNS 280) History
              </h3>
              <span className="text-xs text-slate-400">
                {taxData.challans.length} Paid Challans
              </span>
            </div>

            {taxData.challans.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No advance tax payments made yet. Use the Pay Advance Tax button above to deposit
                quarterly installments.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Challan No</th>
                      <th className="py-2.5 px-3">CIN Ref</th>
                      <th className="py-2.5 px-3">Tax Type</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {taxData.challans.map((ch) => (
                      <tr key={ch.id} className="hover:bg-slate-800/30">
                        <td className="py-2 px-3 text-slate-400">
                          {new Date(ch.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-white">
                          {ch.challan_no}
                        </td>
                        <td className="py-2 px-3 font-mono text-emerald-400">{ch.cin}</td>
                        <td className="py-2 px-3 text-slate-300">{ch.tax_type}</td>
                        <td className="py-2 px-3 text-right font-black text-white">
                          ₹{parseFloat(ch.amount).toLocaleString("en-IN")}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            DEPOSITED
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
