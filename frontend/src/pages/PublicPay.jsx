import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import QRCode from "qrcode";
import {
  FaCheckCircle,
  FaShieldAlt,
  FaBolt,
  FaQrcode,
  FaMoneyBillWave,
  FaArrowRight,
  FaTimesCircle,
  FaExclamationTriangle,
  FaReceipt,
  FaDownload,
  FaWallet,
} from "react-icons/fa";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1"
    ? "https://banking-dashboard-anuc.vercel.app/api"
    : "http://localhost:5000/api");

function QRCodeCanvas({ text, size = 160 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (canvasRef.current && text) {
      QRCode.toCanvas(canvasRef.current, text, {
        width: size,
        margin: 2,
        color: { dark: "#0F172A", light: "#FFFFFF" },
      });
    }
  }, [text, size]);
  return <canvas ref={canvasRef} className="rounded-xl mx-auto shadow-md" />;
}

export default function PublicPay() {
  const { linkCode } = useParams();
  const [loading, setLoading] = useState(true);
  const [linkData, setLinkData] = useState(null);
  const [error, setError] = useState(null);

  // Settlement Form State
  const [payerName, setPayerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI App");
  const [settling, setSettling] = useState(false);
  const [settledReceipt, setSettledReceipt] = useState(null);

  useEffect(() => {
    const fetchLink = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE}/payment-links/public/${linkCode}`);
        setLinkData(res.data);
      } catch (err) {
        console.error("Public link fetch error:", err);
        setError(err.response?.data?.message || "Invalid or expired payment link.");
      } finally {
        setLoading(false);
      }
    };

    if (linkCode) fetchLink();
  }, [linkCode]);

  const handleSettlePayment = async (e) => {
    e.preventDefault();
    try {
      setSettling(true);
      const res = await axios.post(`${API_BASE}/payment-links/public/${linkCode}/settle`, {
        payerName: payerName || "Guest Payer",
        paymentMethod,
      });
      setSettledReceipt(res.data.receipt);
    } catch (err) {
      alert(err.response?.data?.message || "Payment settlement failed.");
    } finally {
      setSettling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-3 font-sans">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold">Loading secure payment request...</p>
      </div>
    );
  }

  if (error || !linkData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center font-sans">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 text-3xl mb-4">
          <FaTimesCircle />
        </div>
        <h2 className="text-xl font-bold text-white">Payment Link Unavailable</h2>
        <p className="text-xs text-slate-400 max-w-sm mt-1">{error}</p>
        <Link
          to="/"
          className="mt-6 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs"
        >
          Go to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 text-slate-100 flex flex-col items-center justify-center p-4 font-sans antialiased">
      {/* Container Card */}
      <div className="w-full max-w-md rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-2xl overflow-hidden relative">
        {/* Top Header Banner */}
        <div className="p-6 bg-gradient-to-br from-slate-900 to-emerald-950/30 border-b border-slate-800 text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <FaShieldAlt /> NovaPay Secure Checkout
          </div>

          <div>
            <p className="text-xs text-slate-400">Paying to</p>
            <h2 className="text-lg font-extrabold text-white flex items-center justify-center gap-1.5">
              {linkData.merchantName}
              <span className="text-emerald-400 text-xs" title="Verified NovaPay Merchant">
                ●
              </span>
            </h2>
          </div>

          <div className="pt-2">
            <p className="text-xs text-slate-400">{linkData.description}</p>
            <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 mt-1">
              ₹{linkData.amount.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* SUCCESS RECEIPT STATE */}
          {settledReceipt || linkData.status === "paid" ? (
            <div className="text-center space-y-5 animate-scale-up py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 mx-auto flex items-center justify-center text-emerald-400 text-3xl shadow-xl shadow-emerald-500/10 animate-bounce">
                <FaCheckCircle />
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">Payment Successful!</h3>
                <p className="text-xs text-emerald-400 font-semibold mt-0.5">
                  ₹{linkData.amount.toLocaleString("en-IN")} Deposited to {linkData.merchantName}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs text-left">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Transaction Ref</span>
                  <span className="font-mono font-bold text-slate-200">
                    {settledReceipt?.transactionRef || linkData.transactionRef}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Paid By</span>
                  <span className="font-semibold text-white">
                    {settledReceipt?.payerName || linkData.paidByName || "Verified Payer"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Payment Channel</span>
                  <span className="font-semibold text-emerald-400">
                    {settledReceipt?.paymentMethod || linkData.paidByMethod || "BHIM UPI"}
                  </span>
                </div>
                <div className="flex justify-between py-1 font-bold text-white pt-1">
                  <span>Amount Paid</span>
                  <span>₹{linkData.amount.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <FaDownload /> Print Payment Receipt
                </button>
              </div>
            </div>
          ) : linkData.status === "expired" ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 mx-auto flex items-center justify-center text-amber-400 text-2xl">
                <FaExclamationTriangle />
              </div>
              <h3 className="text-base font-bold text-white">Payment Link Expired</h3>
              <p className="text-xs text-slate-400">
                This payment request has passed its expiration time. Please request a new link from
                the beneficiary.
              </p>
            </div>
          ) : (
            /* ACTIVE PAYMENT FORM */
            <div className="space-y-6">
              {/* Option 1: Dynamic QR Code */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-3">
                <div className="mx-auto flex justify-center py-1">
                  <QRCodeCanvas text={linkData.upiString} size={160} />
                </div>
                <p className="text-[11px] text-slate-400">
                  Scan using Google Pay, PhonePe, Paytm or BHIM UPI
                </p>
              </div>

              {/* Option 2: UPI Deep Link for Mobile */}
              <a
                href={linkData.upiString}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <FaBolt /> Pay via Installed UPI App
              </a>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-800" />
                <span className="flex-shrink mx-3 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                  OR CONFIRM SETTLEMENT
                </span>
                <div className="flex-grow border-t border-slate-800" />
              </div>

              {/* Option 3: Instant Settlement Form */}
              <form onSubmit={handleSettlePayment} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Payment Channel</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="UPI (Google Pay / PhonePe)">UPI (Google Pay / PhonePe)</option>
                    <option value="Debit / Credit Card">Debit / Credit Card</option>
                    <option value="NetBanking">NetBanking</option>
                    <option value="NovaPay Wallet">NovaPay Wallet</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={settling}
                  className="w-full py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                >
                  <FaCheckCircle className="text-emerald-400" />
                  {settling
                    ? "Processing Payment..."
                    : `Confirm Payment of ₹${linkData.amount.toLocaleString("en-IN")}`}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800/80 text-center">
          <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
            <FaShieldAlt className="text-emerald-400" /> End-to-End 256-bit SSL Encrypted • Powered by
            NovaPay NeoBank
          </p>
        </div>
      </div>
    </div>
  );
}
