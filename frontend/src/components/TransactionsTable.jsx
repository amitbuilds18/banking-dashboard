import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaSearch,
  FaArrowUp,
  FaArrowDown,
  FaBolt,
  FaMobileAlt,
  FaWifi,
  FaTv,
  FaUtensils,
  FaShoppingCart,
  FaPaperPlane,
  FaWallet,
  FaPiggyBank,
  FaReceipt,
  FaTrash,
  FaChevronRight,
  FaTimes,
  FaFilter,
  FaShieldAlt,
} from "react-icons/fa";
import API from "../services/api";
import { useToast } from "../context/ToastContext";

export default function TransactionsTable() {
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'inflow' | 'outflow' | 'bills'
  const [sortType, setSortType] = useState("latest");

  // Selected Transaction for Drawer / Details Modal
  const [selectedTx, setSelectedTx] = useState(null);

  const loadData = async () => {
    try {
      const res = await API.get("/transactions");
      if (Array.isArray(res.data)) {
        setTransactions(res.data);
        setError("");
      }
    } catch (err) {
      console.error(err);
      setError("Unable to load transaction records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    const confirmDelete = window.confirm("Delete this transaction record from your view?");
    if (!confirmDelete) return;

    try {
      const res = await API.delete(`/transactions/${id}`);
      if (res.data?.error) {
        showToast(res.data.error, "error");
        return;
      }
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      if (selectedTx?.id === id) setSelectedTx(null);
      showToast("Transaction removed from history", "success");
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || "Failed to delete record", "error");
    }
  };

  // Helper: Detect Merchant / Category Icon & Styling
  const getTransactionVisuals = (name, amount) => {
    const n = (name || "").toLowerCase();
    const isOutflow = Number(amount) < 0;

    if (n.includes("electricity") || n.includes("tata power") || n.includes("adani")) {
      return {
        icon: FaBolt,
        gradient: "from-amber-500 to-yellow-600",
        badge: "Electricity",
        category: "Utility Bill",
      };
    }
    if (n.includes("mobile") || n.includes("jio") || n.includes("airtel")) {
      return {
        icon: FaMobileAlt,
        gradient: "from-blue-500 to-cyan-600",
        badge: "Mobile 5G",
        category: "Telecom",
      };
    }
    if (n.includes("broadband") || n.includes("fiber") || n.includes("wifi")) {
      return {
        icon: FaWifi,
        gradient: "from-emerald-500 to-teal-600",
        badge: "Broadband",
        category: "Internet",
      };
    }
    if (n.includes("netflix") || n.includes("spotify") || n.includes("prime") || n.includes("subscription")) {
      return {
        icon: FaTv,
        gradient: "from-rose-500 to-pink-600",
        badge: "Subscription",
        category: "Entertainment",
      };
    }
    if (n.includes("dining") || n.includes("gourmet") || n.includes("food") || n.includes("restaurant")) {
      return {
        icon: FaUtensils,
        gradient: "from-orange-500 to-amber-600",
        badge: "Dining",
        category: "Food & Drinks",
      };
    }
    if (n.includes("grocery") || n.includes("supermarket")) {
      return {
        icon: FaShoppingCart,
        gradient: "from-teal-500 to-emerald-600",
        badge: "Grocery",
        category: "Shopping",
      };
    }
    if (n.includes("vault") || n.includes("spare") || n.includes("round")) {
      return {
        icon: FaPiggyBank,
        gradient: "from-purple-500 to-indigo-600",
        badge: "Smart Vault",
        category: "Auto-Savings",
      };
    }
    if (n.includes("recharge") || n.includes("stripe") || n.includes("deposit")) {
      return {
        icon: FaWallet,
        gradient: "from-emerald-500 to-green-600",
        badge: "Top-Up",
        category: "Wallet Deposit",
      };
    }
    if (isOutflow) {
      return {
        icon: FaPaperPlane,
        gradient: "from-blue-500 to-indigo-600",
        badge: "Transfer Sent",
        category: "Peer-to-Peer",
      };
    }
    return {
      icon: FaArrowDown,
      gradient: "from-emerald-500 to-teal-600",
      badge: "Money Received",
      category: "Income Inflow",
    };
  };

  const filteredTransactions = useMemo(() => {
    let list = [...transactions];

    // Filter by search text
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          (t.name || "").toLowerCase().includes(q) ||
          (t.receiver_email || "").toLowerCase().includes(q) ||
          String(t.amount || "").includes(q)
      );
    }

    // Filter by Active Tab
    if (activeTab === "inflow") {
      list = list.filter((t) => Number(t.amount) > 0);
    } else if (activeTab === "outflow") {
      list = list.filter((t) => Number(t.amount) < 0);
    } else if (activeTab === "bills") {
      list = list.filter((t) => {
        const n = (t.name || "").toLowerCase();
        return (
          n.includes("bill") ||
          n.includes("recharge") ||
          n.includes("power") ||
          n.includes("fiber") ||
          n.includes("jio") ||
          n.includes("airtel")
        );
      });
    }

    // Sort
    if (sortType === "high") {
      list.sort((a, b) => Math.abs(Number(b.amount)) - Math.abs(Number(a.amount)));
    } else if (sortType === "low") {
      list.sort((a, b) => Math.abs(Number(a.amount)) - Math.abs(Number(b.amount)));
    } else {
      list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }

    return list;
  }, [transactions, search, activeTab, sortType]);

  const formatTimestamp = (isoDate) => {
    if (!isoDate) return "Recent";
    const d = new Date(isoDate);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="rounded-3xl border border-slate-700/80 bg-slate-900/85 p-6 shadow-2xl backdrop-blur-xl">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400">
              Live Activity
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Synced
            </span>
          </div>
          <h2 className="mt-1 text-2xl font-black text-white">Recent Transactions</h2>
          <p className="text-xs text-slate-400">
            Real-time ledger updates with instant receipt audit
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/transactions"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            <FaReceipt className="text-xs text-cyan-400" />
            <span>Full Statement & PDF</span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="my-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Category Filter Tabs */}
        <div className="flex rounded-2xl bg-slate-950/80 p-1 border border-slate-800 overflow-x-auto scrollbar-none">
          {[
            { id: "all", label: "All Activity" },
            { id: "outflow", label: "Spends (Outflow)" },
            { id: "inflow", label: "Deposits (Inflow)" },
            { id: "bills", label: "Bills & Recharges" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <FaSearch className="absolute left-3.5 top-3 text-xs text-slate-500" />
            <input
              type="text"
              placeholder="Search merchant, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 py-2 pl-9 pr-3 text-xs text-white outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-white"
              >
                <FaTimes className="text-xs" />
              </button>
            )}
          </div>

          <select
            value={sortType}
            onChange={(e) => setSortType(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs font-semibold text-slate-300 outline-none focus:border-cyan-400"
          >
            <option value="latest">Latest First</option>
            <option value="high">Amount: High → Low</option>
            <option value="low">Amount: Low → High</option>
          </select>
        </div>
      </div>

      {/* Transaction List (Executive Card Rows) */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-16 w-full animate-pulse rounded-2xl bg-slate-800/60"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-semibold text-rose-300 text-center">
            {error}
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-800 py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800/80 text-xl text-slate-400">
              <FaFilter />
            </div>
            <h4 className="text-sm font-bold text-white">No transactions match your criteria</h4>
            <p className="mt-1 text-xs text-slate-500">
              Try adjusting your search query or switching active filter tabs.
            </p>
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const isOutflow = Number(tx.amount) < 0;
            const absAmount = Math.abs(Number(tx.amount));
            const visuals = getTransactionVisuals(tx.name, tx.amount);
            const Icon = visuals.icon;

            return (
              <div
                key={tx.id}
                onClick={() => setSelectedTx(tx)}
                className="group relative flex cursor-pointer items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4 transition-all duration-200 hover:border-cyan-500/40 hover:bg-slate-800/50 hover:shadow-lg hover:shadow-cyan-950/20"
              >
                {/* Left: Merchant / Category Avatar & Meta */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${visuals.gradient} text-white shadow-md transition group-hover:scale-105`}
                  >
                    <Icon className="text-base" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="truncate text-sm font-bold text-white group-hover:text-cyan-300 transition">
                        {tx.name}
                      </h4>
                      <span className="hidden sm:inline-flex rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400 border border-slate-700/60">
                        {visuals.badge}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                      <span>{formatTimestamp(tx.created_at)}</span>
                      {tx.receiver_email && (
                        <>
                          <span>•</span>
                          <span className="truncate font-mono text-slate-500">
                            {tx.receiver_email}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Status Badge */}
                <div className="flex items-center gap-4 shrink-0 text-right">
                  <div>
                    <p
                      className={`text-base font-black tracking-tight flex items-center justify-end gap-1 ${
                        isOutflow ? "text-rose-400" : "text-emerald-400"
                      }`}
                    >
                      {isOutflow ? (
                        <>
                          <FaArrowDown className="text-[10px]" /> -₹{absAmount.toLocaleString("en-IN")}
                        </>
                      ) : (
                        <>
                          <FaArrowUp className="text-[10px]" /> +₹{absAmount.toLocaleString("en-IN")}
                        </>
                      )}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Settled
                    </span>
                  </div>

                  {/* Actions & Chevron */}
                  <div className="flex items-center gap-1.5 pl-2">
                    <button
                      type="button"
                      onClick={(e) => handleDelete(tx.id, e)}
                      title="Delete record"
                      className="rounded-xl p-2 text-slate-600 hover:bg-rose-500/10 hover:text-rose-400 transition"
                    >
                      <FaTrash className="text-xs" />
                    </button>
                    <FaChevronRight className="text-xs text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* TRANSACTION DETAILS MODAL */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-cyan-950/40 text-white">
            {/* Close Button */}
            <button
              onClick={() => setSelectedTx(null)}
              className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <FaTimes />
            </button>

            {/* Header Visual */}
            <div className="text-center mb-5">
              <div
                className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${
                  getTransactionVisuals(selectedTx.name, selectedTx.amount).gradient
                } text-2xl shadow-lg`}
              >
                {(() => {
                  const VIcon = getTransactionVisuals(selectedTx.name, selectedTx.amount).icon;
                  return <VIcon />;
                })()}
              </div>

              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
                Transaction Details
              </span>
              <h3 className="text-xl font-bold text-white mt-1">{selectedTx.name}</h3>
              <p
                className={`text-2xl font-black mt-1 ${
                  Number(selectedTx.amount) < 0 ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {Number(selectedTx.amount) < 0 ? "-" : "+"}₹
                {Math.abs(Number(selectedTx.amount)).toLocaleString("en-IN")}
              </p>
            </div>

            {/* Ledger Audit Table */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-2.5 text-xs mb-5">
              <div className="flex justify-between">
                <span className="text-slate-400">Transaction ID:</span>
                <span className="font-mono text-white">#TXN-{selectedTx.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <FaShieldAlt className="text-[10px]" /> Verified & Settled
                </span>
              </div>
              {selectedTx.receiver_email && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Beneficiary / Account:</span>
                  <span className="font-mono text-white">{selectedTx.receiver_email}</span>
                </div>
              )}
              {selectedTx.stripe_session_id && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Stripe Gateway Ref:</span>
                  <span className="font-mono text-cyan-400 truncate max-w-[180px]">
                    {selectedTx.stripe_session_id}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Settled On:</span>
                <span className="text-slate-300">
                  {new Date(selectedTx.created_at).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="flex-1 rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-semibold text-white transition"
              >
                Done
              </button>
              <button
                type="button"
                onClick={(e) => handleDelete(selectedTx.id, e)}
                className="rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500 px-4 py-2.5 text-xs font-bold text-rose-300 hover:text-white transition"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}