import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { useToast } from "../context/ToastContext";

const StripeCheckout = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [selectedAmount, setSelectedAmount] = useState(500);
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const presets = [500, 1000, 2500, 5000];

  const handleCheckout = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    const finalAmount = customAmount ? Number(customAmount) : selectedAmount;

    if (!Number.isFinite(finalAmount) || finalAmount < 100) {
      showToast("Minimum recharge amount is ₹100", "error");
      return;
    }

    try {
      setLoading(true);
      const response = await API.post("/payment/create-checkout-session", {
        amount: finalAmount,
      });

      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        showToast("Unable to start payment. Please try again.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || "Payment failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const currentAmount = customAmount ? Number(customAmount) : selectedAmount;

  return (
    <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 p-6 shadow-xl shadow-emerald-950/20 backdrop-blur-xl">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
            Instant Wallet Top-up
          </span>
          <h3 className="mt-1 text-2xl font-bold text-white">Recharge Wallet</h3>
          <p className="mt-1 text-xs text-slate-400">
            Load funds via Stripe Card Checkout with instant balance confirmation.
          </p>

          {/* Presets & Custom Input */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {presets.map((amt) => {
              const isSelected = !customAmount && selectedAmount === amt;
              return (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    setSelectedAmount(amt);
                    setCustomAmount("");
                  }}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                    isSelected
                      ? "border border-emerald-400 bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                      : "border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  ₹{amt.toLocaleString("en-IN")}
                </button>
              );
            })}

            <div className="relative">
              <span className="absolute left-3 top-2 text-xs text-slate-400">₹</span>
              <input
                type="number"
                placeholder="Custom"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                }}
                className="w-28 rounded-xl border border-slate-700 bg-slate-800 py-1.5 pl-6 pr-3 text-xs text-white outline-none focus:border-emerald-400"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Redirecting..." : `💳 Pay ₹${currentAmount ? currentAmount.toLocaleString("en-IN") : 0}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StripeCheckout;