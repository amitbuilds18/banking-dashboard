import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { FaDownload, FaCopy, FaTimes, FaQrcode } from "react-icons/fa";
import { useToast } from "../context/ToastContext";

export default function MyQRCodeModal({ isOpen, onClose, user }) {
  const canvasRef = useRef(null);
  const { showToast } = useToast();

  const userEmail = user?.email || "user@novapay.bank";
  const userName = user?.name || "NovaPay User";

  // Standard NovaPay QR payload
  const qrPayload = JSON.stringify({
    type: "novapay_transfer",
    email: userEmail,
    name: userName,
    app: "NovaPay",
  });

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        qrPayload,
        {
          width: 240,
          margin: 2,
          color: {
            dark: "#0F172A", // Slate 900
            light: "#FFFFFF",
          },
        },
        (error) => {
          if (error) console.error("QR Code Error:", error);
        }
      );
    }
  }, [isOpen, qrPayload]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `NovaPay_QR_${userName.replace(/\s+/g, "_")}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("QR Code downloaded successfully! 📲", "success");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(userEmail);
    showToast("Payment email copied to clipboard! 📋", "success");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl border border-slate-700/80 bg-slate-900 p-6 shadow-2xl shadow-cyan-950/40 text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          aria-label="Close modal"
        >
          <FaTimes className="text-sm" />
        </button>

        {/* Header */}
        <div className="mb-4">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30">
            <FaQrcode className="text-xl" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
            Instant Scan & Pay
          </span>
          <h3 className="text-xl font-bold text-white mt-0.5">{userName}</h3>
          <p className="text-xs text-slate-400 font-mono mt-0.5">{userEmail}</p>
        </div>

        {/* QR Code Canvas Card */}
        <div className="my-5 flex flex-col items-center justify-center rounded-2xl border border-slate-700/80 bg-white p-4 shadow-inner">
          <canvas ref={canvasRef} className="rounded-lg shadow-sm" />
          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Verified NovaPay P2P QR</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 py-2.5 text-xs font-semibold text-white shadow-md shadow-cyan-500/20 hover:brightness-110 transition"
          >
            <FaDownload className="text-xs" /> Download
          </button>
          <button
            onClick={handleCopy}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
          >
            <FaCopy className="text-xs" /> Copy Email
          </button>
        </div>
      </div>
    </div>
  );
}
