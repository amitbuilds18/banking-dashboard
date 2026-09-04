import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { useToast } from "../context/ToastContext";

export default function SendMoney() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [receiverEmail, setReceiverEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [roundUp, setRoundUp] = useState(true);
  const [securityPin, setSecurityPin] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const numericAmount = Number(amount);
  const nextFifty = Math.ceil((numericAmount || 0) / 50) * 50;
  const spareChange = nextFifty === numericAmount ? 50 : nextFifty - numericAmount;

  const handleOpenReview = (e) => {
    e.preventDefault();
    if (!receiverEmail || !numericAmount || numericAmount <= 0) {
      showToast("Please enter a valid email and positive amount", "error");
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmSend = async () => {
    if (securityPin.length < 4) {
      showToast("Please enter your 4-digit Security PIN", "error");
      return;
    }

    setLoading(true);

    try {
      const res = await API.post("/transactions/send", {
        receiver_email: receiverEmail.trim().toLowerCase(),
        amount: numericAmount,
        round_up: roundUp,
      });

      if (res.data?.error) {
        showToast(res.data.error, "error");
        return;
      }

      showToast(res.data.message || "Money transferred successfully! 💸", "success");
      setShowConfirmModal(false);
      navigate("/");
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || "Transfer failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-700/80 bg-slate-900/80 p-8 shadow-2xl shadow-blue-950/30 backdrop-blur-xl">
        <button
          onClick={() => navigate("/")}
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white"
        >
          ← Back to Dashboard
        </button>

        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 text-2xl font-bold text-white shadow-lg shadow-blue-500/30">
            💸
          </div>
          <h2 className="text-3xl font-bold text-white">Instant P2P Transfer</h2>
          <p className="mt-1 text-sm text-slate-400">Zero fees, real-time settlement</p>
        </div>

        <form onSubmit={handleOpenReview} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm text-slate-300">Recipient Email</label>
            <input
              type="email"
              value={receiverEmail}
              onChange={(e) => setReceiverEmail(e.target.value)}
              placeholder="e.g. rahul@gmail.com"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Amount (₹)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="500"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
              required
            />

            {/* Quick chips */}
            <div className="mt-2 flex gap-2">
              {[200, 500, 1000, 2500].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmount(amt.toString())}
                  className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700"
                >
                  ₹{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Round-up Toggle */}
          {numericAmount > 0 && (
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200">
              <div className="flex items-center gap-2.5">
                <span className="text-base">🪙</span>
                <div>
                  <p className="font-semibold text-white">Smart Round-Up</p>
                  <p className="text-[11px] text-amber-300">
                    Round up to ₹{nextFifty} (+₹{spareChange} into your goal vault)
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={roundUp}
                onChange={(e) => setRoundUp(e.target.checked)}
                className="h-4 w-4 accent-amber-400"
              />
            </label>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 py-3 font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:brightness-110"
          >
            Review Transfer
          </button>
        </form>
      </div>

      {/* CONFIRMATION & SECURITY PIN MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white">Confirm Transfer</h3>
            <p className="mt-1 text-xs text-slate-400">
              Please verify recipient and authorization before funds depart.
            </p>

            <div className="my-5 space-y-3 rounded-2xl border border-slate-700/80 bg-slate-800/60 p-4 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">To:</span>
                <span className="font-medium text-white">{receiverEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Transfer Amount:</span>
                <span className="font-bold text-white">₹{numericAmount.toLocaleString("en-IN")}</span>
              </div>
              {roundUp && (
                <div className="flex justify-between text-amber-300">
                  <span>Vault Round-Up:</span>
                  <span>+₹{spareChange}</span>
                </div>
              )}
              <div className="flex justify-between text-emerald-400">
                <span>Transfer Fee:</span>
                <span>Free (₹0)</span>
              </div>
              <div className="border-t border-slate-700 pt-2 flex justify-between font-bold text-white">
                <span>Total Outflow:</span>
                <span className="text-cyan-400">
                  ₹{(numericAmount + (roundUp ? spareChange : 0)).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div className="mb-5">
              <label className="mb-1 block text-xs text-slate-300">
                Enter 4-digit Transfer Security PIN (Default: 1234)
              </label>
              <input
                type="password"
                maxLength={4}
                value={securityPin}
                onChange={(e) => setSecurityPin(e.target.value)}
                placeholder="••••"
                className="w-full tracking-[0.5em] text-center rounded-xl border border-slate-700 bg-slate-800 py-2.5 font-mono text-lg text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSend}
                disabled={loading}
                className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:brightness-110 disabled:opacity-60"
              >
                {loading ? "Sending..." : "Confirm & Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}