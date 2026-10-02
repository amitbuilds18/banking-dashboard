import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import NotificationBell from "../components/NotificationBell";
import {
  FaCreditCard,
  FaPlus,
  FaCheckCircle,
  FaExclamationTriangle,
  FaShieldAlt,
  FaGift,
  FaHistory,
  FaCalendarAlt,
  FaCoins,
  FaTrashAlt,
  FaTimes,
  FaArrowRight,
  FaLock,
  FaMoneyBillWave,
  FaBuilding,
  FaWifi,
  FaMicrochip,
  FaAward,
} from "react-icons/fa";

export default function CreditCards() {
  const { user } = useAuth();
  const [cards, setCards] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);

  // Modals & Active Action States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [activeCard, setActiveCard] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payType, setPayType] = useState("total"); // "total" | "min" | "custom"
  const [mpin, setMpin] = useState("");
  const [paying, setPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTab, setActiveTab] = useState("cards"); // "cards" | "history"

  // Form State for Add Card
  const [form, setForm] = useState({
    bank_name: "HDFC Bank",
    card_network: "Visa",
    card_variant: "Regalia Gold",
    card_last4: "",
    holder_name: user?.name || "VALUED CARDHOLDER",
    credit_limit: "250000",
    current_outstanding: "15000",
    due_date: new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0],
    card_theme: "sapphire",
  });

  const cardThemes = {
    sapphire: {
      bg: "from-blue-900 via-indigo-950 to-slate-950",
      border: "border-blue-500/40",
      accent: "text-blue-400",
      chip: "from-amber-300 to-amber-500",
    },
    ruby: {
      bg: "from-rose-950 via-red-950 to-slate-950",
      border: "border-rose-500/40",
      accent: "text-rose-400",
      chip: "from-amber-300 to-amber-500",
    },
    emerald: {
      bg: "from-emerald-950 via-teal-950 to-slate-950",
      border: "border-emerald-500/40",
      accent: "text-emerald-400",
      chip: "from-amber-300 to-amber-500",
    },
    obsidian: {
      bg: "from-slate-900 via-zinc-950 to-black",
      border: "border-slate-700/60",
      accent: "text-slate-300",
      chip: "from-slate-300 to-slate-400",
    },
    gold: {
      bg: "from-amber-950 via-yellow-950 to-slate-950",
      border: "border-amber-500/50",
      accent: "text-amber-400",
      chip: "from-yellow-200 to-amber-400",
    },
  };

  const fetchCardsData = async () => {
    try {
      setLoading(true);
      const [cardsRes, histRes, profRes] = await Promise.all([
        API.get("/credit-cards"),
        API.get("/credit-cards/history"),
        API.get("/auth/profile"),
      ]);

      setCards(cardsRes.data);
      setHistory(histRes.data);
      setWalletBalance(Number(profRes.data.balance) || 0);
    } catch (err) {
      console.error("Failed to load credit cards:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCardsData();
  }, []);

  const openPayDialog = (card, type = "total") => {
    setActiveCard(card);
    setPayType(type);
    if (type === "total") {
      setPayAmount(String(card.current_outstanding));
    } else if (type === "min") {
      setPayAmount(String(card.min_due));
    } else {
      setPayAmount("");
    }
    setMpin("");
    setErrorMsg("");
    setPaymentSuccess(null);
    setShowPayModal(true);
  };

  const handlePayBill = async (e) => {
    e.preventDefault();
    const amt = Number(payAmount);
    if (!amt || amt <= 0) {
      setErrorMsg("Please enter a valid payment amount");
      return;
    }
    if (amt > walletBalance) {
      setErrorMsg(`Insufficient wallet balance (₹${walletBalance.toLocaleString("en-IN")})`);
      return;
    }

    try {
      setPaying(true);
      setErrorMsg("");

      const res = await API.post(`/credit-cards/${activeCard.id}/pay`, {
        amount: amt,
      });

      setPaymentSuccess(res.data);
      setWalletBalance(res.data.newBalance);
      // Refresh cards list in background
      const updatedCards = await API.get("/credit-cards");
      setCards(updatedCards.data);
      const updatedHist = await API.get("/credit-cards/history");
      setHistory(updatedHist.data);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || "Payment failed. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  const handleAddCard = async (e) => {
    e.preventDefault();
    if (!form.card_last4 || form.card_last4.length !== 4) {
      setErrorMsg("Last 4 digits must be exactly 4 digits");
      return;
    }

    try {
      setPaying(true);
      setErrorMsg("");
      await API.post("/credit-cards", form);
      setShowAddModal(false);
      setForm({
        bank_name: "HDFC Bank",
        card_network: "Visa",
        card_variant: "Regalia Gold",
        card_last4: "",
        holder_name: user?.name || "VALUED CARDHOLDER",
        credit_limit: "250000",
        current_outstanding: "15000",
        due_date: new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0],
        card_theme: "sapphire",
      });
      await fetchCardsData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || "Failed to add card");
    } finally {
      setPaying(false);
    }
  };

  const handleDeleteCard = async (id) => {
    if (!window.confirm("Are you sure you want to unlink this card?")) return;
    try {
      await API.delete(`/credit-cards/${id}`);
      setCards((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert("Failed to remove card");
    }
  };

  const totalOutstanding = cards.reduce((acc, c) => acc + Number(c.current_outstanding || 0), 0);
  const totalLimit = cards.reduce((acc, c) => acc + Number(c.credit_limit || 0), 0);
  const availableCredit = Math.max(0, totalLimit - totalOutstanding);

  const getDaysRemaining = (dueDateStr) => {
    const due = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-slate-900/60 backdrop-blur-xl border-b border-slate-800/80">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-medium transition"
            >
              ← Back to HQ
            </Link>
            <div className="h-4 w-px bg-slate-800 hidden sm:block" />
            <span className="text-xs font-semibold text-slate-300 hidden sm:inline">
              External Credit Cards &amp; Bill Pay
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
              <span className="text-slate-400">Wallet:</span>
              <span className="font-bold text-cyan-400">₹{walletBalance.toLocaleString("en-IN")}</span>
            </div>
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-8">
          {/* Header & Quick Action */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-2xl shadow-lg shadow-cyan-500/20 text-white">
                  <FaCreditCard className="text-2xl" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                    External Credit Cards
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      1% Cashback on Pay
                    </span>
                  </h1>
                  <p className="text-sm text-slate-400 mt-0.5">
                    Link external bank cards (HDFC, ICICI, SBI, Axis, Amex), track statement dues, and earn instant rewards.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
              >
                <FaPlus className="text-sm" /> Add New Card
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden backdrop-blur-xl">
              <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
                Total Outstanding Due
              </div>
              <div className="text-2xl font-black text-rose-400">
                ₹{totalOutstanding.toLocaleString("en-IN")}
              </div>
              <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                <FaExclamationTriangle className="text-amber-400" />
                Across {cards.length} linked credit card(s)
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden backdrop-blur-xl">
              <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
                Available Credit Limit
              </div>
              <div className="text-2xl font-black text-emerald-400">
                ₹{availableCredit.toLocaleString("en-IN")}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                Total Limit: ₹{totalLimit.toLocaleString("en-IN")}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden backdrop-blur-xl">
              <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
                Available Neo Balance
              </div>
              <div className="text-2xl font-black text-cyan-400">
                ₹{walletBalance.toLocaleString("en-IN")}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                <Link to="/payment" className="text-cyan-400 hover:underline">
                  + Add funds via Stripe
                </Link>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden backdrop-blur-xl">
              <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
                Instant Cashback Earned
              </div>
              <div className="text-2xl font-black text-amber-400 flex items-center gap-1.5">
                <FaCoins className="text-xl" /> ₹
                {history.reduce((acc, h) => acc + Number(h.cashback_earned || 0), 0).toLocaleString("en-IN")}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                Credited directly to wallet on every bill
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab("cards")}
              className={`flex items-center gap-2 px-4 py-2 font-medium text-sm rounded-xl transition ${
                activeTab === "cards"
                  ? "bg-slate-800 text-cyan-400 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FaCreditCard /> My Cards ({cards.length})
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 px-4 py-2 font-medium text-sm rounded-xl transition ${
                activeTab === "history"
                  ? "bg-slate-800 text-cyan-400 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FaHistory /> Payment History ({history.length})
            </button>
          </div>

          {/* TAB 1: CARDS VIEW */}
          {activeTab === "cards" && (
            <div className="space-y-6">
              {loading ? (
                <div className="text-center py-16 text-slate-500">Loading your credit cards...</div>
              ) : cards.length === 0 ? (
                <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 p-8">
                  <FaCreditCard className="text-5xl text-slate-700 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-white mb-1">No Credit Cards Linked Yet</h3>
                  <p className="text-sm text-slate-400 max-w-md mx-auto mb-5">
                    Link your external credit cards to manage due dates, pay with wallet balance, and win 1% cashback on every payment.
                  </p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-5 py-2.5 rounded-xl bg-cyan-500 text-white font-medium hover:bg-cyan-400"
                  >
                    Add Your First Card
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {cards.map((card) => {
                    const theme = cardThemes[card.card_theme] || cardThemes.sapphire;
                    const daysRemaining = getDaysRemaining(card.due_date);
                    const isDueSoon = daysRemaining <= 5 && Number(card.current_outstanding) > 0;
                    const isFullyPaid = Number(card.current_outstanding) === 0;

                    return (
                      <div
                        key={card.id}
                        className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between shadow-xl hover:border-slate-700 transition relative overflow-hidden group"
                      >
                        {/* 3D Visual Card Surface */}
                        <div
                          className={`rounded-2xl bg-gradient-to-br ${theme.bg} border ${theme.border} p-5 shadow-2xl relative overflow-hidden transition-transform duration-300 group-hover:scale-[1.01]`}
                        >
                          {/* Card Header */}
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold flex items-center gap-1.5">
                                <FaBuilding className="text-xs" /> {card.bank_name}
                              </div>
                              <div className="text-sm font-bold text-white mt-0.5">
                                {card.card_variant}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold px-2 py-0.5 rounded bg-white/10 text-white border border-white/15">
                                {card.card_network}
                              </span>
                            </div>
                          </div>

                          {/* Chip & Contactless */}
                          <div className="my-6 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-11 h-8 rounded-md bg-gradient-to-tr ${theme.chip} shadow-inner border border-amber-300/40 flex items-center justify-center`}
                              >
                                <FaMicrochip className="text-amber-900/70 text-lg" />
                              </div>
                              <FaWifi className="text-slate-400 rotate-90 text-sm" />
                            </div>

                            {/* Status Pill */}
                            {isFullyPaid ? (
                              <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                <FaCheckCircle /> All Dues Paid
                              </span>
                            ) : isDueSoon ? (
                              <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                                <FaExclamationTriangle /> Due in {daysRemaining} days
                              </span>
                            ) : (
                              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
                                Due in {daysRemaining} days
                              </span>
                            )}
                          </div>

                          {/* Card Number & Holder */}
                          <div className="flex items-end justify-between">
                            <div>
                              <div className="text-xs text-slate-400">Card Number</div>
                              <div className="text-lg font-mono tracking-widest text-slate-200">
                                •••• •••• •••• {card.card_last4}
                              </div>
                              <div className="text-xs uppercase font-medium text-slate-300 mt-1">
                                {card.holder_name}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] uppercase text-slate-400">Due Date</div>
                              <div className="text-xs font-bold text-amber-300">
                                {new Date(card.due_date).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Bill Breakdown Details */}
                        <div className="mt-5 space-y-4">
                          <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80">
                            <div>
                              <div className="text-xs text-slate-400">Total Outstanding</div>
                              <div className="text-lg font-black text-white mt-0.5">
                                ₹{Number(card.current_outstanding).toLocaleString("en-IN")}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-slate-400">Minimum Due</div>
                              <div className="text-base font-bold text-amber-400 mt-0.5">
                                ₹{Number(card.min_due).toLocaleString("en-IN")}
                              </div>
                            </div>
                          </div>

                          {/* Limit Progress */}
                          <div>
                            <div className="flex justify-between text-xs text-slate-400 mb-1">
                              <span>Limit Utilized</span>
                              <span>
                                {Math.round(
                                  (Number(card.current_outstanding) / Number(card.credit_limit)) * 100
                                )}
                                % of ₹{Number(card.credit_limit).toLocaleString("en-IN")}
                              </span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full ${
                                  (Number(card.current_outstanding) / Number(card.credit_limit)) > 0.7
                                    ? "bg-rose-500"
                                    : "bg-cyan-500"
                                }`}
                                style={{
                                  width: `${Math.min(
                                    100,
                                    (Number(card.current_outstanding) / Number(card.credit_limit)) * 100
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>

                          {/* Pay Action Buttons */}
                          <div className="flex items-center gap-2 pt-1">
                            {!isFullyPaid ? (
                              <>
                                <button
                                  onClick={() => openPayDialog(card, "total")}
                                  className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 transition flex items-center justify-center gap-1.5"
                                >
                                  <FaMoneyBillWave /> Pay Total (₹{Number(card.current_outstanding).toLocaleString("en-IN")})
                                </button>
                                <button
                                  onClick={() => openPayDialog(card, "custom")}
                                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
                                >
                                  Custom
                                </button>
                              </>
                            ) : (
                              <button
                                disabled
                                className="w-full py-2.5 rounded-xl bg-slate-800/80 text-emerald-400 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-default"
                              >
                                <FaCheckCircle /> Bill Paid in Full
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteCard(card.id)}
                              title="Unlink Card"
                              className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 transition"
                            >
                              <FaTrashAlt className="text-xs" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: HISTORY VIEW */}
          {activeTab === "history" && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Credit Card Payment Log</h3>
                  <p className="text-xs text-slate-400">All past settlements processed through Neo Banking balance</p>
                </div>
              </div>

              {history.length === 0 ? (
                <div className="text-center py-16 text-slate-500">No payment history found yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-950/60 text-xs uppercase text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-3.5 px-6">Date & Ref</th>
                        <th className="py-3.5 px-6">Card Account</th>
                        <th className="py-3.5 px-6">Amount Paid</th>
                        <th className="py-3.5 px-6">Method</th>
                        <th className="py-3.5 px-6">Cashback Won</th>
                        <th className="py-3.5 px-6">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {history.map((h) => (
                        <tr key={h.id} className="hover:bg-slate-800/30 transition">
                          <td className="py-4 px-6">
                            <div className="font-semibold text-white">
                              {new Date(h.created_at).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </div>
                            <div className="text-xs font-mono text-slate-500">{h.transaction_ref}</div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-bold text-slate-200">{h.bank_name}</div>
                            <div className="text-xs text-slate-400">
                              {h.card_variant} •••• {h.card_last4}
                            </div>
                          </td>
                          <td className="py-4 px-6 font-black text-white">
                            ₹{Number(h.amount).toLocaleString("en-IN")}
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-400">
                            {h.payment_method}
                          </td>
                          <td className="py-4 px-6">
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              <FaCoins className="text-[10px]" /> +₹{h.cashback_earned}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                              <FaCheckCircle className="text-[10px]" /> Success
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* PAY BILL MODAL */}
          {showPayModal && activeCard && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
                <button
                  onClick={() => setShowPayModal(false)}
                  className="absolute top-5 right-5 text-slate-400 hover:text-white"
                >
                  <FaTimes />
                </button>

                {!paymentSuccess ? (
                  <>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="p-3 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-2xl text-white">
                        <FaCreditCard className="text-xl" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          Pay {activeCard.bank_name} Bill
                        </h3>
                        <p className="text-xs text-slate-400">
                          {activeCard.card_variant} (•••• {activeCard.card_last4})
                        </p>
                      </div>
                    </div>

                    {errorMsg && (
                      <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
                        {errorMsg}
                      </div>
                    )}

                    <form onSubmit={handlePayBill} className="space-y-4">
                      {/* Quick Choice Buttons */}
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPayType("total");
                            setPayAmount(String(activeCard.current_outstanding));
                          }}
                          className={`py-2 px-2 text-xs font-bold rounded-xl border transition ${
                            payType === "total"
                              ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                              : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                          }`}
                        >
                          Total Due
                          <div className="text-[10px] font-normal text-slate-400">
                            ₹{Number(activeCard.current_outstanding).toLocaleString("en-IN")}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPayType("min");
                            setPayAmount(String(activeCard.min_due));
                          }}
                          className={`py-2 px-2 text-xs font-bold rounded-xl border transition ${
                            payType === "min"
                              ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                              : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                          }`}
                        >
                          Min Due
                          <div className="text-[10px] font-normal text-slate-400">
                            ₹{Number(activeCard.min_due).toLocaleString("en-IN")}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPayType("custom");
                            setPayAmount("");
                          }}
                          className={`py-2 px-2 text-xs font-bold rounded-xl border transition ${
                            payType === "custom"
                              ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                              : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                          }`}
                        >
                          Custom
                          <div className="text-[10px] font-normal text-slate-400">Any Amount</div>
                        </button>
                      </div>

                      {/* Payment Amount Input */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">
                          Amount to Pay (INR)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-3 text-slate-400 font-bold">₹</span>
                          <input
                            type="number"
                            min="1"
                            value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value)}
                            required
                            placeholder="Enter amount"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2.5 text-white font-bold focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>

                      {/* Wallet Balance Info */}
                      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Wallet Balance Available:</span>
                        <span className="font-bold text-cyan-400">₹{walletBalance.toLocaleString("en-IN")}</span>
                      </div>

                      {/* Reward Preview */}
                      {payAmount && Number(payAmount) > 0 && (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2 text-xs text-amber-300">
                          <FaGift className="text-base flex-shrink-0" />
                          <span>
                            You will earn ~<strong>₹{Math.min(500, Math.max(10, Math.round(Number(payAmount) * 0.01)))}</strong> instant cashback + 75 NeoCoins!
                          </span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={paying}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-500/25 transition disabled:opacity-50"
                      >
                        {paying ? "Processing Settlement..." : `Confirm & Pay ₹${Number(payAmount || 0).toLocaleString("en-IN")}`}
                      </button>
                    </form>
                  </>
                ) : (
                  /* Success View */
                  <div className="text-center py-4 space-y-4">
                    <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl">
                      <FaCheckCircle />
                    </div>
                    <h3 className="text-xl font-bold text-white">Payment Successful!</h3>
                    <p className="text-xs text-slate-400">
                      ₹{Number(payAmount).toLocaleString("en-IN")} settled towards {activeCard.bank_name} •••• {activeCard.card_last4}
                    </p>

                    <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl text-left space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Instant Cashback Credited:</span>
                        <span className="font-bold text-emerald-400">+₹{paymentSuccess.cashbackEarned}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Reference ID:</span>
                        <span className="font-mono text-slate-200">{paymentSuccess.transactionRef}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Remaining Card Due:</span>
                        <span className="font-bold text-white">₹{paymentSuccess.newOutstanding.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Updated Wallet Balance:</span>
                        <span className="font-bold text-cyan-400">₹{paymentSuccess.newBalance.toLocaleString("en-IN")}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowPayModal(false)}
                      className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ADD CARD MODAL */}
          {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="absolute top-5 right-5 text-slate-400 hover:text-white"
                >
                  <FaTimes />
                </button>

                <div className="flex items-center gap-3 mb-5">
                  <div className="p-3 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-2xl text-white">
                    <FaPlus className="text-xl" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Link External Credit Card</h3>
                    <p className="text-xs text-slate-400">Add cards from any Indian or international bank</p>
                  </div>
                </div>

                {errorMsg && (
                  <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleAddCard} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">
                        Bank Name
                      </label>
                      <select
                        value={form.bank_name}
                        onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                      >
                        <option value="HDFC Bank">HDFC Bank</option>
                        <option value="ICICI Bank">ICICI Bank</option>
                        <option value="SBI Card">SBI Card</option>
                        <option value="Axis Bank">Axis Bank</option>
                        <option value="American Express">American Express</option>
                        <option value="Kotak Mahindra">Kotak Mahindra Bank</option>
                        <option value="IndusInd Bank">IndusInd Bank</option>
                        <option value="RBL Bank">RBL Bank</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">
                        Card Network
                      </label>
                      <select
                        value={form.card_network}
                        onChange={(e) => setForm({ ...form, card_network: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                      >
                        <option value="Visa">Visa</option>
                        <option value="Mastercard">Mastercard</option>
                        <option value="RuPay">RuPay</option>
                        <option value="Amex">American Express</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">
                        Card Variant
                      </label>
                      <input
                        type="text"
                        value={form.card_variant}
                        onChange={(e) => setForm({ ...form, card_variant: e.target.value })}
                        required
                        placeholder="e.g. Regalia Gold / Sapphiro"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">
                        Last 4 Digits
                      </label>
                      <input
                        type="text"
                        maxLength="4"
                        value={form.card_last4}
                        onChange={(e) => setForm({ ...form, card_last4: e.target.value })}
                        required
                        placeholder="e.g. 4821"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">
                        Total Credit Limit (₹)
                      </label>
                      <input
                        type="number"
                        value={form.credit_limit}
                        onChange={(e) => setForm({ ...form, credit_limit: e.target.value })}
                        required
                        placeholder="250000"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">
                        Current Outstanding (₹)
                      </label>
                      <input
                        type="number"
                        value={form.current_outstanding}
                        onChange={(e) => setForm({ ...form, current_outstanding: e.target.value })}
                        required
                        placeholder="15000"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">
                        Payment Due Date
                      </label>
                      <input
                        type="date"
                        value={form.due_date}
                        onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">
                        Card Aesthetic Theme
                      </label>
                      <select
                        value={form.card_theme}
                        onChange={(e) => setForm({ ...form, card_theme: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                      >
                        <option value="sapphire">Sapphire (Deep Blue)</option>
                        <option value="ruby">Ruby (Crimson Red)</option>
                        <option value="emerald">Emerald (Teal Green)</option>
                        <option value="obsidian">Obsidian (Metal Black)</option>
                        <option value="gold">Gold (Royal Amber)</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={paying}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-500/25 transition disabled:opacity-50 mt-4"
                  >
                    {paying ? "Saving Card..." : "Link Credit Card"}
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
