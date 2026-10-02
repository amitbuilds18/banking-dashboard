import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaStore,
  FaReceipt,
  FaArrowLeft,
  FaCamera,
  FaCheckCircle,
  FaShoppingBag,
  FaUtensils,
  FaGasPump,
  FaLaptop,
  FaPrint,
  FaTimes,
  FaCalendarAlt,
  FaTag,
} from "react-icons/fa";
import { GiPill, GiShoppingCart } from "react-icons/gi";
import API from "../services/api";
import { useToast } from "../context/ToastContext";
import QRScannerModal from "../components/QRScannerModal";

const STORE_CATEGORIES = [
  { id: "Groceries", label: "Groceries", icon: GiShoppingCart, color: "from-emerald-500 to-teal-600" },
  { id: "Food & Dining", label: "Dining", icon: FaUtensils, color: "from-amber-500 to-orange-600" },
  { id: "Shopping", label: "Shopping", icon: FaShoppingBag, color: "from-purple-500 to-pink-600" },
  { id: "Medical", label: "Medical", icon: GiPill, color: "from-rose-500 to-red-600" },
  { id: "Fuel & Travel", label: "Fuel", icon: FaGasPump, color: "from-blue-500 to-cyan-600" },
  { id: "Electronics", label: "Tech", icon: FaLaptop, color: "from-indigo-500 to-blue-600" },
];

const PRESETS = [
  { name: "Reliance Smart Bazaar", category: "Groceries", defaultAmt: 1250, note: "Weekly grocery & milk" },
  { name: "Apollo Pharmacy", category: "Medical", defaultAmt: 420, note: "Prescription medicines" },
  { name: "Zudio Trends", category: "Shopping", defaultAmt: 899, note: "Cotton tees & socks" },
  { name: "Local Cafe & Bakery", category: "Food & Dining", defaultAmt: 340, note: "Cappuccino & cookies" },
  { name: "Indian Oil Petrol Pump", category: "Fuel & Travel", defaultAmt: 500, note: "Vehicle fuel topup" },
];

