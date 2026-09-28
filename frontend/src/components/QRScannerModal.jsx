import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { FaCamera, FaUpload, FaTimes, FaCheckCircle, FaUserCheck } from "react-icons/fa";
import { useToast } from "../context/ToastContext";

export default function QRScannerModal({ isOpen, onClose, onScanSuccess }) {
  const [activeTab, setActiveTab] = useState("camera"); // 'camera' | 'upload' | 'demo'
  const [cameraError, setCameraError] = useState("");
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);
  const { showToast } = useToast();

  const parseScannedData = (text) => {
    try {
      // 1. Check if JSON payload
      if (text.startsWith("{") && text.endsWith("}")) {
        const parsed = JSON.parse(text);
        if (parsed.email) return parsed.email.trim().toLowerCase();
      }
      // 2. Check if novapay:// or URL format
      if (text.includes("email=")) {
        const urlParams = new URLSearchParams(text.split("?")[1] || text);
        const email = urlParams.get("email");
        if (email) return email.trim().toLowerCase();
      }
      // 3. Check if plain email format
      const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) {
        return emailMatch[0].trim().toLowerCase();
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleValidResult = (rawText) => {
    const extractedEmail = parseScannedData(rawText);
    if (extractedEmail) {
      stopScanner();
      showToast(`Recipient verified: ${extractedEmail} 🎯`, "success");
      onScanSuccess(extractedEmail);
      onClose();
    } else {
      showToast("Scanned QR is not a valid NovaPay payment code", "error");
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        console.warn("Scanner stop note:", e);
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    let isCancelled = false;

    if (isOpen && activeTab === "camera") {
      const initCamera = async () => {
        setCameraError("");
        try {
          const html5QrCode = new Html5Qrcode("qr-reader-container");
          scannerRef.current = html5QrCode;

          await html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 220, height: 220 },
              aspectRatio: 1.0,
            },
            (decodedText) => {
              if (!isCancelled) {
                handleValidResult(decodedText);
              }
            },
            () => {
              // ignore frame read errors while seeking
            }
          );
          if (!isCancelled) setScanning(true);
        } catch (err) {
          console.warn("Camera init error:", err);
          if (!isCancelled) {
            setCameraError(
              "Camera access denied or unavailable. You can use 'Upload QR Image' or 'Quick Demo' instead!"
            );
          }
        }
      };

      // Slight delay to ensure DOM element exists
      const timer = setTimeout(initCamera, 200);
      return () => {
        isCancelled = true;
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen, activeTab]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const html5QrCode = new Html5Qrcode("qr-file-processor");
      const result = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();
      handleValidResult(result);
    } catch (err) {
      console.error(err);
      showToast("Unable to detect QR code in this image. Try another screenshot.", "error");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-700/80 bg-slate-900 p-6 shadow-2xl shadow-cyan-950/40 text-white">
        {/* Close Button */}
        <button
          onClick={() => {
            stopScanner();
            onClose();
          }}
          className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          aria-label="Close modal"
        >
          <FaTimes className="text-sm" />
        </button>

        {/* Header */}
        <div className="text-center mb-5">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
            Instant Recipient Lookup
          </span>
          <h3 className="text-xl font-bold text-white mt-1">Scan NovaPay QR Code</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Auto-fill receiver details securely from QR code
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex rounded-2xl bg-slate-800/80 p-1 mb-5 border border-slate-700">
          <button
            type="button"
            onClick={() => setActiveTab("camera")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition ${
              activeTab === "camera"
                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md shadow-blue-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FaCamera className="text-xs" /> Camera
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition ${
              activeTab === "upload"
                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md shadow-blue-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FaUpload className="text-xs" /> Upload Image
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("demo")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition ${
              activeTab === "demo"
                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md shadow-blue-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FaUserCheck className="text-xs" /> Quick Demo
          </button>
        </div>

        {/* Tab 1: Live Camera Scan */}
        {activeTab === "camera" && (
          <div className="flex flex-col items-center">
            <div className="relative w-full max-w-[280px] h-[280px] overflow-hidden rounded-2xl border-2 border-cyan-500/50 bg-black shadow-inner flex items-center justify-center">
              <div id="qr-reader-container" className="w-full h-full" />
              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 p-4 text-center">
                  <p className="text-xs text-rose-300 font-medium mb-3">{cameraError}</p>
                  <button
                    onClick={() => setActiveTab("demo")}
                    className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:brightness-110"
                  >
                    Use Quick Demo Instead
                  </button>
                </div>
              )}
            </div>
            <p className="mt-3 text-[11px] text-slate-400 text-center">
              Align recipient's QR code within the frame to auto-detect
            </p>
          </div>
        )}

        {/* Tab 2: Upload QR Image */}
        {activeTab === "upload" && (
          <div className="flex flex-col items-center py-4">
            <div id="qr-file-processor" className="hidden" />
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-700 hover:border-cyan-400 rounded-2xl cursor-pointer bg-slate-800/40 hover:bg-slate-800/70 transition p-4">
              <div className="flex flex-col items-center justify-center text-center">
                <FaUpload className="text-3xl text-cyan-400 mb-2" />
                <p className="text-xs font-semibold text-slate-200">
                  Click to browse or drop QR screenshot
                </p>
                <p className="text-[10px] text-slate-400 mt-1">PNG, JPG, WEBP up to 5MB</p>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Tab 3: Quick Demo Shortcuts */}
        {activeTab === "demo" && (
          <div className="space-y-3 py-2">
            <p className="text-xs text-slate-400">
              Select any pre-configured recipient for instant 1-click testing:
            </p>
            {[
              { name: "Alex Mercer", email: "alex@sample.com", role: "Verified Personal Contact" },
              { name: "Sarah Jenkins", email: "sarah@sample.com", role: "Design Lead" },
              { name: "Demo Commander", email: "demo@novapay.bank", role: "NovaPay System Demo" },
            ].map((recipient) => (
              <button
                key={recipient.email}
                type="button"
                onClick={() => {
                  stopScanner();
                  onScanSuccess(recipient.email);
                  showToast(`Auto-filled: ${recipient.name} (${recipient.email})`, "success");
                  onClose();
                }}
                className="w-full flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/80 p-3.5 text-left hover:border-cyan-400 hover:bg-slate-800 transition group"
              >
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-cyan-400 transition">
                    {recipient.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-mono">{recipient.email}</p>
                  <span className="text-[10px] text-cyan-400/80">{recipient.role}</span>
                </div>
                <FaCheckCircle className="text-slate-600 group-hover:text-cyan-400 transition text-sm" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
