import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { useToast } from "../context/ToastContext";

export default function SendMoney() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [receiverEmail, setReceiverEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();

    setLoading(true);

    try {
      const res = await API.post("/transactions/send", {
        receiver_email: receiverEmail,
        amount: Number(amount),
      });

      if (res.data?.error) {
        showToast(res.data.error, "error");
        return;
      }

      setReceiverEmail("");
      setAmount("");
      showToast("Money sent successfully!", "success");
      navigate("/");
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || "Server error", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-700/80 bg-slate-900/80 p-8 shadow-2xl shadow-blue-950/30 backdrop-blur-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 text-2xl font-bold text-white shadow-lg shadow-blue-500/30">
            💸
          </div>
          <h2 className="text-3xl font-bold text-white">Send Money</h2>
          <p className="mt-2 text-sm text-slate-400">Transfer funds securely in seconds</p>
        </div>

        <form onSubmit={handleSend} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm text-slate-300">Receiver Email</label>
            <input
              type="email"
              value={receiverEmail}
              onChange={(e) => setReceiverEmail(e.target.value)}
              placeholder="rahul@gmail.com"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="500"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded-xl py-3 font-semibold text-white transition ${
              loading ? "cursor-not-allowed bg-slate-600" : "bg-gradient-to-r from-blue-500 to-cyan-500 hover:brightness-110"
            }`}
          >
            {loading ? "Sending..." : "Send Money"}
          </button>
        </form>
      </div>
    </div>
  );
}