export default function StorePay() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [storeName, setStoreName] = useState("");
  const [category, setCategory] = useState("Groceries");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [securityPin, setSecurityPin] = useState("1234");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // History & Breakdown
  const [history, setHistory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [totalSpent, setTotalSpent] = useState(0);

  // Digital Receipt Modal
  const [receipt, setReceipt] = useState(null);

  const fetchStoreHistory = async () => {
    try {
      const res = await API.get("/store-pay/history");
      setHistory(res.data.history || []);
      setCategories(res.data.categories || []);
      setTotalSpent(res.data.totalSpent || 0);
    } catch (err) {
      console.warn("Store history error:", err);
    }
  };

  useEffect(() => {
    fetchStoreHistory();
  }, []);

  const handleApplyPreset = (p) => {
    setStoreName(p.name);
    setCategory(p.category);
    setAmount(p.defaultAmt.toString());
    setNotes(p.note);
  };

  const handleScanSuccess = (decodedText) => {
    setShowScanner(false);
    // Parse UPI QR or text
    if (decodedText.startsWith("upi://pay")) {
      try {
        const url = new URL(decodedText);
        const pn = url.searchParams.get("pn");
        if (pn) setStoreName(decodeURIComponent(pn));
        const am = url.searchParams.get("am");
        if (am) setAmount(am);
      } catch (e) {
        setStoreName(decodedText);
      }
    } else {
      setStoreName(decodedText);
    }
    showToast("Merchant QR scanned successfully! 📸", "success");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const numericAmount = Number(amount);
    if (!storeName.trim() || !numericAmount || numericAmount <= 0) {
      showToast("Store name and a valid amount are required", "error");
      return;
    }

    if (!securityPin || securityPin.trim().length !== 4) {
      showToast("Please enter your 4-digit Security MPIN", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await API.post("/store-pay", {
        store_name: storeName.trim(),
        category,
        amount: numericAmount,
        notes: notes.trim(),
        mpin: securityPin.trim(),
      });

      showToast(res.data?.message || "Store payment successful! 🛍️", "success");
      setReceipt(res.data.receipt);

      // Reset form
      setStoreName("");
      setAmount("");
      setNotes("");
      fetchStoreHistory();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || "Payment failed";
      showToast(errMsg, "error");
      if (errMsg.toLowerCase().includes("mpin")) setSecurityPin("");
    } finally {
      setLoading(false);
    }
  };

  const topCategory = categories[0]?.category || "None";

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-cyan-500 selection:text-slate-950 p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Top Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              onClick={() => navigate("/dashboard")}
              className="mb-2 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              <FaArrowLeft className="text-[10px]" /> Back to Dashboard
            </button>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-xl font-bold text-white shadow-lg shadow-purple-500/20">
                <FaStore />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white sm:text-3xl">
                  Store Pay & Shopping Expense
                </h1>
                <p className="text-xs text-slate-400">
                  Pay local stores, supermarkets & track categorized shopping expenses
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 px-4 py-2.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 transition"
          >
            <FaCamera /> Scan Merchant QR
          </button>
        </div>

        {/* Executive KPI Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400">
              Total In-Store Spending
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">
                ₹{totalSpent.toLocaleString("en-IN")}
              </span>
              <span className="text-xs text-slate-400">All Stores</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Categorized daily marketplace expenses</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
              Top Expense Category
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-300">{topCategory}</span>
              <span className="text-xs text-slate-400">
                {categories[0] ? `₹${Number(categories[0].total).toLocaleString("en-IN")}` : ""}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Highest volume category this month</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">
              Purchases Recorded
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-cyan-300">{history.length}</span>
              <span className="text-xs text-slate-400">Store visits</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Instant Digital Invoices generated</p>
          </div>
        </div>

        {/* 1-Click Popular Store Presets */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            Quick Store Presets (1-Click Fill)
          </span>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-left transition hover:border-purple-500/40 hover:bg-slate-850/80 active:scale-95"
              >
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-purple-300 transition truncate">
                    {p.name}
                  </h4>
                  <span className="inline-block mt-0.5 text-[10px] font-semibold text-slate-400">
                    {p.category}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2">
                  <span className="text-xs font-bold text-cyan-400">₹{p.defaultAmt}</span>
                  <span className="text-[10px] font-semibold text-slate-500 group-hover:text-white transition">
                    + Select
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main 2-Column Split: Payment Form + Category Breakdown & History */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Store Payment Form */}
          <div className="lg:col-span-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-xl">
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <FaShoppingBag className="text-purple-400 text-sm" /> In-Store Bill Checkout
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Enter shop name or scan QR to deduct funds and log categorized expense
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Shop / Merchant Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="e.g. Sharma Kirana Store, Zudio, Apollo"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-500/20 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg bg-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-600 transition"
                    title="Scan Merchant QR"
                  >
                    <FaCamera />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Expense Category *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {STORE_CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition ${
                          isSelected
                            ? "border-purple-500 bg-purple-500/20 text-purple-300 shadow-md"
                            : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800"
                        }`}
                      >
                        <Icon className="text-xs shrink-0" />
                        <span className="truncate">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Bill Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 750"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-500/20 transition"
                />

                {/* Quick amount chips */}
                <div className="mt-2 flex gap-2">
                  {[100, 250, 500, 1000, 2500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmount(amt.toString())}
                      className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700 transition"
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Purchased Items / Bill Note (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Monthly ration, snacks, medicines"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-500/20 transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    🔐 4-Digit Security MPIN
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPin((prev) => !prev)}
                      className="text-[11px] text-cyan-400 hover:underline"
                    >
                      {showPin ? "Hide" : "Show"}
                    </button>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      Default: 1234
                    </span>
                  </div>
                </div>
                <input
                  type={showPin ? "text" : "password"}
                  maxLength={4}
                  value={securityPin}
                  onChange={(e) => setSecurityPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••"
                  className="w-full tracking-[0.6em] text-center rounded-xl border border-slate-700 bg-slate-800 py-2.5 font-mono text-lg text-white outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-500/20 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 py-3 text-sm font-bold text-white shadow-lg shadow-purple-600/25 transition hover:brightness-110 disabled:opacity-50 active:scale-95"
              >
                {loading ? "Authorizing Payment..." : "🛍️ Pay Store & Save Bill"}
              </button>
            </form>
          </div>

          {/* Right Column: Category Breakdown & Recent Store Bills */}
          <div className="lg:col-span-6 space-y-6">
            {/* Category Breakdown */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-xl">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <FaTag className="text-cyan-400 text-xs" /> Store Spending Breakdown
              </h3>
              {categories.length === 0 ? (
                <p className="text-xs text-slate-500">No store expenses recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {categories.map((c) => {
                    const percent = totalSpent > 0 ? Math.round((Number(c.total) / totalSpent) * 100) : 0;
                    return (
                      <div key={c.category} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-300">{c.category}</span>
                          <span className="font-mono text-white font-bold">
                            ₹{Number(c.total).toLocaleString("en-IN")}{" "}
                            <span className="text-slate-500 font-normal">({percent}%)</span>
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Store Receipts List */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FaReceipt className="text-purple-400 text-xs" /> Recent Store Purchases
                </h3>
                <span className="text-[11px] text-slate-500">{history.length} Bills</span>
              </div>

              {history.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Purchases made at local stores or malls will appear here with digital receipt slips.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
                  {history.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3 hover:border-slate-700 transition"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white truncate">
                            {tx.name.replace("Store: ", "")}
                          </h4>
                          <span className="rounded-md bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 text-[9px] font-bold text-purple-300">
                            {tx.category}
                          </span>
                        </div>
                        {tx.notes && (
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            📝 {tx.notes}
                          </p>
                        )}
                        <span className="text-[10px] text-slate-500">
                          {new Date(tx.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-black text-rose-400 font-mono">
                          -₹{Math.abs(Number(tx.amount)).toLocaleString("en-IN")}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setReceipt({
                              id: tx.id,
                              store_name: tx.name.replace("Store: ", ""),
                              category: tx.category,
                              amount: Math.abs(Number(tx.amount)),
                              notes: tx.notes,
                              date: tx.created_at,
                            })
                          }
                          className="mt-1 inline-flex items-center gap-1 text-[10px] text-cyan-400 hover:underline"
                        >
                          <FaReceipt className="text-[9px]" /> Bill Slip
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DIGITAL STORE BILL RECEIPT MODAL */}
      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <button
              onClick={() => setReceipt(null)}
              className="absolute right-5 top-5 text-slate-400 hover:text-white transition"
            >
              <FaTimes />
            </button>

            {/* Receipt Styling (Thermal/Invoice design) */}
            <div className="rounded-2xl border border-slate-700/80 bg-slate-950 p-5 font-mono text-xs space-y-4">
              <div className="text-center border-b border-dashed border-slate-700 pb-3">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 text-lg">
                  <FaStore />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  {receipt.store_name}
                </h3>
                <p className="text-[10px] text-slate-400">NovaPay Verified Merchant</p>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 mt-1">
                  <FaCheckCircle className="text-[9px]" /> Payment Settled
                </span>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>Ref ID:</span>
                  <span className="text-white font-bold">NP-STR-{receipt.id}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Date:</span>
                  <span className="text-slate-300">
                    {new Date(receipt.date).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Category:</span>
                  <span className="text-purple-300">{receipt.category}</span>
                </div>
                {receipt.notes && (
                  <div className="flex justify-between text-slate-400">
                    <span>Items/Note:</span>
                    <span className="text-slate-200 truncate max-w-[150px]">{receipt.notes}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>Channel:</span>
                  <span className="text-slate-300">NovaPay Instant Balance</span>
                </div>
              </div>

              <div className="border-t border-b border-dashed border-slate-700 py-2.5 flex justify-between items-baseline">
                <span className="font-bold text-white">TOTAL PAID:</span>
                <span className="text-lg font-black text-cyan-400">
                  ₹{Number(receipt.amount).toLocaleString("en-IN")}
                </span>
              </div>

              {receipt.balance !== undefined && (
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Remaining Wallet:</span>
                  <span className="text-slate-200">₹{Number(receipt.balance).toLocaleString("en-IN")}</span>
                </div>
              )}

              <p className="text-center text-[9px] text-slate-500 pt-1">
                Thank you for your purchase! Keep this digital invoice for returns or warranties.
              </p>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
              >
                <FaPrint /> Print Slip
              </button>
              <button
                type="button"
                onClick={() => setReceipt(null)}
                className="flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-600/25 hover:brightness-110 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR SCANNER MODAL */}
      {showScanner && (
        <QRScannerModal
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
          onScanSuccess={handleScanSuccess}
        />
      )}
    </div>
  );
}
