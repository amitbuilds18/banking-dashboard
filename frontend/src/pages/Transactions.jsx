import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import API, { getAuthHeaders } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import NotificationBell from "../components/NotificationBell";
import Toast from "../components/Toast";
import {
  FaReceipt,
  FaFileExcel,
  FaFilePdf,
  FaPrint,
  FaSearch,
  FaFilter,
  FaCalendarAlt,
  FaArrowUp,
  FaArrowDown,
  FaTimes,
  FaCheckCircle,
  FaShieldAlt,
  FaWallet,
  FaEye,
  FaTrash,
  FaExchangeAlt,
} from "react-icons/fa";

const CATEGORIES = [
  "All Categories",
  "Dining & Food",
  "Groceries",
  "Shopping",
  "Utility & Bills",
  "Entertainment",
  "Travel & Fuel",
  "Investment",
  "Forex Exchange",
  "Transfer",
  "General",
];

export default function Transactions() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: "", type: "" });

  // Filters State
  const [search, setSearch] = useState("");
  const [directionFilter, setDirectionFilter] = useState("all"); // 'all', 'credit', 'debit'
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [statusFilter, setStatusFilter] = useState("All");
  const [datePreset, setDatePreset] = useState("All Time"); // 'All Time', 'Today', 'Week', 'Month', 'Custom'
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("Latest");

  // Modals
  const [inspectModal, setInspectModal] = useState(null);
  const [printStatementModal, setPrintStatementModal] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Load Transactions
  const loadTransactions = async () => {
    try {
      setLoading(true);
      const res = await API.get("/transactions", getAuthHeaders());
      if (Array.isArray(res.data)) {
        setTransactions(res.data);
      }
    } catch (err) {
      console.error("Failed to load transactions:", err);
      setToast({ message: "Failed to load transactions", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  // Delete Transaction
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this record from your statement?")) return;
    try {
      const res = await API.delete(`/transactions/${id}`, getAuthHeaders());
      if (res.data?.error) {
        setToast({ message: res.data.error, type: "error" });
        return;
      }
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      if (inspectModal?.id === id) setInspectModal(null);
      setToast({ message: "Transaction record deleted", type: "success" });
    } catch (err) {
      console.error(err);
      setToast({ message: err.response?.data?.error || "Failed to delete transaction", type: "error" });
    }
  };

  // Download PDF from backend
  const downloadPDF = async () => {
    try {
      setPdfLoading(true);
      const response = await API.get("/pdf/statement", {
        ...getAuthHeaders(),
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `NovaPay_Statement_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setToast({ message: "Official PDF Statement Downloaded", type: "success" });
    } catch (err) {
      console.error(err);
      setToast({ message: "Failed to download PDF", type: "error" });
    } finally {
      setPdfLoading(false);
    }
  };

  // Filtered & Sorted Transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        // Keyword Search
        const query = search.trim().toLowerCase();
        const searchMatch =
          !query ||
          (t.receiver_email || "").toLowerCase().includes(query) ||
          (t.name || "").toLowerCase().includes(query) ||
          (t.category || "").toLowerCase().includes(query) ||
          (t.notes || "").toLowerCase().includes(query) ||
          String(t.id).includes(query);

        // Direction / Flow
        const amountNum = Number(t.amount);
        let directionMatch = true;
        if (directionFilter === "credit") directionMatch = amountNum > 0;
        if (directionFilter === "debit") directionMatch = amountNum < 0;

        // Category Filter
        let categoryMatch = true;
        if (categoryFilter !== "All Categories") {
          const cat = (t.category || "General").toLowerCase();
          const target = categoryFilter.toLowerCase();
          categoryMatch = cat.includes(target) || target.includes(cat);
        }

        // Status Filter
        const statusMatch = statusFilter === "All" || (t.status || "success").toLowerCase() === statusFilter.toLowerCase();

        // Date Filter
        let dateMatch = true;
        const txDate = new Date(t.created_at);
        const today = new Date();

        if (datePreset === "Today") {
          dateMatch = txDate.toDateString() === today.toDateString();
        } else if (datePreset === "Week") {
          const diffDays = (today - txDate) / (1000 * 60 * 60 * 24);
          dateMatch = diffDays >= 0 && diffDays <= 7;
        } else if (datePreset === "Month") {
          dateMatch =
            txDate.getMonth() === today.getMonth() &&
            txDate.getFullYear() === today.getFullYear();
        } else if (datePreset === "Custom") {
          if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            if (txDate < start) dateMatch = false;
          }
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (txDate > end) dateMatch = false;
          }
        }

        return searchMatch && directionMatch && categoryMatch && statusMatch && dateMatch;
      })
      .sort((a, b) => {
        if (sortBy === "Latest") return new Date(b.created_at) - new Date(a.created_at);
        if (sortBy === "Oldest") return new Date(a.created_at) - new Date(b.created_at);
        if (sortBy === "High") return Math.abs(Number(b.amount)) - Math.abs(Number(a.amount));
        if (sortBy === "Low") return Math.abs(Number(a.amount)) - Math.abs(Number(b.amount));
        return 0;
      });
  }, [transactions, search, directionFilter, categoryFilter, statusFilter, datePreset, startDate, endDate, sortBy]);

  // Cash Flow Calculations
  const stats = useMemo(() => {
    let totalInflow = 0;
    let totalOutflow = 0;

    filteredTransactions.forEach((t) => {
      const amt = Number(t.amount);
      if (amt > 0) totalInflow += amt;
      else totalOutflow += Math.abs(amt);
    });

    return {
      totalInflow,
      totalOutflow,
      netFlow: totalInflow - totalOutflow,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  // CSV Export Generator with UTF-8 BOM
  const downloadCSV = () => {
    if (filteredTransactions.length === 0) {
      setToast({ message: "No transactions to export", type: "error" });
      return;
    }

    const headers = [
      "Transaction Ref",
      "Date",
      "Time",
      "Description",
      "Category",
      "Flow Type",
      "Amount (INR)",
      "Status",
      "Counterparty",
      "Notes",
    ];

    const rows = filteredTransactions.map((t) => {
      const d = new Date(t.created_at);
      const isCredit = Number(t.amount) > 0;
      return [
        `"NP-${t.id}"`,
        `"${d.toLocaleDateString("en-IN")}"`,
        `"${d.toLocaleTimeString("en-IN")}"`,
        `"${(t.name || "").replace(/"/g, '""')}"`,
        `"${(t.category || "General").replace(/"/g, '""')}"`,
        `"${isCredit ? "CREDIT" : "DEBIT"}"`,
        Math.abs(Number(t.amount)),
        `"${t.status || "success"}"`,
        `"${(t.receiver_email || "-").replace(/"/g, '""')}"`,
        `"${(t.notes || "").replace(/"/g, '""')}"`,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `NovaPay_Transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setToast({ message: "Excel / CSV statement exported successfully!", type: "success" });
  };

  const getCategoryIcon = (category) => {
    const c = (category || "").toLowerCase();
    if (c.includes("food") || c.includes("dining")) return "🍔";
    if (c.includes("groc")) return "🛒";
    if (c.includes("shop")) return "🛍️";
    if (c.includes("util") || c.includes("bill")) return "⚡";
    if (c.includes("entertain")) return "🎬";
    if (c.includes("travel") || c.includes("fuel")) return "🚗";
    if (c.includes("forex") || c.includes("exchange")) return "💱";
    if (c.includes("invest") || c.includes("deposit")) return "🏛️";
    if (c.includes("transfer")) return "💸";
    return "📦";
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-white selection:bg-cyan-500 selection:text-slate-950">
      <Toast message={toast.message} type={toast.type} />

      {/* Sidebar Navigation */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transition-transform duration-200 md:static md:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onClose={() => setMobileMenuOpen(false)} />
      </div>

      {mobileMenuOpen && (
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/80 backdrop-blur-sm md:hidden"
          aria-label="Close mobile menu"
        />
      )}

      {/* Main Canvas */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Header Banner */}
          <header className="relative overflow-hidden rounded-3xl border border-slate-700/70 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950/90 p-6 shadow-2xl backdrop-blur-xl">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="rounded-2xl border border-slate-700 bg-slate-800/80 p-2.5 text-slate-300 transition hover:bg-slate-700 hover:text-white md:hidden"
                  aria-label="Open menu"
                >
                  ☰
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-2xl text-white shadow-lg shadow-blue-500/20">
                    <FaReceipt />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400">
                        Official Audit Ledger
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                        <FaShieldAlt className="text-xs" /> Cryptographically Verified
                      </span>
                    </div>
                    <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                      Statements & Activity Records
                    </h1>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Detailed account ledgers, tax-compliant Excel/CSV exports, and official bank statements.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={downloadCSV}
                  className="flex items-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2.5 text-xs font-bold text-emerald-300 shadow-lg shadow-emerald-500/10 backdrop-blur-md transition hover:bg-emerald-500/25 active:scale-95"
                >
                  <FaFileExcel className="text-sm text-emerald-400" />
                  <span>Export Excel / CSV</span>
                </button>

                <button
                  type="button"
                  disabled={pdfLoading}
                  onClick={downloadPDF}
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition hover:brightness-110 active:scale-95 disabled:opacity-50"
                >
                  <FaFilePdf className="text-sm" />
                  <span>{pdfLoading ? "Generating..." : "Download PDF"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPrintStatementModal(true)}
                  className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-xs font-semibold text-slate-200 backdrop-blur-md transition hover:bg-slate-700 hover:text-white"
                  title="Print Statement Preview"
                >
                  <FaPrint className="text-xs" />
                  <span>Print View</span>
                </button>

                <NotificationBell />
              </div>
            </div>
          </header>

          {/* Dynamic Cash Flow Metric Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Filtered Inflow (Credits)</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <FaArrowDown />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-emerald-400">
                +₹{stats.totalInflow.toLocaleString("en-IN")}
              </p>
              <div className="mt-1 text-xs text-slate-400">Incoming deposits & transfers</div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Filtered Outflow (Debits)</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
                  <FaArrowUp />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-rose-400">
                -₹{stats.totalOutflow.toLocaleString("en-IN")}
              </p>
              <div className="mt-1 text-xs text-slate-400">Payments, shopping & bills</div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Net Cash Movement</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                  <FaExchangeAlt />
                </div>
              </div>
              <p
                className={`mt-3 text-2xl font-black ${
                  stats.netFlow >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {stats.netFlow >= 0 ? "+" : "-"}₹{Math.abs(stats.netFlow).toLocaleString("en-IN")}
              </p>
              <div className="mt-1 text-xs text-slate-400">Inflow minus Outflow in period</div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Records Filtered</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                  <FaReceipt />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-white">{stats.count}</p>
              <div className="mt-1 text-xs text-slate-400">
                Out of <span className="font-bold text-white">{transactions.length}</span> total entries
              </div>
            </div>
          </div>

          {/* Advanced Search & Multi-Criteria Filter Strip */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                <input
                  type="text"
                  placeholder="Search by description, receiver email, reference, or notes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 py-3 pl-11 pr-4 text-xs font-semibold text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              {/* Flow Direction Segment */}
              <div className="flex rounded-2xl border border-slate-700 bg-slate-950/80 p-1 shrink-0">
                {[
                  { key: "all", label: "All Flows" },
                  { key: "credit", label: "Credits (+)" },
                  { key: "debit", label: "Debits (-)" },
                ].map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setDirectionFilter(f.key)}
                    className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                      directionFilter === f.key
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Second Filter Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {/* Category Filter */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/80 p-2.5 font-semibold text-white focus:border-cyan-400 focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Preset Filter */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date Range</label>
                <select
                  value={datePreset}
                  onChange={(e) => setDatePreset(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/80 p-2.5 font-semibold text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option value="All Time">All Time</option>
                  <option value="Today">Today Only</option>
                  <option value="Week">Last 7 Days</option>
                  <option value="Month">This Month</option>
                  <option value="Custom">Custom Date Range...</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/80 p-2.5 font-semibold text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option value="All">All Statuses</option>
                  <option value="success">Success</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/80 p-2.5 font-semibold text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option value="Latest">Latest First</option>
                  <option value="Oldest">Oldest First</option>
                  <option value="High">Amount: High → Low</option>
                  <option value="Low">Amount: Low → High</option>
                </select>
              </div>
            </div>

            {/* Custom Date Pickers (if Custom selected) */}
            {datePreset === "Custom" && (
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-800 animate-fade-in text-xs">
                <span className="font-bold text-slate-400">Select Date Window:</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">From:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="rounded-xl border border-slate-700 bg-slate-950 p-2 font-mono text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">To:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="rounded-xl border border-slate-700 bg-slate-950 p-2 font-mono text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                {(startDate || endDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                    }}
                    className="text-xs text-rose-400 hover:underline"
                  >
                    Clear Dates
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Master Transaction Ledger Table */}
          <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 shadow-2xl backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-950/70 text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="p-4 font-bold">Transaction / Ref</th>
                    <th className="p-4 font-bold">Date & Time</th>
                    <th className="p-4 font-bold">Category</th>
                    <th className="p-4 font-bold">Counterparty</th>
                    <th className="p-4 font-bold">Amount</th>
                    <th className="p-4 font-bold">Status</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/80">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="p-12 text-center text-slate-400">
                        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
                        <p className="mt-3 text-xs">Loading ledger entries...</p>
                      </td>
                    </tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-12 text-center text-slate-400">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-2xl text-slate-500">
                          <FaReceipt />
                        </div>
                        <h4 className="mt-3 font-bold text-white text-sm">No matching transactions found</h4>
                        <p className="mt-1 text-xs">Try adjusting your keyword search or filter criteria.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((t) => {
                      const isCredit = Number(t.amount) > 0;
                      const dateObj = new Date(t.created_at);

                      return (
                        <tr
                          key={t.id}
                          className="hover:bg-slate-800/40 transition group cursor-pointer"
                          onClick={() => setInspectModal(t)}
                        >
                          {/* Ref & Description */}
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-lg">
                                {getCategoryIcon(t.category)}
                              </span>
                              <div>
                                <p className="font-bold text-white group-hover:text-cyan-300 transition">
                                  {t.name}
                                </p>
                                <p className="font-mono text-[10px] text-slate-400">
                                  Ref: NP-{t.id}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Date & Time */}
                          <td className="p-4 text-slate-300">
                            <p className="font-medium">
                              {dateObj.toLocaleDateString("en-IN", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              {dateObj.toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </td>

                          {/* Category Tag */}
                          <td className="p-4">
                            <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-300">
                              {t.category || "General"}
                            </span>
                          </td>

                          {/* Counterparty */}
                          <td className="p-4 text-slate-300">
                            {t.receiver_email ? (
                              <span className="font-mono text-[11px] text-cyan-300/90 truncate max-w-[150px] inline-block">
                                {t.receiver_email}
                              </span>
                            ) : (
                              <span className="text-slate-500 italic">Self Account</span>
                            )}
                          </td>

                          {/* Amount */}
                          <td className="p-4">
                            <span
                              className={`text-sm font-black ${
                                isCredit ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {isCredit ? "+" : "-"}₹{Math.abs(Number(t.amount)).toLocaleString("en-IN")}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="p-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${
                                t.status === "success"
                                  ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                  : t.status === "pending"
                                  ? "border border-amber-500/30 bg-amber-500/10 text-amber-400"
                                  : "border border-rose-500/30 bg-rose-500/10 text-rose-400"
                              }`}
                            >
                              {t.status || "success"}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setInspectModal(t)}
                                className="rounded-xl border border-slate-700 bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                                title="View Receipt"
                              >
                                <FaEye className="text-xs" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(t.id)}
                                className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2 text-rose-300 hover:bg-rose-500/20 transition"
                                title="Delete Record"
                              >
                                <FaTrash className="text-xs" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Details Inspector Modal */}
      {inspectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <button
              onClick={() => setInspectModal(null)}
              className="absolute right-5 top-5 text-slate-400 hover:text-white"
            >
              <FaTimes className="text-base" />
            </button>

            <div className="text-center border-b border-slate-800 pb-5">
              <span className="flex mx-auto h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-3xl">
                {getCategoryIcon(inspectModal.category)}
              </span>
              <p className="mt-3 text-xs uppercase tracking-widest text-slate-400">
                Transaction Receipt
              </p>
              <h3 className="mt-1 text-2xl font-black text-white">
                {Number(inspectModal.amount) > 0 ? "+" : "-"}₹
                {Math.abs(Number(inspectModal.amount)).toLocaleString("en-IN")}
              </h3>
              <p className="mt-0.5 text-xs text-cyan-400 font-semibold">{inspectModal.name}</p>
            </div>

            <div className="mt-5 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Reference ID:</span>
                <span className="font-mono font-bold text-white">NP-{inspectModal.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Date & Timestamp:</span>
                <span className="text-slate-200">
                  {new Date(inspectModal.created_at).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Category:</span>
                <span className="font-semibold text-slate-200">{inspectModal.category || "General"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Counterparty:</span>
                <span className="font-mono text-cyan-300">{inspectModal.receiver_email || "Main Balance"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Status:</span>
                <span className="font-bold uppercase text-emerald-400">{inspectModal.status || "success"}</span>
              </div>
              {inspectModal.notes && (
                <div className="py-2 border-b border-slate-800/80">
                  <span className="text-slate-400 block mb-0.5">Notes:</span>
                  <p className="text-slate-300 italic">{inspectModal.notes}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-3 text-xs font-bold text-white shadow-lg hover:brightness-110"
              >
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Bank Statement Print View Modal */}
      {printStatementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
            <button
              onClick={() => setPrintStatementModal(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-white"
            >
              <FaTimes className="text-base" />
            </button>

            {/* Official Header */}
            <div className="border-b-2 border-slate-700 pb-5">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-wider text-cyan-400">
                    NovaPay Banking Corp
                  </h2>
                  <p className="text-xs text-slate-400">Licensed Scheduled Commercial Digital Bank</p>
                  <p className="text-xs text-slate-400">IFSC / Routing: NOVA0008492</p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-bold text-white">ACCOUNT STATEMENT</p>
                  <p className="text-slate-400">Generated: {new Date().toLocaleDateString("en-IN")}</p>
                  <p className="text-emerald-400 font-bold">Status: Active & In Good Standing</p>
                </div>
              </div>

              {/* Account Holder Box */}
              <div className="mt-4 grid grid-cols-2 gap-4 rounded-2xl bg-slate-950/70 p-4 text-xs">
                <div>
                  <p className="text-slate-400 uppercase tracking-wider text-[10px]">Account Holder</p>
                  <p className="text-sm font-bold text-white mt-0.5">{user?.name || "NovaPay Member"}</p>
                  <p className="text-slate-400">{user?.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 uppercase tracking-wider text-[10px]">Ledger Period Summary</p>
                  <p className="text-xs text-emerald-400 font-bold mt-0.5">Credits: +₹{stats.totalInflow.toLocaleString("en-IN")}</p>
                  <p className="text-xs text-rose-400 font-bold">Debits: -₹{stats.totalOutflow.toLocaleString("en-IN")}</p>
                </div>
              </div>
            </div>

            {/* Table of Filtered Records */}
            <div className="mt-5 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Transaction History ({filteredTransactions.length} Entries)
              </p>
              <div className="overflow-hidden rounded-xl border border-slate-800">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-950 text-slate-400 uppercase">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredTransactions.slice(0, 30).map((t) => (
                      <tr key={t.id}>
                        <td className="p-2.5 text-slate-300 font-mono">
                          {new Date(t.created_at).toLocaleDateString("en-IN")}
                        </td>
                        <td className="p-2.5 text-white font-medium">{t.name}</td>
                        <td className="p-2.5 text-slate-400">{t.category || "General"}</td>
                        <td
                          className={`p-2.5 text-right font-bold ${
                            Number(t.amount) > 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {Number(t.amount) > 0 ? "+" : "-"}₹
                          {Math.abs(Number(t.amount)).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredTransactions.length > 30 && (
                <p className="text-[10px] text-slate-500 italic text-center">
                  Showing first 30 entries in preview. Export full CSV or PDF for entire history.
                </p>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 rounded-xl bg-cyan-500 py-3 text-xs font-bold text-slate-950 hover:bg-cyan-400"
              >
                Print Statement Sheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
