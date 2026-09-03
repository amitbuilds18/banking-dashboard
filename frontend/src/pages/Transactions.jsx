import { useEffect, useState } from "react";
import Toast from "../components/Toast";
import API, { getAuthHeaders } from "../services/api";

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [toast, setToast] = useState({ message: "", type: "" });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Latest");

  const loadTransactions = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setToast({ message: "Session expired. Please login again.", type: "error" });
        return;
      }

      const res = await API.get("/transactions", getAuthHeaders());

      if (Array.isArray(res.data)) {
        setTransactions(res.data);
      }
    } catch (err) {
      console.error(err);
      setToast({ message: "Failed to load transactions", type: "error" });
    }
  };

  useEffect(() => {
    const initialLoad = setTimeout(loadTransactions, 0);

    return () => clearTimeout(initialLoad);
  }, []);

  const handleDelete = async (id) => {
    try {
      const res = await API.delete(`/transactions/${id}`, getAuthHeaders());

      if (res.data?.error) {
        setToast({ message: res.data.error, type: "error" });
        return;
      }

      setTransactions((prev) => prev.filter((t) => t.id !== id));
      setToast({ message: "Transaction deleted", type: "success" });
    } catch (err) {
      console.error(err);
      setToast({ message: err.response?.data?.error || "Failed to delete transaction", type: "error" });
    }
  };

  const downloadPDF = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setToast({ message: "Session expired. Please login again.", type: "error" });
        return;
      }

      const response = await API.get("/pdf/statement", {
        ...getAuthHeaders(),
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");

      a.href = url;
      a.download = "BankStatement.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setToast({ message: "Failed to download PDF", type: "error" });
    }
  };

  const filteredTransactions = [...transactions]
    .filter((t) => {
      const searchMatch = (t.receiver_email || "").toLowerCase().includes(search.toLowerCase());
      const statusMatch = statusFilter === "All" || t.status === statusFilter;
      const typeMatch = typeFilter === "All" || t.name === typeFilter;

      let dateMatch = true;
      const transactionDate = new Date(t.created_at);
      const today = new Date();

      if (dateFilter === "Today") {
        dateMatch = transactionDate.toDateString() === today.toDateString();
      }

      if (dateFilter === "Week") {
        const diff = (today - transactionDate) / (1000 * 60 * 60 * 24);
        dateMatch = diff >= 0 && diff <= 7;
      }

      if (dateFilter === "Month") {
        dateMatch =
          transactionDate.getMonth() === today.getMonth() &&
          transactionDate.getFullYear() === today.getFullYear();
      }

      return searchMatch && statusMatch && typeMatch && dateMatch;
    })
    .sort((a, b) => {
      if (sortBy === "Latest") return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === "Oldest") return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === "High") return Number(b.amount) - Number(a.amount);
      if (sortBy === "Low") return Number(a.amount) - Number(b.amount);
      return 0;
    });

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white md:p-8">
      <Toast message={toast.message} type={toast.type} />

      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-700/80 bg-slate-900/80 p-5 shadow-2xl shadow-blue-950/20 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-blue-400">Activity</p>
            <h1 className="mt-2 text-3xl font-bold text-white">Transactions</h1>
          </div>

          <button
            onClick={downloadPDF}
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 px-5 py-3 font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:brightness-110"
          >
            📄 Download Statement
          </button>
        </div>

        <div className="mb-6 rounded-3xl border border-slate-700/80 bg-slate-900/70 p-5 shadow-lg shadow-slate-950/30">
          <div className="grid gap-4 md:grid-cols-5">
            <input
              type="text"
              placeholder="🔍 Search email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="All">All Status</option>
              <option value="success">Success</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="All">All Types</option>
              <option value="Transfer Sent">Transfer Sent</option>
              <option value="Money Received">Money Received</option>
            </select>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="All">All Dates</option>
              <option value="Today">Today</option>
              <option value="Week">This Week</option>
              <option value="Month">This Month</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="Latest">Latest First</option>
              <option value="Oldest">Oldest First</option>
              <option value="High">Amount High → Low</option>
              <option value="Low">Amount Low → High</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-900/80 shadow-2xl shadow-slate-950/30">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-800/80">
                <tr>
                  <th className="px-5 py-4 text-sm font-semibold uppercase tracking-wider text-slate-300">Date</th>
                  <th className="px-5 py-4 text-sm font-semibold uppercase tracking-wider text-slate-300">Type</th>
                  <th className="px-5 py-4 text-sm font-semibold uppercase tracking-wider text-slate-300">Receiver</th>
                  <th className="px-5 py-4 text-sm font-semibold uppercase tracking-wider text-slate-300">Amount</th>
                  <th className="px-5 py-4 text-sm font-semibold uppercase tracking-wider text-slate-300">Status</th>
                  <th className="px-5 py-4 text-sm font-semibold uppercase tracking-wider text-slate-300">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((t) => (
                    <tr key={t.id} className="border-t border-slate-700/80 transition hover:bg-slate-800/60">
                      <td className="px-5 py-4 text-slate-300">{new Date(t.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-4 text-slate-200">{t.name}</td>
                      <td className="px-5 py-4 text-slate-300">{t.receiver_email || "-"}</td>
                      <td className={`px-5 py-4 font-bold ${Number(t.amount) < 0 ? "text-red-400" : "text-emerald-400"}`}>
                        ₹{Number(t.amount).toLocaleString("en-IN")}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                            t.status === "success"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : t.status === "pending"
                              ? "bg-yellow-500/20 text-yellow-300"
                              : "bg-red-500/20 text-red-300"
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="rounded-lg bg-red-500/90 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-500"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-5 py-12 text-center text-slate-400">
                      No transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

