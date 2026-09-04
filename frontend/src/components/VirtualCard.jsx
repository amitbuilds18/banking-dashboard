import { useEffect, useState } from "react";
import API from "../services/api";
import { useToast } from "../context/ToastContext";
import { FaSnowflake, FaEye, FaEyeSlash, FaCopy, FaSlidersH, FaLock } from "react-icons/fa";

export default function VirtualCard() {
  const { showToast } = useToast();
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [revealSensitive, setRevealSensitive] = useState(false);
  const [revealCountdown, setRevealCountdown] = useState(0);
  const [sliderLimit, setSliderLimit] = useState(25000);
  const [isUpdatingLimit, setIsUpdatingLimit] = useState(false);

  const fetchCard = async () => {
    try {
      const res = await API.get("/card");
      setCard(res.data);
      if (res.data?.daily_limit) {
        setSliderLimit(Number(res.data.daily_limit));
      }
    } catch (err) {
      console.error("Error fetching card:", err);
      showToast("Unable to load virtual card", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCard();
  }, []);

  // Handle CVV/Number reveal with 10s auto-hide timer
  useEffect(() => {
    let timer;
    if (revealSensitive) {
      setRevealCountdown(10);
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

  const toggleFreeze = async () => {
    try {
      const res = await API.put("/card/toggle-freeze");
      setCard(res.data.card);
      showToast(
        res.data.card.is_frozen
          ? "❄️ Card frozen for security"
          : "✅ Card active & ready to use",
        res.data.card.is_frozen ? "warning" : "success"
      );
    } catch (err) {
      console.error("Error toggling freeze:", err);
      showToast("Failed to update card status", "error");
    }
  };

  const handleUpdateLimit = async (newLimit) => {
    setIsUpdatingLimit(true);
    try {
      const res = await API.put("/card/limit", { daily_limit: newLimit });
      setCard(res.data.card);
      showToast(`Daily limit set to ₹${newLimit.toLocaleString("en-IN")}`, "success");
    } catch (err) {
      console.error("Error updating limit:", err);
      showToast("Failed to update spending limit", "error");
    } finally {
      setIsUpdatingLimit(false);
    }
  };

  const copyCardNumber = () => {
    if (!card?.card_number) return;
    navigator.clipboard.writeText(card.card_number.replace(/\s+/g, ""));
    showToast("Card number copied to clipboard!", "success");
  };

  if (loading) {
    return (
      <div className="h-64 animate-pulse rounded-3xl border border-slate-800 bg-slate-900/60 p-6" />
    );
  }

  const isFrozen = card?.is_frozen;
  const displayNumber = revealSensitive
    ? card?.card_number
    : card?.card_number
    ? `•••• •••• •••• ${card.card_number.slice(-4)}`
    : "•••• •••• •••• ••••";

  return (
    <div className="rounded-3xl border border-slate-700/80 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
            Titanium Neo
          </span>
          <h3 className="text-xl font-bold text-white">Virtual Debit Card</h3>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            isFrozen
              ? "border border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
              : "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
          }`}
        >
          {isFrozen ? "❄️ Frozen" : "● Active"}
        </span>
      </div>

      {/* Card Wrapper with 3D Flip */}
      <div className="relative mx-auto my-3 h-52 w-full max-w-sm [perspective:1000px]">
        <div
          onClick={() => setIsFlipped(!isFlipped)}
          className={`relative h-full w-full cursor-pointer transition-transform duration-700 [transform-style:preserve-3d] ${
            isFlipped ? "[transform:rotateY(180deg)]" : ""
          }`}
        >
          {/* Card FRONT */}
          <div
            className={`absolute inset-0 flex flex-col justify-between overflow-hidden rounded-2xl p-6 shadow-2xl transition-all [backface-visibility:hidden] ${
              isFrozen
                ? "border border-cyan-400/50 bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-900 text-cyan-100"
                : "border border-slate-600/60 bg-gradient-to-tr from-slate-950 via-slate-900 to-blue-950 text-white"
            }`}
          >
            {/* Frozen Frosted Glass Overlay */}
            {isFrozen && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-cyan-950/40 backdrop-blur-[2px]">
                <FaSnowflake className="animate-spin-slow text-4xl text-cyan-300 opacity-90" />
                <p className="mt-2 text-xs font-bold uppercase tracking-widest text-cyan-200">
                  Card Temporarily Frozen
                </p>
              </div>
            )}

            {/* Ambient Glow */}
            <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-cyan-500/10 blur-2xl" />

            {/* Top row: Chip and Visa Logo */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Metallic Chip */}
                <div className="h-8 w-11 rounded-md border border-amber-400/60 bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 shadow-inner" />
                <span className="text-sm font-semibold tracking-widest text-slate-300">
                  )))
                </span>
              </div>
              <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-lg font-black tracking-widest text-transparent">
                VISA
              </span>
            </div>

            {/* Middle row: Card Number */}
            <div className="my-auto font-mono text-lg font-medium tracking-widest text-slate-100">
              {displayNumber}
            </div>

            {/* Bottom row: Cardholder & Expiry */}
            <div className="flex items-end justify-between text-xs">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Cardholder</p>
                <p className="font-semibold uppercase tracking-wider text-white">
                  {card?.holder_name || "VALUED MEMBER"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Expires</p>
                <p className="font-mono font-semibold text-white">{card?.expiry || "09/29"}</p>
              </div>
            </div>
          </div>

          {/* Card BACK */}
          <div
            className={`absolute inset-0 flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-700 bg-gradient-to-tl from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-2xl [backface-visibility:hidden] [transform:rotateY(180deg)]`}
          >
            {/* Magstripe */}
            <div className="-mx-6 -mt-2 h-10 bg-slate-950 border-y border-slate-800" />

            {/* Signature & CVV */}
            <div className="my-auto flex items-center justify-end gap-3">
              <span className="text-xs uppercase tracking-wider text-slate-400">CVV</span>
              <div className="flex h-9 w-16 items-center justify-center rounded bg-slate-800 font-mono text-sm font-bold text-amber-300">
                {revealSensitive ? card?.cvv : "•••"}
              </div>
            </div>

            <p className="text-center text-[10px] text-slate-400">
              Click anywhere to flip back. Keep your credentials private.
            </p>
          </div>
        </div>
      </div>

      <p className="mb-4 text-center text-xs text-slate-400">
        👆 Tap card to flip. Click below to reveal details or toggle security.
      </p>

      {/* Control Buttons */}
      <div className="grid grid-cols-3 gap-2 border-t border-slate-800 pt-4">
        {/* Flip button */}
        <button
          onClick={() => setIsFlipped(!isFlipped)}
          className="flex flex-col items-center justify-center rounded-xl border border-slate-700 bg-slate-800/80 p-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
        >
          <span className="text-sm">🔄</span>
          <span className="mt-1">Flip Card</span>
        </button>

        {/* Reveal CVV / Details */}
        <button
          onClick={() => setRevealSensitive(!revealSensitive)}
          className={`flex flex-col items-center justify-center rounded-xl border p-2 text-xs font-medium transition ${
            revealSensitive
              ? "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
              : "border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700"
          }`}
        >
          {revealSensitive ? (
            <>
              <FaEyeSlash className="text-sm text-amber-300" />
              <span className="mt-1 font-mono">Hide ({revealCountdown}s)</span>
            </>
          ) : (
            <>
              <FaEye className="text-sm text-slate-300" />
              <span className="mt-1">Reveal CVV</span>
            </>
          )}
        </button>

        {/* Freeze / Unfreeze */}
        <button
          onClick={toggleFreeze}
          className={`flex flex-col items-center justify-center rounded-xl border p-2 text-xs font-medium transition ${
            isFrozen
              ? "border-cyan-400 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30"
              : "border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700"
          }`}
        >
          <FaSnowflake className={`text-sm ${isFrozen ? "text-cyan-300" : "text-slate-300"}`} />
          <span className="mt-1">{isFrozen ? "Unfreeze" : "Freeze Card"}</span>
        </button>
      </div>

      {/* Copy Number & Spending Limit controls */}
      <div className="mt-4 space-y-3 rounded-2xl bg-slate-950/60 p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Card Number:</span>
          <button
            onClick={copyCardNumber}
            className="flex items-center gap-1.5 font-medium text-cyan-400 hover:underline"
          >
            <FaCopy className="text-xs" /> Copy Number
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-1.5 text-slate-400">
              <FaSlidersH /> Daily Spending Limit:
            </span>
            <span className="font-semibold text-white">
              ₹{sliderLimit.toLocaleString("en-IN")}
            </span>
          </div>
          <input
            type="range"
            min="2000"
            max="100000"
            step="1000"
            value={sliderLimit}
            onChange={(e) => setSliderLimit(Number(e.target.value))}
            onMouseUp={() => handleUpdateLimit(sliderLimit)}
            onTouchEnd={() => handleUpdateLimit(sliderLimit)}
            disabled={isUpdatingLimit || isFrozen}
            className="mt-2 w-full accent-cyan-400"
          />
        </div>
      </div>
    </div>
  );
}
