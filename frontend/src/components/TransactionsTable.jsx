import { useEffect, useMemo, useState } from "react";
import { FaTrash, FaSearch, FaArrowUp, FaArrowDown } from "react-icons/fa";
import API from "../services/api";
import { useToast } from "../context/ToastContext";

export default function TransactionsTable() {
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortType, setSortType] = useState("latest");

  const loadData = async () => {
    try {
      const res = await API.get("/transactions");

      if (Array.isArray(res.data)) {
        setTransactions(res.data);
        setError("");
      }
    } catch (err) {
      console.error(err);
      setError("Unable to load transactions right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialLoad = setTimeout(loadData, 0);

    return () => clearTimeout(initialLoad);
  }, []);

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Delete this transaction?");

    if (!confirmDelete) return;

    try {
      const res = await API.delete(`/transactions/${id}`);

      if (res.data?.error) {
        showToast(res.data.error, "error");
        return;
      }

      setTransactions((prev) => prev.filter((t) => t.id !== id));
      showToast("Transaction deleted", "success");
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || "Failed to delete transaction", "error");
    }
  };

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    filtered = filtered.filter(
      (t) =>
        (t.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (t.status || "").toLowerCase().includes(search.toLowerCase()) ||
        String(t.amount || "").includes(search)
    );

    if (statusFilter !== "all") {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

    if (sortType === "high") filtered.sort((a, b) => b.amount - a.amount);
    if (sortType === "low") filtered.sort((a, b) => a.amount - b.amount);
    if (sortType === "latest") filtered.sort((a, b) => b.id - a.id);

    return filtered;
  }, [transactions, search, statusFilter, sortType]);

  if (error && !loading) {
    return (
      <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-3xl border border-slate-700/80 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/30">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Recent Transactions</h2>
          <p className="mt-1 text-sm text-slate-400">Manage and track your payments</p>
        </div>

        <div className="text-sm text-slate-400">{filteredTransactions.length} records</div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="relative">
          <FaSearch className="absolute left-3 top-3.5 text-slate-400" />

          <input
            type="text"
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
        >
          <option value="all">All Status</option>
          <option value="success">Success</option>
          <option value="pending">Pending</option>
        </select>

        <select
          value={sortType}
          onChange={(e) => setSortType(e.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
        >
          <option value="latest">Latest</option>
          <option value="high">Highest Amount</option>
          <option value="low">Lowest Amount</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-700 text-left text-sm uppercase tracking-[0.2em] text-slate-400">
              <th className="pb-4">Name</th>
              <th className="pb-4">Amount</th>
              <th className="pb-4">Status</th>
              <th className="pb-4 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4" className="py-10 text-center text-slate-400">
                  Loading transactions...
                </td>
              </tr>
            ) : filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan="4" className="py-10 text-center text-slate-400">
                  No transactions found
                </td>
              </tr>
            ) : (
              filteredTransactions.map((t) => {
                const isExpense = Number(t.amount) < 0;
                const absAmount = Math.abs(Number(t.amount));
                const isHighValue = absAmount >= 10000;

                const getIcon = (name) => {
                  const n = (name || "").toLowerCase();
                  if (n.includes("recharge")) return "💳";
                  if (n.includes("sent") || n.includes("send")) return "💸";
                  if (n.includes("received")) return "📥";
                  if (n.includes("vault") || n.includes("spare")) return "🏺";
                  return "💼";
                };

                return (
                  <tr key={t.id} className="border-b border-slate-700/80 transition hover:bg-slate-800/60">
                    <td className="py-5 font-medium text-white">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-base">
                          {getIcon(t.name)}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span>{t.name}</span>
                            {isHighValue ? (
                              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                                ⚠️ High Value
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-700/60 px-2 py-0.5 text-[10px] text-slate-300">
                                🛡️ Verified
                              </span>
                            )}
                          </div>
                          {t.receiver_email && (
                            <p className="text-xs text-slate-400">{t.receiver_email}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className={`py-5 font-bold ${isExpense ? "text-red-400" : "text-emerald-400"}`}>
                      <div className="flex items-center gap-1.5">
                        {isExpense ? <FaArrowDown className="text-xs" /> : <FaArrowUp className="text-xs" />}
                        ₹{absAmount.toLocaleString("en-IN")}
                      </div>
                    </td>

                    <td>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${t.status === "success" ? "bg-emerald-500/20 text-emerald-300" : "bg-yellow-500/20 text-yellow-300"}`}>
                        {t.status}
                      </span>
                    </td>

                  <td className="text-center">
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="group rounded-xl border border-red-500/30 bg-red-500/10 p-3 transition hover:bg-red-500"
                    >
                      <FaTrash className="text-red-400 group-hover:text-white" />
                    </button>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}