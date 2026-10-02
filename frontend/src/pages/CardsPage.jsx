import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import NotificationBell from "../components/NotificationBell";
import {
  FaCreditCard,
  FaSnowflake,
  FaLock,
  FaShieldAlt,
  FaKey,
  FaSyncAlt,
  FaEye,
  FaEyeSlash,
  FaCopy,
  FaCheckCircle,
  FaTimes,
  FaExclamationTriangle,
  FaGlobe,
  FaWifi,
  FaShoppingCart,
  FaMoneyBillWave,
  FaSlidersH,
  FaGift,
} from "react-icons/fa";

const API_BASE = "http://localhost:5000/api";

export default function CardsPage() {
  const { user, token } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [card, setCard] = useState(null);

  // Card Flip & Security state
  const [isFlipped, setIsFlipped] = useState(false);
  const [revealSensitive, setRevealSensitive] = useState(false);
  const [revealCountdown, setRevealCountdown] = useState(0);

  // Limits State
  const [dailyLimit, setDailyLimit] = useState(50000);
  const [atmLimit, setAtmLimit] = useState(15000);
  const [isUpdatingLimits, setIsUpdatingLimits] = useState(false);

  // Modals
  const [pinModal, setPinModal] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinLoading, setPinLoading] = useState(false);

  const [reissueModal, setReissueModal] = useState(false);
  const [reissueLoading, setReissueLoading] = useState(false);

  const [toastMessage, setToastMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch Card
  const fetchCard = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/card`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const cardData = res.data.card || res.data;
      if (cardData) {
        setCard(cardData);
        if (cardData.daily_limit) setDailyLimit(Number(cardData.daily_limit));
        if (cardData.atm_limit) setAtmLimit(Number(cardData.atm_limit));
      }
    } catch (err) {
      console.error("Error fetching card details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCard();
    }
  }, [token]);

  // Sensitive Countdown
  useEffect(() => {
    let timer;
    if (revealSensitive) {
      setRevealCountdown(12);
      timer = setInterval(() => {
        setRevealCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setRevealSensitive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [revealSensitive]);

  // Freeze / Unfreeze
  const toggleFreeze = async () => {
    try {
      const res = await axios.put(
        `${API_BASE}/card/toggle-freeze`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCard(res.data.card);
      showToast(
        res.data.card.is_frozen
          ? "❄️ Titanium Card frozen. All swipe and online payments are blocked."
          : "✅ Card unfrozen and active for payments."
      );
    } catch (err) {
      console.error(err);
      showToast("Failed to update freeze status");
    }
  };

  // Channel Toggles
  const handleToggleChannel = async (channelKey) => {
    try {
      const res = await axios.put(
        `${API_BASE}/card/toggle-channel`,
        { channel: channelKey },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCard(res.data.card);
      showToast(res.data.message);
    } catch (err) {
      console.error(err);
      showToast("Failed to toggle channel");
    }
  };

  // Save Spending Limits
  const handleSaveLimits = async () => {
    try {
      setIsUpdatingLimits(true);
      const res = await axios.put(
        `${API_BASE}/card/limit`,
        { daily_limit: dailyLimit, atm_limit: atmLimit },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCard(res.data.card);
      showToast("Card spending limits updated successfully!");
    } catch (err) {
      console.error(err);
      showToast("Failed to update spending limits");
    } finally {
      setIsUpdatingLimits(false);
    }
  };

  // Change PIN
  const handleChangePin = async (e) => {
    e.preventDefault();
    if (newPin !== confirmPin) {
      setErrorMessage("PINs do not match. Please verify.");
      return;
    }
    if (!/^\d{4}$/.test(newPin)) {
      setErrorMessage("PIN must be exactly 4 digits.");
      return;
    }

    try {
      setPinLoading(true);
      setErrorMessage(null);
      const res = await axios.put(
        `${API_BASE}/card/change-pin`,
        { pin: newPin },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCard(res.data.card);
      setPinModal(false);
      setNewPin("");
      setConfirmPin("");
      showToast("🔒 4-Digit Card PIN updated successfully!");
    } catch (err) {
      setErrorMessage(err.response?.data?.error || "Failed to update PIN");
    } finally {
      setPinLoading(false);
    }
  };

  // Regenerate Dynamic CVV
  const handleRegenerateCvv = async () => {
    try {
      const res = await axios.post(
        `${API_BASE}/card/regenerate-cvv`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCard(res.data.card);
      showToast("⚡ Dynamic CVV refreshed for zero-fraud security!");
    } catch (err) {
      console.error(err);
      showToast("Failed to refresh CVV");
    }
  };

  // Block & Reissue Card
  const handleReissueCard = async () => {
    try {
      setReissueLoading(true);
      const res = await axios.post(
        `${API_BASE}/card/reissue`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCard(res.data.card);
      setReissueModal(false);
      showToast("💳 New Titanium card generated and old card cancelled!");
    } catch (err) {
      console.error(err);
      showToast("Failed to reissue card");
    } finally {
      setReissueLoading(false);
    }
  };

  const copyCardNumber = () => {
    if (!card?.card_number) return;
    navigator.clipboard.writeText(card.card_number.replace(/\s+/g, ""));
    showToast("Card number copied to clipboard!");
  };

  const isFrozen = Boolean(card?.is_frozen);
  const displayNumber = revealSensitive
    ? card?.card_number
    : card?.card_number
    ? `•••• •••• •••• ${card.card_number.slice(-4)}`
    : "•••• •••• •••• 4716";

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
            <div className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

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
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 border border-slate-600 text-2xl text-cyan-400 shadow-lg shadow-cyan-500/10">
                    <FaCreditCard />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400">
                        World Elite Titanium
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                          isFrozen
                            ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${isFrozen ? "bg-rose-400" : "bg-emerald-400 animate-pulse"}`} />
                        {isFrozen ? "Card Frozen (Locked)" : "Card Active & Ready"}
                      </span>
                    </div>
                    <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                      Card Controls & Security Center
                    </h1>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Manage payment channels, dynamic CVV, spending caps, and fraud protection.
                    </p>
                  </div>
                </div>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleFreeze}
                  className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-bold transition active:scale-95 ${
                    isFrozen
                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                      : "border-rose-500/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25"
                  }`}
                >
                  <FaSnowflake className={isFrozen ? "text-emerald-400" : "text-rose-400"} />
                  <span>{isFrozen ? "Unfreeze Card" : "Freeze Card"}</span>
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

          {/* Core Interactive Card Studio */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
            {/* Left 5 Cols: 3D Flip Card */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div
                className="group perspective w-full max-w-sm cursor-pointer select-none"
                onClick={() => setIsFlipped(!isFlipped)}
              >
                <div
                  className={`relative h-60 w-full rounded-3xl p-6 shadow-2xl transition-all duration-700 transform-style-3d border ${
                    isFrozen
                      ? "border-blue-400/40 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-950"
                      : "border-slate-700/80 bg-gradient-to-br from-slate-900 via-slate-800 to-black"
                  } ${isFlipped ? "rotate-y-180" : ""}`}
                >
                  {/* FROST OVERLAY IF FROZEN */}
                  {isFrozen && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-3xl bg-blue-950/70 backdrop-blur-[2px] border border-blue-400/30">
                      <FaSnowflake className="text-4xl text-cyan-300 animate-spin-slow" />
                      <p className="mt-2 text-xs font-black uppercase tracking-widest text-cyan-200">
                        Card Temporarily Frozen
                      </p>
                      <p className="text-[10px] text-cyan-300/80">Tap Unfreeze to resume usage</p>
                    </div>
                  )}

                  {/* FRONT FACE */}
                  {!isFlipped ? (
                    <div className="flex h-full flex-col justify-between">
                      {/* Top: Chip + Contactless + Tier */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-11 rounded-md bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-500 shadow-md" />
                          <FaWifi className="rotate-90 text-slate-400 text-sm" />
                        </div>
                        <span className="font-mono text-[10px] font-black uppercase tracking-widest text-cyan-400">
                          Titanium Neo
                        </span>
                      </div>

                      {/* Middle: Number */}
                      <div className="my-auto">
                        <p className="font-mono text-xl tracking-[0.2em] font-black text-white">
                          {displayNumber}
                        </p>
                      </div>

                      {/* Bottom: Holder & Expiry */}
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-[9px] uppercase tracking-wider text-slate-400">Cardholder</p>
                          <p className="text-xs font-black uppercase tracking-wider text-white">
                            {card?.holder_name || user?.name || "VALUED MEMBER"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] uppercase tracking-wider text-slate-400">Expires</p>
                          <p className="font-mono text-xs font-bold text-white">
                            {card?.expiry || "10/30"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* BACK FACE */
                    <div className="flex h-full flex-col justify-between rotate-y-180">
                      <div className="mt-1 h-10 w-full bg-slate-950 rounded-md" />
                      <div className="flex items-center justify-between px-2">
                        <div className="h-7 flex-1 bg-slate-200/90 rounded-l text-slate-900 text-[9px] font-mono flex items-center px-2 italic">
                          Authorized Signature
                        </div>
                        <div className="h-7 w-14 bg-slate-100 rounded-r flex items-center justify-center font-mono font-black text-slate-950 text-xs tracking-wider">
                          {revealSensitive ? card?.cvv || "842" : "•••"}
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-[9px] text-slate-400 px-1">
                        <span>Customer Care: 1800-NOVAPAY</span>
                        <span className="font-bold text-cyan-400">Electronic Use Only</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Under-Card Action Bar */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
                >
                  ⟳ Flip Card
                </button>

                <button
                  type="button"
                  onClick={() => setRevealSensitive(!revealSensitive)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
                >
                  {revealSensitive ? <FaEyeSlash /> : <FaEye />}
                  <span>{revealSensitive ? `Hide (${revealCountdown}s)` : "Reveal Details"}</span>
                </button>

                <button
                  type="button"
                  onClick={copyCardNumber}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
                >
                  <FaCopy />
                  <span>Copy Number</span>
                </button>
              </div>
            </div>

            {/* Right 7 Cols: Security Toggles & Limits */}
            <div className="lg:col-span-7 space-y-6">
              {/* Payment Channel Controls */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <FaShieldAlt className="text-cyan-400" />
                  <span>Payment Channels & Usage Controls</span>
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Instantly toggle individual payment rails to protect against unauthorized swipes.
                </p>

                <div className="mt-5 space-y-3.5 divide-y divide-slate-800/80 text-xs">
                  {/* Online Transactions */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                        <FaShoppingCart />
                      </div>
                      <div>
                        <p className="font-bold text-white">Online E-Commerce Payments</p>
                        <p className="text-[11px] text-slate-400">Amazon, Flipkart, Netflix, Swiggy, etc.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleChannel("online_enabled")}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        card?.online_enabled ? "bg-cyan-500" : "bg-slate-800"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          card?.online_enabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* ATM Withdrawals */}
                  <div className="flex items-center justify-between pt-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                        <FaMoneyBillWave />
                      </div>
                      <div>
                        <p className="font-bold text-white">ATM Cash Withdrawals</p>
                        <p className="text-[11px] text-slate-400">Physical ATM cash dispenses across India</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleChannel("atm_enabled")}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        card?.atm_enabled ? "bg-cyan-500" : "bg-slate-800"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          card?.atm_enabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Contactless NFC */}
                  <div className="flex items-center justify-between pt-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                        <FaWifi className="rotate-90 text-sm" />
                      </div>
                      <div>
                        <p className="font-bold text-white">Tap & Pay (Contactless NFC)</p>
                        <p className="text-[11px] text-slate-400">PIN-less touch payments up to ₹5,000</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleChannel("contactless_enabled")}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        card?.contactless_enabled ? "bg-cyan-500" : "bg-slate-800"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          card?.contactless_enabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* International Payments */}
                  <div className="flex items-center justify-between pt-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                        <FaGlobe />
                      </div>
                      <div>
                        <p className="font-bold text-white">International Usage</p>
                        <p className="text-[11px] text-slate-400">Cross-border transactions in USD, EUR, GBP</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleChannel("international_enabled")}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        card?.international_enabled ? "bg-cyan-500" : "bg-slate-800"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          card?.international_enabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Spending Limits Sliders */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <FaSlidersH className="text-cyan-400" />
                    <span>Daily Transaction Limits</span>
                  </h3>
                  <button
                    type="button"
                    disabled={isUpdatingLimits}
                    onClick={handleSaveLimits}
                    className="rounded-xl bg-cyan-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition disabled:opacity-50"
                  >
                    {isUpdatingLimits ? "Saving..." : "Save Limits"}
                  </button>
                </div>

                <div className="mt-5 space-y-6 text-xs">
                  {/* Online POS Limit */}
                  <div>
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-400">Daily Online / POS Limit</span>
                      <span className="text-cyan-400 font-mono text-sm">
                        ₹{dailyLimit.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1000"
                      max="200000"
                      step="5000"
                      value={dailyLimit}
                      onChange={(e) => setDailyLimit(Number(e.target.value))}
                      className="mt-2 w-full accent-cyan-400 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                      <span>₹1,000</span>
                      <span>₹2,00,000 Max</span>
                    </div>
                  </div>

                  {/* ATM Limit */}
                  <div>
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-400">Daily ATM Cash Withdrawal Limit</span>
                      <span className="text-emerald-400 font-mono text-sm">
                        ₹{atmLimit.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="500"
                      max="50000"
                      step="2500"
                      value={atmLimit}
                      onChange={(e) => setAtmLimit(Number(e.target.value))}
                      className="mt-2 w-full accent-emerald-400 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                      <span>₹500</span>
                      <span>₹50,000 Max</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* PIN & Anti-Fraud Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPinModal(true)}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800/80 p-3.5 text-xs font-bold text-white hover:bg-slate-700 transition"
                >
                  <FaKey className="text-cyan-400" />
                  <span>Set 4-Digit PIN</span>
                </button>

                <button
                  type="button"
                  onClick={handleRegenerateCvv}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800/80 p-3.5 text-xs font-bold text-white hover:bg-slate-700 transition"
                >
                  <FaSyncAlt className="text-emerald-400" />
                  <span>Refresh CVV</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReissueModal(true)}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition"
                >
                  <FaExclamationTriangle className="text-rose-400" />
                  <span>Reissue Card</span>
                </button>
              </div>
            </div>
          </div>

          {/* Perks & Benefits Section */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <FaGift className="text-amber-400" />
              <span>Titanium World Elite Perks & Coverages</span>
            </h3>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="font-bold text-amber-400 text-sm">1.5% Unlimited Cashback</p>
                <p className="text-slate-400 mt-1">Direct cash returns credited on all online merchant checkouts.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="font-bold text-cyan-400 text-sm">Airport Lounge Access</p>
                <p className="text-slate-400 mt-1">4 complimentary domestic airport lounge visits each calendar year.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="font-bold text-emerald-400 text-sm">Zero Forex Markup</p>
                <p className="text-slate-400 mt-1">Save 3.5% standard bank fee when spending overseas online.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="font-bold text-purple-400 text-sm">₹5,00,000 Fraud Cover</p>
                <p className="text-slate-400 mt-1">Zero-liability protection against unauthorized skims and breaches.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Set / Change PIN Modal */}
      {pinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <FaKey className="text-cyan-400" />
                <h3 className="font-bold text-white text-base">Change 4-Digit Card PIN</h3>
              </div>
              <button onClick={() => setPinModal(false)} className="text-slate-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleChangePin} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="font-bold uppercase tracking-wider text-slate-400">New 4-Digit PIN</label>
                <input
                  type="password"
                  maxLength="4"
                  required
                  placeholder="••••"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-center text-2xl font-mono tracking-widest text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-slate-400">Confirm 4-Digit PIN</label>
                <input
                  type="password"
                  maxLength="4"
                  required
                  placeholder="••••"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-center text-2xl font-mono tracking-widest text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              {errorMessage && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-2.5 text-xs text-rose-300">
                  {errorMessage}
                </div>
              )}

              <div className="mt-6 flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPinModal(false)}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-3 font-bold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pinLoading || newPin.length !== 4}
                  className="flex-1 rounded-xl bg-cyan-500 py-3 font-bold text-slate-950 shadow-lg hover:bg-cyan-400 disabled:opacity-50"
                >
                  {pinLoading ? "Saving..." : "Update PIN"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Block & Reissue Modal */}
      {reissueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-2xl text-rose-400">
              <FaExclamationTriangle />
            </div>
            <h3 className="mt-4 text-lg font-black text-white">Block & Reissue Card</h3>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Your existing card ({card?.card_number ? card.card_number.slice(-4) : "••••"}) will be permanently cancelled immediately, and a fresh Titanium card number and dynamic CVV will be generated for you.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setReissueModal(false)}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-3 text-xs font-bold text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reissueLoading}
                onClick={handleReissueCard}
                className="flex-1 rounded-xl bg-rose-600 py-3 text-xs font-bold text-white shadow-lg hover:bg-rose-500 disabled:opacity-50"
              >
                {reissueLoading ? "Reissuing..." : "Confirm & Reissue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
