import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBolt,
  FaMobileAlt,
  FaWifi,
  FaTv,
  FaFire,
  FaCheckCircle,
  FaShieldAlt,
  FaReceipt,
  FaTimes,
  FaArrowLeft,
  FaChevronRight,
} from "react-icons/fa";
import API from "../services/api";
import { useToast } from "../context/ToastContext";

const CATEGORIES = [
  {
    id: "electricity",
    name: "Electricity",
    icon: FaBolt,
    tag: "Utility",
    color: "from-amber-500 to-yellow-600",
    providers: [
      { name: "Tata Power", sampleAccount: "TP-84729103", dueAmount: 1450 },
      { name: "Adani Electricity", sampleAccount: "AD-99238471", dueAmount: 2380 },
      { name: "BSES Rajdhani", sampleAccount: "BSES-1029384", dueAmount: 3120 },
      { name: "BESCOM Bengaluru", sampleAccount: "BES-55443322", dueAmount: 1890 },
    ],
  },
  {
    id: "mobile",
    name: "Mobile Recharge",
    icon: FaMobileAlt,
    tag: "Prepaid / 5G",
    color: "from-blue-500 to-cyan-600",
    providers: [
      { name: "Jio Prepaid 5G", sampleAccount: "9876543210", plans: [299, 666, 999] },
      { name: "Airtel Truly Unlimited", sampleAccount: "9812345678", plans: [319, 719, 999] },
      { name: "Vi Hero Unlimited", sampleAccount: "9823456789", plans: [299, 479, 799] },
    ],
  },
  {
    id: "broadband",
    name: "Broadband & Fiber",
    icon: FaWifi,
    tag: "High Speed",
    color: "from-emerald-500 to-teal-600",
    providers: [
      { name: "JioFiber 100Mbps", sampleAccount: "JF-88776655", dueAmount: 999 },
      { name: "Airtel Xstream Fiber", sampleAccount: "AX-44332211", dueAmount: 1199 },
      { name: "ACT Fibernet", sampleAccount: "ACT-99001122", dueAmount: 799 },
    ],
  },
  {
    id: "subscriptions",
    name: "Subscriptions",
    icon: FaTv,
    tag: "OTT & Music",
    color: "from-rose-500 to-pink-600",
    providers: [
      { name: "Netflix Premium (4K)", sampleAccount: "netflix@user.bank", plans: [199, 499, 649] },
      { name: "Spotify Premium Family", sampleAccount: "spotify@user.bank", plans: [119, 179, 299] },
      { name: "Amazon Prime Video", sampleAccount: "prime@user.bank", plans: [299, 999, 1499] },
    ],
  },
  {
    id: "gas",
    name: "Gas Cylinder",
    icon: FaFire,
    tag: "LPG Refill",
    color: "from-orange-500 to-red-600",
    providers: [
      { name: "Indane Gas (IOCL)", sampleAccount: "LPG-19283746", dueAmount: 950 },
      { name: "Bharat Gas (BPCL)", sampleAccount: "LPG-83746281", dueAmount: 960 },
      { name: "HP Gas (HPCL)", sampleAccount: "LPG-47281938", dueAmount: 955 },
    ],
  },
];

