import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { useToast } from "../context/ToastContext";

const StripeCheckout = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      const response = await API.post("/payment/create-checkout-session", {});

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

  return (
    <div className="rounded-3xl border border-emerald-500/20 bg-linear-to-r from-emerald-500/10 via-slate-900 to-slate-900 p-6 shadow-xl shadow-emerald-950/20">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Wallet top-up</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Add Money</h2>
          <p className="mt-2 text-sm text-slate-400">Recharge your wallet securely using Stripe.</p>
        </div>

        <button
          onClick={handleCheckout}
          disabled={loading}
          className="rounded-xl bg-linear-to-r from-emerald-500 to-green-500 px-5 py-3 font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Processing..." : "💳 Pay ₹500"}
        </button>
      </div>
    </div>
  );
};

export default StripeCheckout;