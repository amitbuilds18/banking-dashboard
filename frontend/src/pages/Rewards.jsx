import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import NotificationBell from "../components/NotificationBell";
import {
  FaGift,
  FaCoins,
  FaTrophy,
  FaFire,
  FaCheckCircle,
  FaTimes,
  FaCopy,
  FaCheck,
  FaBolt,
  FaWallet,
  FaArrowRight,
  FaShoppingBag,
  FaUtensils,
  FaCar,
  FaMusic,
  FaFilm,
  FaTicketAlt,
  FaExclamationTriangle,
  FaInfoCircle,
} from "react-icons/fa";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1"
    ? "https://banking-dashboard-anuc.vercel.app/api"
    : "http://localhost:5000/api");

// Interactive HTML5 Scratch Card Component
function ScratchCardModal({ card, onClose, onClaimSuccess, token }) {
  const canvasRef = useRef(null);
  const [isScratched, setIsScratched] = useState(card.is_scratched);
  const [claiming, setClaiming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scratchPercent, setScratchPercent] = useState(card.is_scratched ? 100 : 0);
  const isDrawing = useRef(false);

  useEffect(() => {
    if (card.is_scratched) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    // Fill canvas with premium metallic silver-gold glitter gradient
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, "#cbd5e1");
    grad.addColorStop(0.3, "#e2e8f0");
    grad.addColorStop(0.5, "#fbbf24");
    grad.addColorStop(0.7, "#f59e0b");
    grad.addColorStop(1, "#94a3b8");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Decorative text on scratch foil
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("✨ SCRATCH HERE ✨", width / 2, height / 2 - 10);
    ctx.font = "11px sans-serif";
    ctx.fillStyle = "#475569";
    ctx.fillText("Scratch with mouse or finger to reveal", width / 2, height / 2 + 15);
  }, [card]);

  const scratch = (clientX, clientY) => {
    if (isScratched) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();

    // Check scratched percentage periodically
    checkScratchedRatio(ctx, canvas.width, canvas.height);
  };

  const checkScratchedRatio = (ctx, width, height) => {
    try {
      const imageData = ctx.getImageData(0, 0, width, height);
      const pixels = imageData.data;
      let transparentCount = 0;
      for (let i = 3; i < pixels.length; i += 16) {
        if (pixels[i] === 0) transparentCount++;
      }
      const totalSampled = pixels.length / 16;
      const ratio = Math.round((transparentCount / totalSampled) * 100);
      setScratchPercent(ratio);

      if (ratio > 40 && !isScratched) {
        revealCard();
      }
    } catch (e) {
      // Ignored for performance
    }
  };

  const revealCard = async () => {
    setIsScratched(true);
    setScratchPercent(100);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    try {
      await axios.post(
        `${API_BASE}/rewards/scratch/${card.id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error("Scratch error:", err);
    }
  };

  const handleClaim = async () => {
    try {
      setClaiming(true);
      const res = await axios.post(
        `${API_BASE}/rewards/claim/${card.id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onClaimSuccess(res.data);
    } catch (err) {
      console.error("Claim error:", err);
    } finally {
      setClaiming(false);
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="w-full max-w-sm p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col items-center text-center space-y-4 animate-scale-up">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-all"
        >
          <FaTimes />
        </button>

        <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
          {card.source_event}
        </span>

        {/* Scratch Area Container */}
        <div className="relative w-[280px] h-[220px] rounded-2xl overflow-hidden shadow-2xl border border-slate-700/80 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 flex flex-col items-center justify-center p-4">
          {/* Revealed Reward Underneath */}
          <div className="flex flex-col items-center justify-center space-y-2 select-none">
            {card.reward_type === "cashback" && (
              <>
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-2xl shadow-lg shadow-emerald-500/10">
                  <FaWallet />
                </div>
                <p className="text-xs font-semibold text-slate-400">Instant Real Cash</p>
                <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                  ₹{card.reward_value}
                </p>
                <p className="text-[11px] text-slate-400">Direct deposit to bank wallet</p>
              </>
            )}

            {card.reward_type === "coins" && (
              <>
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-2xl shadow-lg shadow-amber-500/10">
                  <FaCoins />
                </div>
                <p className="text-xs font-semibold text-slate-400">Loyalty NeoCoins</p>
                <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">
                  +{card.reward_value}
                </p>
                <p className="text-[11px] text-slate-400">Redeemable for vouchers &amp; cash</p>
              </>
            )}

            {card.reward_type === "coupon" && (
              <>
                <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 text-2xl shadow-lg shadow-rose-500/10">
                  <FaGift />
                </div>
                <p className="text-xs font-bold text-white">{card.merchant_name} Voucher</p>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700">
                  <span className="font-mono font-bold text-rose-300 text-xs tracking-wider">
                    {card.coupon_code || "NEO-OFF50"}
                  </span>
                  <button
                    onClick={() => copyCode(card.coupon_code || "NEO-OFF50")}
                    className="text-slate-400 hover:text-white"
                  >
                    {copied ? <FaCheck className="text-emerald-400" /> : <FaCopy />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">50% Off Gourmet Orders</p>
              </>
            )}
          </div>

          {/* HTML5 Scratch Foil Overlay */}
          {!isScratched && (
            <canvas
              ref={canvasRef}
              width={280}
              height={220}
              className="absolute inset-0 cursor-crosshair touch-none rounded-2xl"
              onMouseDown={() => (isDrawing.current = true)}
              onMouseUp={() => (isDrawing.current = false)}
              onMouseLeave={() => (isDrawing.current = false)}
              onMouseMove={(e) => {
                if (!isDrawing.current) return;
                scratch(e.clientX, e.clientY);
              }}
              onTouchStart={() => (isDrawing.current = true)}
              onTouchEnd={() => (isDrawing.current = false)}
              onTouchMove={(e) => {
                if (!isDrawing.current || !e.touches[0]) return;
                scratch(e.touches[0].clientX, e.touches[0].clientY);
              }}
            />
          )}
        </div>

        {/* Quick reveal shortcut if not yet scratched */}
        {!isScratched && (
          <button
            type="button"
            onClick={revealCard}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 underline cursor-pointer"
          >
            Quick Reveal / Scratch All
          </button>
        )}

        {/* Claim Button */}
        {isScratched && (
          <div className="w-full space-y-2 pt-2">
            {card.is_claimed ? (
              <div className="py-2.5 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center gap-2">
                <FaCheckCircle /> Already Claimed
              </div>
            ) : (
              <button
                type="button"
                disabled={claiming}
                onClick={handleClaim}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <FaBolt />
                {claiming
                  ? "Claiming..."
                  : card.reward_type === "cashback"
                  ? `Claim ₹${card.reward_value} to Bank Account`
                  : card.reward_type === "coins"
                  ? `Add +${card.reward_value} NeoCoins`
                  : "Save Coupon to Wallet"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Rewards() {
  const { user, token } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Rewards State
  const [rewardsData, setRewardsData] = useState({
    rewardPoints: 450,
    rewardTier: "Gold",
    balance: 50000,
    totalCashback: 0,
    unscratchedCount: 0,
    unclaimedCount: 0,
    hasCheckedInToday: false,
    scratchCards: [],
    partnerVouchers: [],
    redemptions: [],
  });

  const [activeTab, setActiveTab] = useState("unscratched"); // 'unscratched', 'all', 'vouchers'
  const [activeModalCard, setActiveModalCard] = useState(null);

  // Cash Conversion Slider
  const [coinsToRedeem, setCoinsToRedeem] = useState(200);
  const [converting, setConverting] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);

  const showToast = (msg, type = "success") => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchRewards = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/rewards/hub`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRewardsData(res.data);
    } catch (err) {
      console.error("Rewards hub error:", err);
      showToast("Unable to load rewards hub", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchRewards();
  }, [token]);

  // Daily Checkin Handler
  const handleDailyCheckin = async () => {
    try {
      setCheckingIn(true);
      const res = await axios.post(
        `${API_BASE}/rewards/daily-checkin`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast(res.data.message);
      await fetchRewards();
    } catch (err) {
      showToast(err.response?.data?.message || "Check-in failed", "error");
    } finally {
      setCheckingIn(false);
    }
  };

  // Convert NeoCoins to Cash
  const handleConvertCoins = async () => {
    try {
      setConverting(true);
      const res = await axios.post(
        `${API_BASE}/rewards/redeem-cash`,
        { coins: coinsToRedeem },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast(res.data.message);
      await fetchRewards();
    } catch (err) {
      showToast(err.response?.data?.message || "Redemption failed", "error");
    } finally {
      setConverting(false);
    }
  };

  // Redeem Partner Voucher
  const handleRedeemVoucher = async (voucherId) => {
    try {
      const res = await axios.post(
        `${API_BASE}/rewards/redeem-voucher`,
        { voucherId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast(`🎁 Code: ${res.data.code} - ${res.data.message}`);
      await fetchRewards();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to redeem voucher", "error");
    }
  };

  const filteredCards = rewardsData.scratchCards.filter((card) => {
    if (activeTab === "unscratched") return !card.is_scratched;
    if (activeTab === "claimed") return card.is_claimed;
    return true;
  });

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

      {/* Scratch Modal */}
      {activeModalCard && (
        <ScratchCardModal
          card={activeModalCard}
          token={token}
          onClose={() => setActiveModalCard(null)}
          onClaimSuccess={(claimedData) => {
            showToast(claimedData.message);
            setActiveModalCard(null);
            fetchRewards();
          }}
        />
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
                  <FaGift className="text-amber-400" />
                  Rewards, Cashbacks &amp; Scratch Cards
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {rewardsData.rewardTier} Member
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Earn real cash rewards &amp; NeoCoins on every UPI payment, bill pay &amp; loan repayment
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
              <FaWallet className="text-blue-400" />
              <span className="text-slate-400">Balance:</span>
              <span className="font-semibold text-emerald-400">
                ₹{rewardsData.balance.toLocaleString("en-IN")}
              </span>
            </div>
            <NotificationBell />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Hero Ribbons: Loyalty Points, Tier, & Daily Check-in */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. NeoCoins Wallet */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900/90 border border-amber-500/30 relative overflow-hidden group hover:border-amber-500/50 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <FaCoins className="text-amber-400" /> NeoCoins Points
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  10 Coins = ₹1
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">
                  {rewardsData.rewardPoints.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400">
                  (≈ ₹{(rewardsData.rewardPoints / 10).toFixed(0)} cash)
                </span>
              </div>
              <p className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
                <span className="text-amber-400">●</span> Instant real cash conversion available
              </p>
            </div>

            {/* 2. Total Cashback Won */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900/90 border border-emerald-500/30 relative overflow-hidden group hover:border-emerald-500/50 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                  <FaTrophy className="text-emerald-400" /> Lifetime Cashback
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Bank Credited
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-emerald-400">
                  ₹{rewardsData.totalCashback.toLocaleString("en-IN")}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                100% direct deposit into bank balance
              </p>
            </div>

            {/* 3. Unscratched Cards Pending */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900/90 border border-indigo-500/30 relative overflow-hidden group hover:border-indigo-500/50 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                  <FaGift className="text-indigo-400" /> Pending Cards
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Ready to Scratch
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">
                  {rewardsData.unscratchedCount}
                </span>
                <span className="text-xs text-slate-400">Cards</span>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                {rewardsData.unscratchedCount > 0
                  ? "Scratch now to win up to ₹500!"
                  : "Make payments to earn more cards"}
              </p>
            </div>

            {/* 4. Daily Check-in Streak */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-900/90 border border-rose-500/30 relative overflow-hidden group hover:border-rose-500/50 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                    <FaFire className="text-rose-400" /> Daily Streak
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    +25 Coins
                  </span>
                </div>
                <p className="text-xs text-slate-400">Log in daily for guaranteed NeoCoins</p>
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  disabled={rewardsData.hasCheckedInToday || checkingIn}
                  onClick={handleDailyCheckin}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs transition-all shadow-md shadow-rose-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  <FaBolt />
                  {rewardsData.hasCheckedInToday ? "Checked In Today ✅" : "Collect +25 Coins"}
                </button>
              </div>
            </div>
          </div>

          {/* Section 1: Scratch Cards Drawer */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FaGift className="text-amber-400" />
                  Your Scratch Cards
                </h2>
                <p className="text-xs text-slate-400">
                  Earned automatically when you send money, pay bills, store-pay or clear loan EMIs
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
                {[
                  { id: "unscratched", label: `Unscratched (${rewardsData.unscratchedCount})` },
                  { id: "all", label: `All (${rewardsData.scratchCards.length})` },
                  { id: "claimed", label: "Claimed History" },
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

            {/* Scratch Cards Grid */}
            {filteredCards.length === 0 ? (
              <div className="p-10 text-center rounded-2xl bg-slate-950/40 border border-slate-800/60">
                <p className="text-sm font-semibold text-slate-300">No Scratch Cards Here</p>
                <p className="text-xs text-slate-500 mt-1">
                  Make a UPI transfer, pay a bill, or check in daily to unlock fresh cards!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCards.map((card) => {
                  return (
                    <div
                      key={card.id}
                      onClick={() => setActiveModalCard(card)}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group hover:scale-[1.02] ${
                        !card.is_scratched
                          ? "bg-gradient-to-br from-amber-500/10 via-slate-900 to-indigo-950/30 border-amber-500/40 hover:border-amber-400 shadow-lg shadow-amber-500/5"
                          : card.is_claimed
                          ? "bg-slate-900/40 border-slate-800/80 text-slate-400"
                          : "bg-slate-900/80 border-emerald-500/30 hover:border-emerald-500/60"
                      }`}
                    >
                      {/* Foil shimmer glow for unscratched cards */}
                      {!card.is_scratched && (
                        <div className="absolute -top-12 -right-12 w-28 h-28 bg-amber-400/20 rounded-full blur-2xl group-hover:bg-amber-400/30 transition-all pointer-events-none" />
                      )}

                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {card.source_event}
                        </span>
                        {!card.is_scratched ? (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                            ✨ TAP TO SCRATCH
                          </span>
                        ) : card.is_claimed ? (
                          <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                            <FaCheckCircle /> Claimed
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            Ready to Claim
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                            !card.is_scratched
                              ? "bg-amber-500/20 border border-amber-500/30 text-amber-300"
                              : card.reward_type === "cashback"
                              ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300"
                              : "bg-rose-500/20 border border-rose-500/30 text-rose-300"
                          }`}
                        >
                          {!card.is_scratched ? "🎁" : card.reward_type === "cashback" ? "₹" : "🛍️"}
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-white truncate">
                            {!card.is_scratched ? "Mystery Scratch Card" : card.title}
                          </h4>
                          <p className="text-xs text-slate-400 truncate mt-0.5">
                            {!card.is_scratched
                              ? "Scratch to reveal cash or coupon"
                              : card.reward_type === "cashback"
                              ? `Won ₹${card.reward_value} Real Cash`
                              : card.reward_type === "coins"
                              ? `Won +${card.reward_value} NeoCoins`
                              : `${card.merchant_name} 50% Off`}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Cash Converter & Partner Brand Vouchers Store */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: NeoCoins to Real Cash Converter (5 cols) */}
            <div className="lg:col-span-5 p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <FaCoins className="text-amber-400" />
                      Cash Converter
                    </h3>
                    <p className="text-xs text-slate-400">
                      Instantly convert loyalty coins into real ₹ balance
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-400">10 Coins = ₹1</span>
                </div>

                <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-center space-y-1">
                  <p className="text-xs text-slate-400">Bank Account Credit Amount</p>
                  <p className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                    ₹{(coinsToRedeem / 10).toFixed(0)} Real Cash
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Costs {coinsToRedeem} NeoCoins • Instant Wallet Deposit
                  </p>
                </div>

                {/* Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Coins to Redeem:</span>
                    <span className="font-bold text-amber-400">{coinsToRedeem} Coins</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max={Math.max(100, Math.floor(rewardsData.rewardPoints / 50) * 50)}
                    step="50"
                    value={coinsToRedeem}
                    onChange={(e) => setCoinsToRedeem(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Min: 100 Coins (₹10)</span>
                    <span>Max: {rewardsData.rewardPoints} Coins</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <button
                  type="button"
                  disabled={converting || rewardsData.rewardPoints < coinsToRedeem}
                  onClick={handleConvertCoins}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FaBolt />
                  {converting
                    ? "Converting..."
                    : `Redeem ₹${(coinsToRedeem / 10).toFixed(0)} to Bank Balance`}
                </button>
              </div>
            </div>

            {/* Right: Partner Brand Vouchers Store (7 cols) */}
            <div className="lg:col-span-7 p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <FaTicketAlt className="text-rose-400" />
                    Partner Brand Vouchers
                  </h3>
                  <p className="text-xs text-slate-400">
                    Redeem your points for verified shopping, food, travel and music passes
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-400">Instant Codes</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {rewardsData.partnerVouchers.map((voucher) => {
                  const canAfford = rewardsData.rewardPoints >= voucher.coinsRequired;

                  return (
                    <div
                      key={voucher.id}
                      className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{voucher.icon}</span>
                          <div>
                            <h4 className="text-xs font-bold text-white leading-tight">
                              {voucher.title}
                            </h4>
                            <span className="text-[10px] text-slate-400">{voucher.merchant}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                        <div className="flex items-center gap-1 text-xs font-bold text-amber-400">
                          <FaCoins className="text-[10px]" />
                          <span>{voucher.coinsRequired} Coins</span>
                        </div>

                        <button
                          type="button"
                          disabled={!canAfford}
                          onClick={() => handleRedeemVoucher(voucher.id)}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                            canAfford
                              ? "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 shadow"
                              : "bg-slate-900 text-slate-600 border border-slate-800/40 cursor-not-allowed"
                          }`}
                        >
                          {canAfford ? "Redeem Code" : "Not Enough"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
