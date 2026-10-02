import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import NotificationBell from "../components/NotificationBell";
import {
  FaCoins,
  FaShieldAlt,
  FaChartLine,
  FaArrowUp,
  FaArrowDown,
  FaCheckCircle,
  FaBolt,
  FaWallet,
  FaCalendarAlt,
  FaTruck,
  FaHistory,
  FaTimes,
  FaPlus,
  FaExclamationTriangle,
  FaAward,
  FaReceipt,
  FaSyncAlt,
  FaLock,
  FaFileContract,
} from "react-icons/fa";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1"
    ? "https://banking-dashboard-anuc.vercel.app/api"
    : "http://localhost:5000/api");

export default function GoldVault() {
  const { user, token } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Live Market & Holdings State
  const [rates, setRates] = useState({
    buyRate: 7245.5,
    sellRate: 7064.36,
    purity: "24K 99.9% Hallmark Pure",
    change24h: "+0.78%",
    high24h: 7280.5,
    low24h: 7223.0,
    vaultCustodian: "Brink's Global Safe Vaults / MMTC-PAMP Certified",
  });

  const [portfolio, setPortfolio] = useState({
    holdings: {
      gramsHeld: 0,
      totalInvested: 0,
      averageBuyPrice: 0,
      currentValuation: 0,
      pnlAmount: 0,
      pnlPercentage: 0,
    },
    sips: [],
    transactions: [],
    balance: 50000,
  });

  // Active Studio Tab: 'buy' | 'sell' | 'sip' | 'delivery'
  const [activeTab, setActiveTab] = useState("buy");

  // Buy State
  const [buyAmount, setBuyAmount] = useState(1000);
  const [buying, setBuying] = useState(false);

  // Sell State
  const [sellGrams, setSellGrams] = useState(0.5);
  const [selling, setSelling] = useState(false);

  // SIP State
  const [sipAmount, setSipAmount] = useState(500);
  const [sipFrequency, setSipFrequency] = useState("monthly");
  const [creatingSip, setCreatingSip] = useState(false);

  // Delivery State
  const [deliveryWeight, setDeliveryWeight] = useState(1);
  const [shippingAddress, setShippingAddress] = useState(
    "Flat 402, Royal Palms, Sector 45, Gurgaon, Haryana 122003"
  );
  const [delivering, setDelivering] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = "success") => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/gold/portfolio`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPortfolio(res.data);
      if (res.data.rates) {
        setRates(res.data.rates);
      }
    } catch (err) {
      console.error("Failed to load gold portfolio:", err);
      showToast("Unable to refresh gold vault", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchPortfolio();

    // Poll live price ticker every 15 seconds
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API_BASE}/gold/rates`);
        if (res.data) setRates(res.data);
      } catch (e) {
        // Ignored
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [token]);

  // Handle Buy
  const handleBuyGold = async () => {
    try {
      setBuying(true);
      const res = await axios.post(
        `${API_BASE}/gold/buy`,
        { amount: buyAmount },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast(res.data.message);
      await fetchPortfolio();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to buy gold", "error");
    } finally {
      setBuying(false);
    }
  };

  // Handle Sell
  const handleSellGold = async () => {
    try {
      setSelling(true);
      const res = await axios.post(
        `${API_BASE}/gold/sell`,
        { grams: sellGrams },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast(res.data.message);
      await fetchPortfolio();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to sell gold", "error");
    } finally {
      setSelling(false);
    }
  };

  // Handle Create SIP
  const handleCreateSip = async () => {
    try {
      setCreatingSip(true);
      const res = await axios.post(
        `${API_BASE}/gold/sip`,
        { amount: sipAmount, frequency: sipFrequency },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast(res.data.message);
      await fetchPortfolio();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to set up SIP", "error");
    } finally {
      setCreatingSip(false);
    }
  };

  // Handle Doorstep Delivery
  const handleRequestDelivery = async () => {
    try {
      setDelivering(true);
      const res = await axios.post(
        `${API_BASE}/gold/deliver`,
        { coinWeightGrams: deliveryWeight, shippingAddress },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast(res.data.message);
      await fetchPortfolio();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to request delivery", "error");
    } finally {
      setDelivering(false);
    }
  };

  // Derived Calculations
  const calculatedGramsForBuy = parseFloat((buyAmount / 1.03 / rates.buyRate).toFixed(4));
  const calculatedGst = parseFloat((buyAmount - buyAmount / 1.03).toFixed(2));
  const calculatedPayoutForSell = parseFloat((sellGrams * rates.sellRate).toFixed(2));

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
                  <FaCoins className="text-amber-400" />
                  24K 99.9% Digital Gold Vault
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Hallmark Pure
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                100% insured physical gold stored in Brink's security vaults • Buy &amp; Sell 24/7 from ₹10
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Ticker Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/30 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-slate-400 hidden sm:inline">24K Live:</span>
              <span className="font-mono font-bold text-amber-300">
                ₹{rates.buyRate.toLocaleString("en-IN")}/g
              </span>
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                {rates.change24h}
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
              <FaWallet className="text-blue-400" />
              <span className="text-slate-400">Balance:</span>
              <span className="font-semibold text-emerald-400">
                ₹{portfolio.balance.toLocaleString("en-IN")}
              </span>
            </div>
            <NotificationBell />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Key Portfolio Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Gold Weight Held */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900/80 border border-amber-500/30 relative overflow-hidden group hover:border-amber-500/50 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <FaCoins className="text-amber-400" /> Total Gold Holdings
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Vaulted
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">
                  {portfolio.holdings.gramsHeld.toFixed(4)}
                </span>
                <span className="text-sm font-semibold text-slate-400">Grams</span>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Avg Buy Rate: ₹{portfolio.holdings.averageBuyPrice.toLocaleString("en-IN")}/g
              </p>
            </div>

            {/* Card 2: Current Market Value */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-900/80 border border-emerald-500/30 relative overflow-hidden group hover:border-emerald-500/50 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                  <FaChartLine className="text-emerald-400" /> Market Value
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live Liquidity
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-emerald-400">
                  ₹{portfolio.holdings.currentValuation.toLocaleString("en-IN")}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Invested: ₹{portfolio.holdings.totalInvested.toLocaleString("en-IN")}
              </p>
            </div>

            {/* Card 3: P&L Net Returns */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-950/30 via-slate-900 to-slate-900/80 border border-cyan-500/30 relative overflow-hidden group hover:border-cyan-500/50 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <FaAward className="text-cyan-400" /> Net Gain / Loss
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    portfolio.holdings.pnlAmount >= 0
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  }`}
                >
                  {portfolio.holdings.pnlPercentage >= 0 ? "+" : ""}
                  {portfolio.holdings.pnlPercentage}%
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-3xl font-extrabold ${
                    portfolio.holdings.pnlAmount >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {portfolio.holdings.pnlAmount >= 0 ? "+₹" : "-₹"}
                  {Math.abs(portfolio.holdings.pnlAmount).toLocaleString("en-IN")}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">Real-time unrealized capital gains</p>
            </div>

            {/* Card 4: Vault Custody & Hallmark Security */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/30 via-slate-900 to-slate-900/80 border border-purple-500/30 relative overflow-hidden group hover:border-purple-500/50 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <FaShieldAlt className="text-purple-400" /> Brink's Vaulting
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  100% Insured
                </span>
              </div>
              <p className="text-sm font-bold text-white">MMTC-PAMP 99.9% Hallmark</p>
              <p className="mt-1 text-[11px] text-slate-400 leading-tight">
                Allocated bullion backed 1:1 by physical 24K gold bars in high-security vaults.
              </p>
            </div>
          </div>

          {/* Interactive Trading Studio: Buy, Sell, SIP & Delivery */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Studio Controls (7 cols) */}
            <div className="lg:col-span-7 p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl space-y-6">
              {/* Studio Tabs */}
              <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                {[
                  { id: "buy", label: "Buy Gold", icon: FaCoins },
                  { id: "sell", label: "Sell (Liquidate)", icon: FaWallet },
                  { id: "sip", label: "Gold SIP", icon: FaSyncAlt },
                  { id: "delivery", label: "Coin Delivery", icon: FaTruck },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      activeTab === t.id
                        ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/20"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <t.icon />
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>

              {/* TAB 1: BUY GOLD */}
              {activeTab === "buy" && (
                <div className="space-y-5 animate-fade-in">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Investment Amount (₹)
                      </label>
                      <span className="text-xs text-slate-400">Min: ₹10</span>
                    </div>

                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="10"
                        value={buyAmount}
                        onChange={(e) => setBuyAmount(Number(e.target.value))}
                        className="w-full pl-9 pr-4 py-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-white font-bold text-lg focus:outline-none focus:border-amber-500"
                        placeholder="1000"
                      />
                    </div>

                    {/* Quick Amount Chips */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {[100, 500, 1000, 5000, 10000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setBuyAmount(preset)}
                          className={`px-3 py-1 text-xs rounded-lg font-semibold transition-all ${
                            buyAmount === preset
                              ? "bg-amber-500 text-slate-950 font-bold"
                              : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
                          }`}
                        >
                          +₹{preset}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setBuyAmount(Math.round(rates.buyRate * 1.03))}
                        className="px-3 py-1 text-xs rounded-lg font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30"
                      >
                        1 Gram (₹{Math.round(rates.buyRate * 1.03)})
                      </button>
                    </div>
                  </div>

                  {/* Calculations Preview */}
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800/50">
                      <span className="text-slate-400">Live 24K Buy Rate</span>
                      <span className="font-semibold text-white">
                        ₹{rates.buyRate.toLocaleString("en-IN")}/gm
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/50">
                      <span className="text-slate-400">Govt. GST (3%)</span>
                      <span className="font-semibold text-slate-300">₹{calculatedGst}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/50">
                      <span className="text-slate-400">Gold Allocated to Vault</span>
                      <span className="font-bold text-amber-400">
                        {calculatedGramsForBuy} Grams
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/50">
                      <span className="text-slate-400">Vaulting &amp; Insurance Fee</span>
                      <span className="font-semibold text-emerald-400">₹0 (Lifetime Free)</span>
                    </div>
                    <div className="flex justify-between py-1 font-bold text-sm text-white pt-1">
                      <span>Total Debit from Wallet</span>
                      <span>₹{buyAmount.toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={buying || buyAmount < 10 || portfolio.balance < buyAmount}
                    onClick={handleBuyGold}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-sm transition-all shadow-xl shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <FaBolt />
                    {buying
                      ? "Purchasing 24K Gold..."
                      : `Buy ${calculatedGramsForBuy}g Gold for ₹${buyAmount.toLocaleString("en-IN")}`}
                  </button>
                </div>
              )}

              {/* TAB 2: SELL GOLD */}
              {activeTab === "sell" && (
                <div className="space-y-5 animate-fade-in">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Weight to Sell (Grams)
                      </label>
                      <span className="text-xs text-amber-400 font-bold">
                        Vault Balance: {portfolio.holdings.gramsHeld.toFixed(4)}g
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        type="number"
                        step="0.0001"
                        min="0.0001"
                        max={portfolio.holdings.gramsHeld}
                        value={sellGrams}
                        onChange={(e) => setSellGrams(Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-white font-bold text-lg focus:outline-none focus:border-amber-500"
                        placeholder="0.5"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        Grams
                      </span>
                    </div>

                    {/* Quick Percentage Chips */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {[0.25, 0.5, 0.75, 1.0].map((ratio) => {
                        const targetGrams = parseFloat(
                          (portfolio.holdings.gramsHeld * ratio).toFixed(4)
                        );
                        return (
                          <button
                            key={ratio}
                            type="button"
                            onClick={() => setSellGrams(targetGrams)}
                            className="px-3 py-1 text-xs rounded-lg font-semibold bg-slate-800/80 text-slate-300 hover:bg-slate-700"
                          >
                            {ratio * 100}% ({targetGrams}g)
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800/50">
                      <span className="text-slate-400">Live 24K Sell Rate</span>
                      <span className="font-semibold text-white">
                        ₹{rates.sellRate.toLocaleString("en-IN")}/gm
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/50">
                      <span className="text-slate-400">Net Liquidation Value</span>
                      <span className="font-bold text-emerald-400">
                        ₹{calculatedPayoutForSell.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/50">
                      <span className="text-slate-400">Payout Destination</span>
                      <span className="font-semibold text-white">Instant Wallet Balance</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={
                      selling ||
                      sellGrams <= 0 ||
                      portfolio.holdings.gramsHeld < sellGrams
                    }
                    onClick={handleSellGold}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <FaWallet />
                    {selling
                      ? "Liquidating Gold..."
                      : `Sell ${sellGrams}g & Credit ₹${calculatedPayoutForSell.toLocaleString("en-IN")} to Wallet`}
                  </button>
                </div>
              )}

              {/* TAB 3: GOLD SIP */}
              {activeTab === "sip" && (
                <div className="space-y-5 animate-fade-in">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Auto-Invest Amount (₹)
                    </label>
                    <input
                      type="number"
                      min="50"
                      value={sipAmount}
                      onChange={(e) => setSipAmount(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-white font-bold text-lg focus:outline-none focus:border-amber-500"
                      placeholder="500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Investment Frequency
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {["daily", "weekly", "monthly"].map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setSipFrequency(f)}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold capitalize transition-all border ${
                            sipFrequency === f
                              ? "bg-amber-500/20 border-amber-500 text-white"
                              : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 flex items-start gap-2">
                    <FaCalendarAlt className="text-amber-400 shrink-0 text-sm mt-0.5" />
                    <span>
                      Gold SIP automatically buys 24K gold on schedule and deposits it safely into
                      your vault. You can pause or cancel at any time with 0 penalty.
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={creatingSip || sipAmount < 50}
                    onClick={handleCreateSip}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-sm transition-all shadow-xl shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <FaSyncAlt />
                    {creatingSip
                      ? "Activating SIP..."
                      : `Start ${sipFrequency} SIP of ₹${sipAmount}`}
                  </button>
                </div>
              )}

              {/* TAB 4: DOORSTEP COIN DELIVERY */}
              {activeTab === "delivery" && (
                <div className="space-y-5 animate-fade-in">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Select 24K Certified Coin Weight
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 5, 10].map((weight) => (
                        <button
                          key={weight}
                          type="button"
                          onClick={() => setDeliveryWeight(weight)}
                          className={`p-3 rounded-2xl border text-center transition-all ${
                            deliveryWeight === weight
                              ? "bg-amber-500/20 border-amber-500 text-white shadow-lg shadow-amber-500/10"
                              : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                          }`}
                        >
                          <p className="text-base font-black text-amber-300">{weight}g</p>
                          <p className="text-[10px] text-slate-400">Minted Coin</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Delivery Address
                    </label>
                    <textarea
                      rows="2"
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      className="w-full p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 flex items-start gap-2">
                    <FaTruck className="text-amber-400 shrink-0 text-sm mt-0.5" />
                    <span>
                      Delivered via Insured Armored Courier with tamper-evident serial-numbered
                      packaging and Certificate of Purity from MMTC-PAMP.
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={
                      delivering || portfolio.holdings.gramsHeld < deliveryWeight
                    }
                    onClick={handleRequestDelivery}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-sm transition-all shadow-xl shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <FaTruck />
                    {delivering
                      ? "Dispatching..."
                      : `Dispatch ${deliveryWeight}g 24K Minted Gold Coin`}
                  </button>
                </div>
              )}
            </div>

            {/* Right Information & Ticker Details (5 cols) */}
            <div className="lg:col-span-5 p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <FaShieldAlt className="text-amber-400" />
                    Gold Security Guarantee
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    BIS Hallmarked
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/60">
                    <span className="text-xl">🏆</span>
                    <div>
                      <h4 className="font-bold text-white">24K 99.9% Pure Hallmark</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Guaranteed highest purity certified by government-approved NABL testing labs.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/60">
                    <span className="text-xl">🔒</span>
                    <div>
                      <h4 className="font-bold text-white">Brink's Insured Vaulting</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Stored in bank-grade secure vaults insured by Lloyd's of London at zero cost to you.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/60">
                    <span className="text-xl">⚡</span>
                    <div>
                      <h4 className="font-bold text-white">24/7 Instant Liquidity</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Sell any fraction of gold anytime and receive instant funds directly into your wallet.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active SIP Status if present */}
              {portfolio.sips.length > 0 && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <FaSyncAlt className="text-amber-400 text-xs" /> Active Gold SIP
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      ACTIVE
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>
                      ₹{portfolio.sips[0].sip_amount} / {portfolio.sips[0].frequency}
                    </span>
                    <span>Next: {portfolio.sips[0].next_execution}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section: Trade History */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FaHistory className="text-amber-400" />
                Gold Transaction History
              </h3>
              <span className="text-xs text-slate-400">
                {portfolio.transactions.length} Total Trades
              </span>
            </div>

            {portfolio.transactions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No gold transactions yet. Make your first purchase above to begin building wealth!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Weight (Grams)</th>
                      <th className="py-2.5 px-3">Rate/Gram</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 text-right">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {portfolio.transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-800/30">
                        <td className="py-2 px-3 text-slate-400">
                          {new Date(tx.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              tx.trade_type === "buy"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : tx.trade_type === "sell"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            }`}
                          >
                            {tx.trade_type}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-bold text-white">{tx.grams}g</td>
                        <td className="py-2 px-3 text-slate-300">
                          ₹{parseFloat(tx.rate_per_gram).toLocaleString("en-IN")}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-white">
                          ₹{parseFloat(tx.net_amount).toLocaleString("en-IN")}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-[11px] text-slate-400">
                          {tx.invoice_ref}
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
