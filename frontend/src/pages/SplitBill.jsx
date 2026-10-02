import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUsers,
  FaPlus,
  FaReceipt,
  FaCheckCircle,
  FaBell,
  FaTrash,
  FaArrowLeft,
  FaTimes,
  FaUtensils,
  FaPlane,
  FaHome,
  FaGlassCheers,
  FaShoppingBag,
  FaMoneyBillWave,
  FaChevronRight,
} from "react-icons/fa";
import API from "../services/api";
import { useToast } from "../context/ToastContext";

const CATEGORIES = [
  { id: "Dining", label: "Dinner / Cafe", icon: FaUtensils, color: "from-amber-500 to-orange-600" },
  { id: "Trip", label: "Trip / Vacation", icon: FaPlane, color: "from-blue-500 to-cyan-600" },
  { id: "Rent", label: "Shared Rent", icon: FaHome, color: "from-indigo-500 to-purple-600" },
  { id: "Party", label: "Party / Weekend", icon: FaGlassCheers, color: "from-pink-500 to-rose-600" },
  { id: "Groceries", label: "Shared Groceries", icon: FaShoppingBag, color: "from-emerald-500 to-teal-600" },
];

export default function SplitBill() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [createdBills, setCreatedBills] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [summary, setSummary] = useState({ totalOwedToYou: 0, totalYouOwe: 0, activeBillsCount: 0 });
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settlingId, setSettlingId] = useState(null);

  // Create Bill Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [category, setCategory] = useState("Dining");
  const [participants, setParticipants] = useState([
    { name: "", email: "", share_amount: "" },
  ]);

  const fetchSplitBills = async () => {
    try {
      setLoading(true);
      const res = await API.get("/split-bills");
      setCreatedBills(res.data.createdBills || []);
      setIncomingRequests(res.data.incomingRequests || []);
      setSummary(res.data.summary || { totalOwedToYou: 0, totalYouOwe: 0, activeBillsCount: 0 });
    } catch (err) {
      console.warn("Split bills fetch error:", err);
      showToast("Failed to load split bills", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSplitBills();
    // Load beneficiaries for quick-select
    API.get("/beneficiaries")
      .then((res) => setBeneficiaries(res.data || []))
      .catch(() => {});
  }, []);

  const handleAddParticipant = () => {
    setParticipants([...participants, { name: "", email: "", share_amount: "" }]);
  };

  const handleRemoveParticipant = (index) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const handleParticipantChange = (index, field, value) => {
    const updated = [...participants];
    updated[index][field] = value;
    setParticipants(updated);
  };

  const handlePickBeneficiary = (index, b) => {
    const updated = [...participants];
    updated[index].name = b.name;
    updated[index].email = b.email;
    setParticipants(updated);
  };

  const handleSplitEqually = () => {
    const numTotal = Number(totalAmount);
    if (!numTotal || numTotal <= 0 || participants.length === 0) {
      showToast("Enter a total amount and participants first", "error");
      return;
    }
    // Creator is included in equal split count (total participants + 1 creator)
    const count = participants.length + 1;
    const equalShare = Math.round(numTotal / count);

    const updated = participants.map((p) => ({
      ...p,
      share_amount: equalShare.toString(),
    }));
    setParticipants(updated);
    showToast(`Divided ₹${numTotal} into ₹${equalShare} per person`, "info");
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const numTotal = Number(totalAmount);
    if (!title.trim() || !numTotal || numTotal <= 0) {
      showToast("Please provide a title and valid total amount", "error");
      return;
    }

    const validParticipants = participants.filter(
      (p) => p.email.trim() && Number(p.share_amount) > 0
    );

    if (validParticipants.length === 0) {
      showToast("Please add at least one participant with email and share amount", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await API.post("/split-bills", {
        title: title.trim(),
        total_amount: numTotal,
        category,
        participants: validParticipants,
      });

      showToast(res.data?.message || "Split bill created!", "success");
      setShowCreateModal(false);
      setTitle("");
      setTotalAmount("");
      setCategory("Dining");
      setParticipants([{ name: "", email: "", share_amount: "" }]);
      fetchSplitBills();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || "Failed to create split bill";
      showToast(errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSettleRequest = async (participantId, shareAmount, billTitle) => {
    if (
      !window.confirm(
        `Pay your ₹${Number(shareAmount).toLocaleString(
          "en-IN"
        )} share for "${billTitle}" from your NovaPay balance?`
      )
    ) {
      return;
    }

    setSettlingId(participantId);
    try {
      const res = await API.post(`/split-bills/settle/${participantId}`);
      showToast(res.data?.message || "Share settled successfully! 💸", "success");
      fetchSplitBills();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || "Failed to settle share";
      showToast(errMsg, "error");
    } finally {
      setSettlingId(null);
    }
  };

  const handleNudge = async (participantId) => {
    try {
      const res = await API.post(`/split-bills/nudge/${participantId}`);
      showToast(res.data?.message || "Reminder sent!", "info");
    } catch (err) {
      console.error(err);
      showToast("Failed to send reminder", "error");
    }
  };

  const handleDeleteBill = async (billId, billTitle) => {
    if (!window.confirm(`Delete split bill "${billTitle}"?`)) return;
    try {
      await API.delete(`/split-bills/${billId}`);
      showToast(`Bill "${billTitle}" deleted`, "info");
      fetchSplitBills();
    } catch (err) {
      console.error(err);
      showToast("Failed to delete bill", "error");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-cyan-500 selection:text-slate-950 p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              onClick={() => navigate("/dashboard")}
              className="mb-2 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              <FaArrowLeft className="text-[10px]" /> Back to Dashboard
            </button>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-xl font-bold text-white shadow-lg shadow-emerald-500/20">
                <FaUsers />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white sm:text-3xl">
                  Split Bill & Group Expenses
                </h1>
                <p className="text-xs text-slate-400">
                  Split restaurant dining, trips, and flat rent with instant settlement
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:brightness-110 active:scale-95"
          >
            <FaPlus /> Create Split Bill
          </button>
        </div>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
              Owed To You
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-400">
                ₹{summary.totalOwedToYou.toLocaleString("en-IN")}
              </span>
              <span className="text-xs text-slate-400">Pending from friends</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Unsettled shares from your created bills</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400">
              You Owe Others
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-rose-400">
                ₹{summary.totalYouOwe.toLocaleString("en-IN")}
              </span>
              <span className="text-xs text-slate-400">Awaiting your payment</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Requests sent by friends to you</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">
              Active Group Bills
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{summary.activeBillsCount}</span>
              <span className="text-xs text-slate-400">Open ledgers</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Auto-settles when all friends pay</p>
          </div>
        </div>

        {/* INCOMING REQUESTS: BILLS YOU OWE */}
        {incomingRequests.filter((r) => r.status === "pending").length > 0 && (
          <div className="rounded-3xl border border-rose-500/30 bg-rose-950/20 p-5 backdrop-blur-xl">
            <h3 className="text-sm font-bold text-rose-300 mb-3 flex items-center gap-2">
              <FaMoneyBillWave /> Pending Requests: Pay Your Share
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {incomingRequests
                .filter((r) => r.status === "pending")
                .map((req) => (
                  <div
                    key={req.participant_id}
                    className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/90 p-4"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white">{req.bill_title}</h4>
                      <p className="text-[11px] text-slate-400">
                        Requested by: <strong className="text-slate-200">{req.creator_name}</strong> ({req.creator_email})
                      </p>
                      <span className="text-xs font-black text-rose-400 font-mono mt-1 block">
                        ₹{Number(req.share_amount).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={settlingId === req.participant_id}
                      onClick={() =>
                        handleSettleRequest(req.participant_id, req.share_amount, req.bill_title)
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/20 hover:brightness-110 active:scale-95 disabled:opacity-50 transition"
                    >
                      {settlingId === req.participant_id ? "Settling..." : "⚡ Settle Now"}
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* CREATED BILLS SECTION */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Your Created Split Bills</h3>
            <span className="text-xs text-slate-500">{createdBills.length} Total</span>
          </div>

          {loading ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/40">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            </div>
          ) : createdBills.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/20 p-8 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800/80 text-xl text-slate-500">
                <FaReceipt />
              </div>
              <h3 className="text-base font-bold text-white">No Split Bills Yet</h3>
              <p className="mt-1 max-w-sm text-xs text-slate-400">
                Paid for a group dinner, trip, or room rent? Create a split bill to automatically track and collect shares from friends.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition"
              >
                <FaPlus /> Create First Bill
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {createdBills.map((bill) => {
                const totalAmt = Number(bill.total_amount);
                const settledAmt = bill.participants
                  .filter((p) => p.status === "settled")
                  .reduce((sum, p) => sum + Number(p.share_amount), 0);
                const percentCollected = totalAmt > 0 ? Math.round((settledAmt / totalAmt) * 100) : 0;
                const isFullySettled = bill.status === "settled" || percentCollected >= 100;

                return (
                  <div
                    key={bill.id}
                    className="flex flex-col justify-between rounded-3xl border border-slate-800 bg-slate-900/70 p-5 backdrop-blur-xl transition hover:border-slate-700"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">{bill.title}</h4>
                            <span className="rounded-md bg-slate-800 border border-slate-700/60 px-2 py-0.5 text-[9px] font-bold text-cyan-300">
                              {bill.category}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Created on {new Date(bill.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                              isFullySettled
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                : "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                            }`}
                          >
                            {isFullySettled ? "Settled" : "Open"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteBill(bill.id, bill.title)}
                            className="text-slate-600 hover:text-rose-400 p-1 rounded-lg transition"
                            title="Delete Bill"
                          >
                            <FaTrash className="text-xs" />
                          </button>
                        </div>
                      </div>

                      {/* Total & Collection Bar */}
                      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
                        <div className="flex justify-between items-baseline text-xs">
                          <span className="text-slate-400">Total Bill Amount:</span>
                          <span className="text-base font-black text-white font-mono">
                            ₹{totalAmt.toLocaleString("en-IN")}
                          </span>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                            <span>Collected: ₹{settledAmt.toLocaleString("en-IN")}</span>
                            <span>{percentCollected}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                              style={{ width: `${percentCollected}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Participants Shares List */}
                      <div className="mt-4 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Friends Shares ({bill.participants.length})
                        </span>
                        <div className="space-y-1.5">
                          {bill.participants.map((p) => {
                            const isPaid = p.status === "settled";
                            return (
                              <div
                                key={p.id}
                                className="flex items-center justify-between rounded-xl bg-slate-950/40 border border-slate-800/80 px-3 py-2 text-xs"
                              >
                                <div className="min-w-0 pr-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-white truncate">{p.name}</span>
                                    {isPaid && (
                                      <FaCheckCircle className="text-emerald-400 text-[10px] shrink-0" />
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-500 truncate block font-mono">
                                    {p.email}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2.5 shrink-0">
                                  <span className="font-mono font-bold text-white">
                                    ₹{Number(p.share_amount).toLocaleString("en-IN")}
                                  </span>
                                  {isPaid ? (
                                    <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                                      Paid
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleNudge(p.id)}
                                      className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition"
                                      title="Send reminder notification"
                                    >
                                      <FaBell className="text-[9px] text-amber-400" /> Nudge
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* CREATE SPLIT BILL MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-white transition"
            >
              <FaTimes />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 text-lg">
                <FaReceipt />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Create New Split Bill</h3>
                <p className="text-xs text-slate-400">Split a group expense & request payment from friends</p>
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Bill Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Dinner at Mainland China, Goa Airbnb"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white outline-none focus:border-emerald-400 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Total Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    placeholder="e.g. 2400"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white outline-none focus:border-emerald-400 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400 transition"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Participants */}
              <div className="border-t border-slate-800 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-200">
                    Friends Who Owe You ({participants.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleSplitEqually}
                    className="text-[11px] font-semibold text-emerald-400 hover:underline"
                  >
                    ⚡ Split Equally
                  </button>
                </div>

                <div className="space-y-3">
                  {participants.map((p, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 space-y-2 relative"
                    >
                      {participants.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveParticipant(idx)}
                          className="absolute right-3 top-3 text-slate-500 hover:text-rose-400 text-xs"
                        >
                          <FaTimes />
                        </button>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={p.name}
                          onChange={(e) => handleParticipantChange(idx, "name", e.target.value)}
                          placeholder="Friend Name"
                          className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-400"
                        />
                        <input
                          type="number"
                          value={p.share_amount}
                          onChange={(e) => handleParticipantChange(idx, "share_amount", e.target.value)}
                          placeholder="Share (₹)"
                          className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-400 font-mono font-bold"
                        />
                      </div>

                      <input
                        type="email"
                        required
                        value={p.email}
                        onChange={(e) => handleParticipantChange(idx, "email", e.target.value)}
                        placeholder="Friend Email (e.g. rahul@gmail.com)"
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-400 font-mono"
                      />

                      {/* Beneficiaries Quick Pick */}
                      {beneficiaries.length > 0 && !p.email && (
                        <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
                          <span className="text-[10px] text-slate-500 shrink-0">Quick Pick:</span>
                          {beneficiaries.slice(0, 4).map((b) => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => handlePickBeneficiary(idx, b)}
                              className="rounded-lg bg-slate-800 px-2 py-0.5 text-[10px] text-cyan-300 hover:bg-slate-700 transition shrink-0"
                            >
                              {b.nickname || b.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddParticipant}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
                >
                  <FaPlus className="text-[10px]" /> Add Another Friend
                </button>
              </div>

              <div className="pt-2 flex gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:brightness-110 disabled:opacity-50"
                >
                  {submitting ? "Creating Bill..." : "Create & Send Requests"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
