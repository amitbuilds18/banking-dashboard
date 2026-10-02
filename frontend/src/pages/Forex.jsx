import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import NotificationBell from "../components/NotificationBell";
import {
  FaGlobe,
  FaExchangeAlt,
  FaPaperPlane,
  FaShieldAlt,
  FaCheckCircle,
  FaHistory,
  FaTimes,
  FaArrowRight,
  FaCoins,
  FaChartLine,
  FaInfoCircle,
  FaWallet,
} from "react-icons/fa";

const API_BASE = "http://localhost:5000/api";

export default function Forex() {
  const { user, token } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [portfolioData, setPortfolioData] = useState(null);
  const [transactions, setTransactions] = useState([]);

  // Converter Form State
  const [fromCurr, setFromCurr] = useState("INR");
  const [toCurr, setToCurr] = useState("USD");
  const [amount, setAmount] = useState(10000);
  const [quote, setQuote] = useState(null);
  const [converting, setConverting] = useState(false);

  // Modals
  const [transferModal, setTransferModal] = useState(false);
  const [transferData, setTransferData] = useState({
    currency: "USD",
    amount: 100,
    recipientName: "",
    recipientEmail: "",
    ibanOrSwift: "",
    purpose: "Family Support / Personal",
  });
  const [transferLoading, setTransferLoading] = useState(false);

  const [toastMessage, setToastMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Fetch Wallets & FX History
  const fetchForexData = async () => {
    try {
      setLoading(true);
      const [walletRes, txRes] = await Promise.all([
        axios.get(`${API_BASE}/forex/wallets`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE}/forex/transactions`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (walletRes.data.success) {
        setPortfolioData(walletRes.data);
      }
      if (txRes.data.success) {
        setTransactions(txRes.data.transactions || []);
      }
    } catch (err) {
      console.error("Forex fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchForexData();
    }
  }, [token]);

  // Fetch Live Quote when inputs change
  useEffect(() => {
    if (!token || !fromCurr || !toCurr || fromCurr === toCurr || !amount || Number(amount) <= 0) {
      setQuote(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(
          `${API_BASE}/forex/quote?from=${fromCurr}&to=${toCurr}&amount=${amount}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data.success) {
          setQuote(res.data);
        }
      } catch (err) {
        console.error("Quote fetch error:", err);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [token, fromCurr, toCurr, amount]);

  // Swap Currencies
  const handleSwap = () => {
    setFromCurr(toCurr);
    setToCurr(fromCurr);
  };

  // Execute Conversion
  const handleConvert = async (e) => {
    e.preventDefault();
    try {
      setConverting(true);
      setErrorMessage(null);

      const res = await axios.post(
        `${API_BASE}/forex/convert`,
        {
          fromCurrency: fromCurr,
          toCurrency: toCurr,
          amount: Number(amount),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        showToast(res.data.message);
        fetchForexData();
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.error || "Currency conversion failed.");
    } finally {
      setConverting(false);
    }
  };

  // Execute International Transfer
  const handleSendTransfer = async (e) => {
    e.preventDefault();
    try {
      setTransferLoading(true);
      setErrorMessage(null);

      const res = await axios.post(
        `${API_BASE}/forex/transfer`,
        transferData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setTransferModal(false);
        showToast(
          `🌐 Transferred ${transferData.amount} ${transferData.currency} to ${transferData.recipientName}! Ref: ${res.data.referenceId}`
        );
        fetchForexData();
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.error || "Transfer failed.");
    } finally {
      setTransferLoading(false);
    }
  };

  const wallets = portfolioData?.wallets || [];
  const rates = portfolioData?.rates || {};

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
            <div className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

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
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-600 to-cyan-500 text-2xl text-white shadow-lg shadow-cyan-500/20">
                    <FaGlobe />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400">
                        Multi-Currency Borderless Banking
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                        Live Mid-Market Rates
                      </span>
                    </div>
                    <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                      Forex & Global Currency Wallets
                    </h1>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Convert between 8 global currencies instantly with transparent 0.25% fee and send worldwide SWIFT wires.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setTransferModal(true)}
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110 active:scale-95"
                >
                  <FaPaperPlane className="text-xs" />
                  <span>Send International</span>
                </button>
                <NotificationBell />
              </div>
            </div>
          </header>

          {/* Toast Message */}
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

          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Total Portfolio (INR)</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                  <FaWallet />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-white">
                ₹{(portfolioData?.totalPortfolioInr || 0).toLocaleString("en-IN")}
              </p>
              <div className="mt-1 text-xs text-slate-400">Combined global net worth</div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">USD Equivalent</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <FaCoins />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-emerald-400">
                ${(portfolioData?.totalPortfolioUsd || 0).toLocaleString("en-US")}
              </p>
              <div className="mt-1 text-xs text-slate-400">Valued at current mid-market spot</div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Active Currency Wallets</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                  <FaGlobe />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-purple-400">
                {wallets.filter((w) => w.balance > 0).length} / {wallets.length}
              </p>
              <div className="mt-1 text-xs text-slate-400">Available: USD, EUR, GBP, AED, JPY...</div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Exchange Spread Fee</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                  <FaChartLine />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-amber-400">0.25%</p>
              <div className="mt-1 text-xs text-slate-400">Zero hidden markups or spreads</div>
            </div>
          </div>

          {/* Interactive Converter Studio */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left: Converter Form */}
            <div className="lg:col-span-7 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                    <FaExchangeAlt />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Instant Currency Exchange</h2>
                    <p className="text-xs text-slate-400">Real-time conversion with atomic execution</p>
                  </div>
                </div>
                <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-bold text-cyan-300">
                  Instant Settlement
                </span>
              </div>

              <form onSubmit={handleConvert} className="mt-6 space-y-4">
                {/* From / To Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-11 gap-3 items-center">
                  {/* From Currency */}
                  <div className="sm:col-span-5 space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      You Send ({fromCurr})
                    </label>
                    <select
                      value={fromCurr}
                      onChange={(e) => setFromCurr(e.target.value)}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 p-3.5 text-sm font-bold text-white focus:border-cyan-400 focus:outline-none"
                    >
                      {wallets.map((w) => (
                        <option key={w.currency} value={w.currency}>
                          {w.flag} {w.currency} — {w.name} (Bal: {w.symbol}{w.balance.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Swap Button */}
                  <div className="sm:col-span-1 flex justify-center pt-4 sm:pt-6">
                    <button
                      type="button"
                      onClick={handleSwap}
                      className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-slate-300 transition hover:bg-slate-700 hover:text-white"
                      title="Swap currencies"
                    >
                      <FaExchangeAlt />
                    </button>
                  </div>

                  {/* To Currency */}
                  <div className="sm:col-span-5 space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      You Receive ({toCurr})
                    </label>
                    <select
                      value={toCurr}
                      onChange={(e) => setToCurr(e.target.value)}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 p-3.5 text-sm font-bold text-white focus:border-cyan-400 focus:outline-none"
                    >
                      {wallets.map((w) => (
                        <option key={w.currency} value={w.currency}>
                          {w.flag} {w.currency} — {w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Amount Input */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold uppercase tracking-wider text-slate-400">
                      Conversion Amount
                    </span>
                    <span className="text-slate-400">
                      Available: {rates[fromCurr]?.symbol}
                      {wallets.find((w) => w.currency === fromCurr)?.balance.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                      {rates[fromCurr]?.symbol}
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      required
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 py-3.5 pl-10 pr-4 text-xl font-black text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  {/* Quick Presets */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[1000, 5000, 10000, 25000, 50000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAmount(preset)}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                          amount === preset
                            ? "border-cyan-400 bg-cyan-400/10 text-cyan-300"
                            : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-white"
                        }`}
                      >
                        {rates[fromCurr]?.symbol}{preset.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                {errorMessage && (
                  <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs font-semibold text-rose-300">
                    {errorMessage}
                  </div>
                )}

                {/* Action CTA */}
                <button
                  type="submit"
                  disabled={converting || fromCurr === toCurr || !amount || amount <= 0}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 py-4 font-black text-white shadow-xl shadow-cyan-500/20 transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span>{converting ? "Executing Exchange..." : "Convert Now"}</span>
                  <FaArrowRight className="text-sm" />
                </button>
              </form>
            </div>

            {/* Right: Live Rate Projection */}
            <div className="lg:col-span-5 flex flex-col justify-between rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950/90 p-6 shadow-2xl backdrop-blur-xl">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                    Live Rate Breakdown
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                    ● Real-Time Quote
                  </span>
                </div>

                {/* Expected Received Box */}
                <div className="mt-6 rounded-2xl border border-slate-800/80 bg-slate-950/70 p-5 text-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Estimated Received Amount
                  </p>
                  <p className="mt-2 text-4xl font-black text-cyan-400">
                    {rates[toCurr]?.symbol}
                    {quote?.toAmount ? quote.toAmount.toLocaleString() : "0.00"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400 font-mono">
                    1 {fromCurr} = {quote?.exchangeRate || "--"} {toCurr}
                  </p>
                </div>

                {/* Details Breakdown */}
                <div className="mt-6 space-y-3 divide-y divide-slate-800/80 text-sm">
                  <div className="flex justify-between pt-2">
                    <span className="text-slate-400">Transfer Amount</span>
                    <span className="font-bold text-white">
                      {rates[fromCurr]?.symbol}{Number(amount || 0).toLocaleString()} {fromCurr}
                    </span>
                  </div>
                  <div className="flex justify-between pt-3">
                    <span className="text-slate-400">Transparent Fee (0.25%)</span>
                    <span className="font-bold text-slate-300">
                      {rates[fromCurr]?.symbol}{quote?.fee || "0.00"} {fromCurr}
                    </span>
                  </div>
                  <div className="flex justify-between pt-3">
                    <span className="text-slate-400">Net Converted</span>
                    <span className="font-bold text-emerald-400">
                      {rates[fromCurr]?.symbol}{quote?.netAmount ? quote.netAmount.toLocaleString() : "0.00"} {fromCurr}
                    </span>
                  </div>
                  <div className="flex justify-between pt-3">
                    <span className="text-slate-400">Inverse Spot Rate</span>
                    <span className="font-mono text-slate-300">
                      1 {toCurr} = {quote?.inverseRate || "--"} {fromCurr}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Guarantee */}
              <div className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
                <div className="flex items-start gap-3">
                  <FaShieldAlt className="mt-0.5 text-base text-cyan-400 shrink-0" />
                  <p className="text-xs leading-relaxed text-slate-300">
                    Funds are instantly exchanged into your dedicated currency wallet. You can spend, hold, or wire out funds globally anytime with zero maintenance charges.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Currency Wallets Grid */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-black text-white">Your Global Currency Wallets</h2>
                <p className="text-xs text-slate-400">
                  Individual balances with live INR valuation and instant actions
                </p>
              </div>
            </div>

            {loading ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-12 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
                <p className="mt-3 text-sm text-slate-400">Loading your multi-currency wallets...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {wallets.map((w) => (
                  <div
                    key={w.currency}
                    className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-5 shadow-xl backdrop-blur-xl transition hover:border-slate-700"
                  >
                    {/* Header: Flag + Code + Trend */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{w.flag}</span>
                        <div>
                          <h3 className="font-black text-white">{w.currency}</h3>
                          <p className="text-[10px] text-slate-400 truncate max-w-[100px]">{w.name}</p>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold ${
                          w.change24h?.startsWith("+")
                            ? "text-emerald-400"
                            : w.change24h?.startsWith("-")
                            ? "text-rose-400"
                            : "text-slate-400"
                        }`}
                      >
                        {w.change24h}
                      </span>
                    </div>

                    {/* Balance */}
                    <div className="mt-4">
                      <p className="text-xl font-black text-white">
                        {w.symbol}{w.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        ≈ ₹{w.inrEquivalent.toLocaleString("en-IN")} INR
                      </p>
                    </div>

                    {/* Spot Rate */}
                    <div className="mt-3 flex justify-between border-t border-slate-800/80 pt-2 text-[11px] text-slate-400">
                      <span>Rate:</span>
                      <span className="font-mono text-slate-200">1 {w.currency} = ₹{w.rateToInr}</span>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setFromCurr("INR");
                          setToCurr(w.currency);
                          window.scrollTo({ top: 300, behavior: "smooth" });
                        }}
                        className="flex-1 rounded-xl bg-slate-800 py-2 text-center text-xs font-bold text-slate-200 hover:bg-slate-700"
                      >
                        Convert
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTransferData({ ...transferData, currency: w.currency });
                          setTransferModal(true);
                        }}
                        className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20"
                        title="Send International Wire"
                      >
                        <FaPaperPlane className="text-xs" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity / Transaction History */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white">Recent Forex & Global Wire Activity</h2>
            </div>

            {transactions.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center text-xs text-slate-400">
                No forex conversions or international transfers executed yet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Reference</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">From</th>
                      <th className="p-4">To</th>
                      <th className="p-4">Exchange Rate</th>
                      <th className="p-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-800/40">
                        <td className="p-4 font-mono font-bold text-white">{t.reference_id}</td>
                        <td className="p-4">
                          <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300 uppercase">
                            {t.type}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-rose-400">
                          -{t.from_amount} {t.from_currency}
                        </td>
                        <td className="p-4 font-bold text-emerald-400">
                          +{t.to_amount} {t.to_currency}
                        </td>
                        <td className="p-4 font-mono text-slate-300">{t.exchange_rate}</td>
                        <td className="p-4 text-slate-400">
                          {new Date(t.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SWIFT / International Transfer Modal */}
      {transferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-xl text-cyan-400">
                  <FaPaperPlane />
                </span>
                <div>
                  <h3 className="text-lg font-black text-white">Send International Wire</h3>
                  <p className="text-xs text-slate-400">Cross-border SWIFT payment</p>
                </div>
              </div>
              <button
                onClick={() => setTransferModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSendTransfer} className="mt-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold uppercase tracking-wider text-slate-400">Currency</label>
                  <select
                    value={transferData.currency}
                    onChange={(e) => setTransferData({ ...transferData, currency: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 font-bold text-white focus:border-cyan-400 focus:outline-none"
                  >
                    {wallets.map((w) => (
                      <option key={w.currency} value={w.currency}>
                        {w.flag} {w.currency} (Bal: {w.balance})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold uppercase tracking-wider text-slate-400">Amount</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={transferData.amount}
                    onChange={(e) => setTransferData({ ...transferData, amount: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 font-bold text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-slate-400">Recipient Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe / Global Corp Ltd"
                  value={transferData.recipientName}
                  onChange={(e) => setTransferData({ ...transferData, recipientName: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 font-bold text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-slate-400">Recipient Email (for Advice Receipt)</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. john.doe@example.com"
                  value={transferData.recipientEmail}
                  onChange={(e) => setTransferData({ ...transferData, recipientEmail: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 font-bold text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-slate-400">SWIFT/BIC or IBAN</label>
                <input
                  type="text"
                  placeholder="e.g. CHASUS33XXX or GB29NWBK60161331926819"
                  value={transferData.ibanOrSwift}
                  onChange={(e) => setTransferData({ ...transferData, ibanOrSwift: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 font-mono text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-slate-400">Transfer Purpose</label>
                <select
                  value={transferData.purpose}
                  onChange={(e) => setTransferData({ ...transferData, purpose: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option value="Family Support / Personal">Family Support / Personal</option>
                  <option value="Education / University Tuition">Education / University Tuition</option>
                  <option value="Overseas Travel & Hotel Booking">Overseas Travel & Hotel Booking</option>
                  <option value="Business Invoice Settlement">Business Invoice Settlement</option>
                  <option value="Medical Expenses">Medical Expenses</option>
                </select>
              </div>

              {errorMessage && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs font-semibold text-rose-300">
                  {errorMessage}
                </div>
              )}

              <div className="mt-6 flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTransferModal(false)}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-3 font-bold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferLoading}
                  className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-3 font-bold text-white shadow-lg hover:brightness-110 disabled:opacity-50"
                >
                  {transferLoading ? "Processing Wire..." : "Confirm & Send"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
