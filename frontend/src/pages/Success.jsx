import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API from "../services/api";
import { useToast } from "../context/ToastContext";

export default function Success() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    const confirmPayment = async () => {
      try {
        const session_id = searchParams.get("session_id");

        if (!session_id) {
          showToast("Session ID not found", "error");
          navigate("/payment");
          return;
        }

        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const res = await API.post("/payment/confirm-payment", { session_id });

        showToast(res.data?.message || "Wallet recharged successfully!", "success");
        navigate("/");
      } catch (err) {
        console.error("Payment Error:", err);
        showToast(err.response?.data?.error || "Payment confirmation failed", "error");
        navigate("/payment");
      }
    };

    confirmPayment();
  }, [navigate, searchParams, showToast]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="rounded-3xl border border-slate-700 bg-slate-900 p-10 text-center shadow-2xl shadow-emerald-950/30">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-400 text-3xl">
          ✓
        </div>
        <h1 className="text-3xl font-bold">Verifying Payment...</h1>
      </div>
    </div>
  );
}