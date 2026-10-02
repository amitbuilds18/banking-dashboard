import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FaQrcode, FaCamera, FaUsers, FaStar, FaUserPlus } from "react-icons/fa";
import API from "../services/api";
import { useToast } from "../context/ToastContext";
import QRScannerModal from "../components/QRScannerModal";
import MyQRCodeModal from "../components/MyQRCodeModal";

export default function SendMoney() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const [receiverEmail, setReceiverEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [roundUp, setRoundUp] = useState(true);
  const [securityPin, setSecurityPin] = useState("1234");
  const [showPin, setShowPin] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showMyQr, setShowMyQr] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);

  // Beneficiaries & Quick Pay State
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [saveAsBeneficiary, setSaveAsBeneficiary] = useState(false);
  const [beneficiaryNickname, setBeneficiaryNickname] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) setCurrentUser(JSON.parse(stored));
    } catch (e) {
      console.warn("User parse error:", e);
    }

    // Check query params for pre-filling email & name
    const prefillEmail = searchParams.get("email");
    if (prefillEmail) {
      setReceiverEmail(prefillEmail);
    }
    const prefillName = searchParams.get("name");
    if (prefillName) {
      setBeneficiaryNickname(prefillName);
    }

    // Fetch saved beneficiaries
    API.get("/beneficiaries")
      .then((res) => setBeneficiaries(res.data || []))
      .catch((err) => console.warn("Beneficiaries fetch:", err));
  }, [searchParams]);

  const handleEmailChange = async (val) => {
    setReceiverEmail(val);
    if (val.trim().length >= 2) {
      try {
        const res = await API.get(`/auth/search?q=${encodeURIComponent(val.trim())}`);
        setSearchResults(res.data || []);
      } catch (e) {
        setSearchResults([]);
      }
    } else {
      setSearchResults([]);
    }
  };

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
    if (!securityPin || securityPin.trim().length !== 4) {
      showToast("Please enter your 4-digit Security MPIN", "error");
      return;
    }

    setLoading(true);

    try {
      const res = await API.post("/transactions/send", {
        receiver_email: receiverEmail.trim().toLowerCase(),
        amount: numericAmount,
        round_up: roundUp,
        mpin: securityPin.trim(),
      });

      if (res.data?.error) {
        showToast(res.data.error, "error");
        return;
      }

      // Auto-save as beneficiary if requested
      if (saveAsBeneficiary && !isAlreadySaved && receiverEmail) {
        try {
          await API.post("/beneficiaries", {
            name: beneficiaryNickname.trim() || receiverEmail.split("@")[0],
            email: receiverEmail.trim().toLowerCase(),
            nickname: beneficiaryNickname.trim() || undefined,
          });
        } catch (saveErr) {
          console.warn("Failed to auto-save beneficiary:", saveErr);
        }
      }

      showToast(res.data.message || "Money transferred successfully! 💸", "success");
      setShowConfirmModal(false);
      navigate("/");
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || "Transfer failed";
      showToast(errMsg, "error");
      if (errMsg.toLowerCase().includes("mpin") || errMsg.toLowerCase().includes("pin")) {
        setSecurityPin("");
      }
    } finally {
      setLoading(false);
    }
  };

  const isAlreadySaved = beneficiaries.some(
    (b) => b.email.toLowerCase() === receiverEmail.trim().toLowerCase()
  );

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

        {/* QUICK PAY BENEFICIARIES ROW */}
        {beneficiaries.length > 0 && (
          <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-950/50 p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <FaUsers className="text-cyan-400 text-xs" /> Quick Pay Contacts
              </span>
              <button
                type="button"
                onClick={() => navigate("/beneficiaries")}
                className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition"
              >
                Manage ({beneficiaries.length}) →
              </button>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin">
              {beneficiaries.map((b) => {
                const isSelected =
                  receiverEmail.trim().toLowerCase() === b.email.toLowerCase();
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setReceiverEmail(b.email);
                    }}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl transition shrink-0 min-w-[70px] ${
                      isSelected
                        ? "bg-cyan-500/20 border border-cyan-400 shadow-md shadow-cyan-500/20 scale-105"
                        : "bg-slate-800/80 border border-slate-700/60 hover:bg-slate-700/80"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${
                        b.avatar_color || "from-blue-500 to-cyan-500"
                      } text-xs font-black text-white shadow-sm`}
                    >
                      {b.nickname
                        ? b.nickname.slice(0, 2).toUpperCase()
                        : b.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-[11px] font-semibold text-slate-200 truncate max-w-[65px]">
                      {b.nickname || b.name.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <form onSubmit={handleOpenReview} className="space-y-5">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm text-slate-300">Recipient Email</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition"
                  title="Scan recipient's QR code"
                >
                  <FaCamera className="text-[10px]" /> Scan QR
                </button>
                <button
                  type="button"
                  onClick={() => setShowMyQr(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
                  title="Show my personal receiving QR code"
                >
                  <FaQrcode className="text-[10px]" /> My QR
                </button>
              </div>
            </div>
            <div className="relative">
              <input
                type="email"
                value={receiverEmail}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="e.g. rahul@gmail.com"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                required
              />

              {/* Live Registered User Suggestions */}
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-30 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl backdrop-blur-xl">
                  <div className="bg-slate-800/80 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-cyan-400">
                    Registered NovaPay Members
                  </div>
                  {searchResults.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setReceiverEmail(u.email);
                        setSearchResults([]);
                      }}
                      className="flex w-full items-center justify-between border-b border-slate-800/60 px-3.5 py-2.5 text-left text-xs transition hover:bg-cyan-500/15 last:border-none"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-[10px] font-bold text-cyan-400">
                          {u.name?.slice(0, 1)?.toUpperCase() || "U"}
                        </div>
                        <span className="font-semibold text-white">{u.name}</span>
                      </div>
                      <span className="font-mono text-xs text-cyan-300">{u.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Save as Beneficiary Checkbox for new contacts */}
            {receiverEmail && !isAlreadySaved && (
              <div className="mt-2.5 rounded-xl border border-slate-800 bg-slate-950/70 p-3 flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-cyan-300">
                  <input
                    type="checkbox"
                    checked={saveAsBeneficiary}
                    onChange={(e) => setSaveAsBeneficiary(e.target.checked)}
                    className="h-3.5 w-3.5 accent-cyan-400"
                  />
                  <span>⭐ Save to Beneficiaries for future 1-click Quick Pay</span>
                </label>
                {saveAsBeneficiary && (
                  <input
                    type="text"
                    value={beneficiaryNickname}
                    onChange={(e) => setBeneficiaryNickname(e.target.value)}
                    placeholder="Contact Nickname (e.g. Roommate, Mom)"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
                  />
                )}
              </div>
            )}
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-200">
                  🔐 4-Digit Security MPIN
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPin((prev) => !prev)}
                    className="text-[11px] text-cyan-400 hover:underline"
                  >
                    {showPin ? "Hide PIN" : "Show PIN"}
                  </button>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    Default: 1234
                  </span>
                </div>
              </div>
              <div className="relative">
                <input
                  type={showPin ? "text" : "password"}
                  maxLength={4}
                  value={securityPin}
                  onChange={(e) => setSecurityPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••"
                  className="w-full tracking-[0.6em] text-center rounded-xl border border-slate-700 bg-slate-800 py-3 font-mono text-xl text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition"
                  autoFocus
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                <span>Enter 4-digit PIN to release funds</span>
                <button
                  type="button"
                  onClick={() => navigate("/profile")}
                  className="text-cyan-400 hover:text-cyan-300 font-medium hover:underline"
                >
                  Change MPIN in Profile →
                </button>
              </div>
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

      {/* QR Code Scanner Modal */}
      <QRScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScanSuccess={(scannedEmail) => {
          setReceiverEmail(scannedEmail);
        }}
      />

      {/* My Personal QR Code Modal */}
      <MyQRCodeModal
        isOpen={showMyQr}
        onClose={() => setShowMyQr(false)}
        user={currentUser}
      />
    </div>
  );
}