export default function BillPay() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [selectedProvider, setSelectedProvider] = useState(CATEGORIES[0].providers[0]);
  const [consumerNumber, setConsumerNumber] = useState(CATEGORIES[0].providers[0].sampleAccount);
  const [amount, setAmount] = useState(CATEGORIES[0].providers[0].dueAmount || 1450);

  // MPIN & Modal states
  const [showMpinModal, setShowMpinModal] = useState(false);
  const [mpin, setMpin] = useState("1234");
  const [showPin, setShowPin] = useState(false);
  const [paying, setPaying] = useState(false);

  // Success Receipt State
  const [receipt, setReceipt] = useState(null);

  // When category changes, select first provider
  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    const firstProv = cat.providers[0];
    setSelectedProvider(firstProv);
    setConsumerNumber(firstProv.sampleAccount);
    setAmount(firstProv.dueAmount || firstProv.plans?.[0] || 500);
  };

  // When provider changes
  const handleProviderSelect = (prov) => {
    setSelectedProvider(prov);
    setConsumerNumber(prov.sampleAccount);
    setAmount(prov.dueAmount || prov.plans?.[0] || 500);
  };

  const handleOpenReview = (e) => {
    e.preventDefault();
    if (!consumerNumber || !amount || Number(amount) <= 0) {
      showToast("Please enter a valid consumer number and amount", "error");
      return;
    }
    setShowMpinModal(true);
  };

  const handlePayBill = async () => {
    if (!mpin || mpin.trim().length !== 4) {
      showToast("Please enter your 4-digit Security MPIN", "error");
      return;
    }

    setPaying(true);

    try {
      const res = await API.post("/bills/pay", {
        biller_name: selectedProvider.name,
        category: selectedCategory.name,
        consumer_number: consumerNumber.trim(),
        amount: Number(amount),
        mpin: mpin.trim(),
      });

      showToast(res.data?.message || "Bill paid successfully! ⚡", "success");
      setReceipt({
        billerName: selectedProvider.name,
        category: selectedCategory.name,
        consumerNumber,
        amount: Number(amount),
        referenceId: res.data?.referenceId || "NP-BILL-REF",
        timestamp: res.data?.timestamp || new Date().toISOString(),
      });
      setShowMpinModal(false);
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || "Bill payment failed";
      showToast(errMsg, "error");
      if (errMsg.toLowerCase().includes("mpin") || errMsg.toLowerCase().includes("pin")) {
        setMpin("");
      }
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white md:p-8">
      <div className="mx-auto max-w-5xl">
        {/* Top Navigation */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            <FaArrowLeft className="text-xs" /> Back to Dashboard
          </button>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 text-xs font-bold text-cyan-300">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            NovaPay Verified Billers • BBPS Protocol
          </span>
        </div>

        {/* Page Title */}
        <div className="mb-8">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">
            Smart Utility Center
          </span>
          <h1 className="mt-1 text-3xl font-black text-white sm:text-4xl">
            Bill Payments & Recharges
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Pay utility bills, mobile recharges, and subscriptions with instant ledger settlement.
          </p>
        </div>

        {/* Category Horizontal Pills */}
        <div className="mb-8 flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory.id === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategorySelect(cat)}
                className={`flex shrink-0 items-center gap-3 rounded-2xl border px-5 py-3.5 transition-all duration-200 ${
                  isSelected
                    ? "border-cyan-400 bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-white shadow-lg shadow-cyan-500/10"
                    : "border-slate-800 bg-slate-900/80 text-slate-400 hover:border-slate-700 hover:text-white"
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${cat.color} text-white shadow-md`}
                >
                  <Icon className="text-base" />
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-bold">{cat.name}</h4>
                  <span className="text-[10px] text-slate-400">{cat.tag}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Main Grid: Biller Select & Payment Form */}
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Left Column: Provider Selection (5 cols) */}
          <div className="space-y-4 lg:col-span-5">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              Select {selectedCategory.name} Provider
            </h3>

            <div className="space-y-2.5">
              {selectedCategory.providers.map((prov) => {
                const isSelected = selectedProvider.name === prov.name;

                return (
                  <button
                    key={prov.name}
                    type="button"
                    onClick={() => handleProviderSelect(prov)}
                    className={`w-full flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                      isSelected
                        ? "border-cyan-400 bg-slate-850 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-400/30"
                        : "border-slate-800 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-900"
                    }`}
                  >
                    <div>
                      <h4 className="text-sm font-bold text-white">{prov.name}</h4>
                      <p className="mt-0.5 text-xs text-slate-400 font-mono">
                        Acc: {prov.sampleAccount}
                      </p>
                    </div>

                    <div className="text-right">
                      {prov.dueAmount ? (
                        <span className="text-sm font-black text-rose-400">
                          ₹{prov.dueAmount.toLocaleString("en-IN")}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-cyan-400">
                          View Plans →
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Bill Details & Pay Form (7 cols) */}
          <div className="rounded-3xl border border-slate-700/80 bg-slate-900/85 p-7 shadow-2xl backdrop-blur-xl lg:col-span-7">
            <div className="mb-6 flex items-center justify-between border-b border-slate-800 pb-5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
                  Payment Breakdown
                </span>
                <h3 className="text-xl font-bold text-white mt-1">{selectedProvider.name}</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Category: {selectedCategory.name}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white text-xl shadow-lg shadow-cyan-500/25">
                <selectedCategory.icon />
              </div>
            </div>

            <form onSubmit={handleOpenReview} className="space-y-5">
              {/* Consumer / Phone Input */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Consumer ID / Account Number
                </label>
                <input
                  type="text"
                  value={consumerNumber}
                  onChange={(e) => setConsumerNumber(e.target.value)}
                  placeholder="e.g. 9876543210 or TP-12345"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 font-mono text-sm text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                  required
                />
              </div>

              {/* Amount Input */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Bill Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-base font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="1000"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 pl-8 pr-4 font-bold text-lg text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                    required
                  />
                </div>

                {/* Popular Plans or Presets */}
                {selectedProvider.plans && (
                  <div className="mt-3">
                    <span className="text-[11px] text-slate-400 block mb-2 font-medium">
                      Select Popular Plan:
                    </span>
                    <div className="flex gap-2">
                      {selectedProvider.plans.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setAmount(p)}
                          className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                            Number(amount) === p
                              ? "border-cyan-400 bg-cyan-500/20 text-cyan-300"
                              : "border-slate-700 bg-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          ₹{p} Plan
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Summary Breakdown Box */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-xs space-y-2.5">
                <div className="flex justify-between text-slate-400">
                  <span>Convenience Fee:</span>
                  <span className="text-emerald-400 font-bold">FREE (₹0)</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Settlement Speed:</span>
                  <span className="text-cyan-400 font-medium">Real-Time Instant</span>
                </div>
                <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-bold text-white">
                  <span>Total Payable:</span>
                  <span className="text-cyan-400 text-base">
                    ₹{Number(amount || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3.5 font-bold text-white shadow-lg shadow-cyan-500/25 transition hover:brightness-110"
              >
                Proceed to Pay ₹{Number(amount || 0).toLocaleString("en-IN")}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* MPIN CONFIRMATION MODAL */}
      {showMpinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 text-white text-base shadow-md">
                  <FaShieldAlt />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Authorize Bill Payment</h3>
                  <p className="text-xs text-slate-400">{selectedProvider.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowMpinModal(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <FaTimes />
              </button>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 mb-5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Account ID:</span>
                <span className="font-mono text-white">{consumerNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payable Amount:</span>
                <span className="font-bold text-cyan-400 text-sm">
                  ₹{Number(amount).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* MPIN Input */}
            <div className="mb-6">
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
                    {showPin ? "Hide PIN" : "Show PIN"}
                  </button>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    Default: 1234
                  </span>
                </div>
              </div>
              <input
                type={showPin ? "text" : "password"}
                maxLength={4}
                value={mpin}
                onChange={(e) => setMpin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="w-full tracking-[0.6em] text-center rounded-xl border border-slate-700 bg-slate-800 py-3 font-mono text-xl text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition"
                autoFocus
              />
              <p className="mt-1.5 text-[11px] text-slate-400 text-center">
                Enter your 4-digit secret PIN to authorize fund deduction
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowMpinModal(false)}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePayBill}
                disabled={paying || mpin.length !== 4}
                className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-2.5 text-xs font-semibold text-white shadow-lg shadow-cyan-500/25 hover:brightness-110 disabled:opacity-50"
              >
                {paying ? "Paying Bill..." : "Authorize & Pay"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIGITAL RECEIPT MODAL */}
      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl border border-emerald-500/40 bg-slate-900 p-6 shadow-2xl shadow-emerald-950/50 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-400 text-2xl text-slate-950 shadow-lg shadow-emerald-500/30">
              ✓
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
              Payment Successful
            </span>
            <h3 className="text-2xl font-black text-white mt-1">
              ₹{receipt.amount.toLocaleString("en-IN")}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{receipt.billerName}</p>

            <div className="my-5 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Category:</span>
                <span className="font-semibold text-white">{receipt.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Consumer No:</span>
                <span className="font-mono text-white">{receipt.consumerNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ref ID:</span>
                <span className="font-mono text-cyan-400">{receipt.referenceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date:</span>
                <span className="text-slate-300">
                  {new Date(receipt.timestamp).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setReceipt(null);
                  navigate("/transactions");
                }}
                className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 py-2.5 text-xs font-bold text-white shadow-md hover:brightness-110"
              >
                View Statement
              </button>
              <button
                type="button"
                onClick={() => setReceipt(null)}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Pay Another
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
