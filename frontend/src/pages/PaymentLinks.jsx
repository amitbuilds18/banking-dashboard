import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import QRCode from "qrcode";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import NotificationBell from "../components/NotificationBell";
import {
  FaLink,
  FaWhatsapp,
  FaQrcode,
  FaCopy,
  FaCheck,
  FaCheckCircle,
  FaTimes,
  FaPlus,
  FaShareAlt,
  FaWallet,
  FaBolt,
  FaMoneyBillWave,
  FaClock,
  FaExclamationTriangle,
  FaArrowRight,
  FaExternalLinkAlt,
} from "react-icons/fa";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1"
    ? "https://banking-dashboard-anuc.vercel.app/api"
    : "http://localhost:5000/api");

function QRCodeCanvas({ text, size = 180 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (canvasRef.current && text) {
      QRCode.toCanvas(canvasRef.current, text, {
        width: size,
        margin: 2,
        color: { dark: "#0F172A", light: "#FFFFFF" },
      });
    }
  }, [text, size]);
  return <canvas ref={canvasRef} className="rounded-2xl mx-auto shadow-xl" />;
}

export default function PaymentLinks() {
  const { user, token } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Links & Stats
  const [links, setLinks] = useState([]);
  const [stats, setStats] = useState({
    totalCollected: 0,
    pendingAmount: 0,
    activeCount: 0,
    paidCount: 0,
    totalLinks: 0,
  });

  // Generator Form
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [expireDays, setExpireDays] = useState(7);
  const [creating, setCreating] = useState(false);

  // Modals & Popups
  const [createdModal, setCreatedModal] = useState(null); // { link, payUrl, whatsappUrl }
  const [qrModal, setQrModal] = useState(null); // link object
  const [copiedId, setCopiedId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = "success") => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/payment-links`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLinks(res.data.links || []);
      setStats(res.data.stats || {});
    } catch (err) {
      console.error("Failed to load payment links:", err);
      showToast("Unable to load payment links", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchLinks();
  }, [token]);

  // Handle Create Link
  const handleCreateLink = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) < 1) {
      showToast("Please enter an amount of at least ₹1", "error");
      return;
    }

    try {
      setCreating(true);
      const res = await axios.post(
        `${API_BASE}/payment-links`,
        {
          amount: Number(amount),
          description: description || "Payment Request",
          customerName,
          customerPhone,
          expireDays: Number(expireDays),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCreatedModal(res.data);
      setAmount("");
      setDescription("");
      setCustomerName("");
      setCustomerPhone("");
      showToast("Payment link generated!");
      await fetchLinks();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to create payment link", "error");
    } finally {
      setCreating(false);
    }
  };

  // Handle Cancel Link
  const handleCancelLink = async (linkId) => {
    try {
      await axios.post(
        `${API_BASE}/payment-links/${linkId}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast("Payment link cancelled.");
      await fetchLinks();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to cancel link", "error");
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getFullPayUrl = (linkCode) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";
    return `${origin}/pay/${linkCode}`;
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden">
      {/* Toast */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border backdrop-blur-md transition-all animate-bounce ${
            toastMessage.type === "error"
              ? "bg-rose-950/90 border-rose-500/50 text-rose-200"
              : "bg-emerald-950/90 border-emerald-500/50 text-emerald-200"
          }`}
        >
          {toastMessage.type === "error" ? <FaExclamationTriangle /> : <FaCheckCircle />}
          <span className="font-medium text-sm">{toastMessage.msg}</span>
        </div>
      )}

      {/* QR Code Modal */}
      {qrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl text-center space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FaQrcode className="text-emerald-400" />
                Scan &amp; Pay UPI QR
              </h3>
              <button
                onClick={() => setQrModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <FaTimes />
              </button>
            </div>

            <div className="mx-auto flex justify-center py-2">
              <QRCodeCanvas text={qrModal.upi_string} size={200} />
            </div>

            <div className="space-y-1">
              <p className="text-2xl font-black text-emerald-400">
                ₹{parseFloat(qrModal.amount).toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-slate-300 font-medium">{qrModal.description}</p>
              <p className="text-[11px] text-slate-500 font-mono">{qrModal.link_code}</p>
            </div>

            <p className="text-[11px] text-slate-400">
              Scan with Google Pay, PhonePe, Paytm, or any BHIM UPI camera
            </p>
          </div>
        </div>
      )}

      {/* Newly Created Link Share Modal */}
      {createdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-emerald-500/40 shadow-2xl space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FaCheckCircle className="text-emerald-400" />
                Payment Link Ready!
              </h3>
              <button
                onClick={() => setCreatedModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
              <p className="text-xs text-slate-400">Requested Amount</p>
              <p className="text-3xl font-extrabold text-emerald-400">
                ₹{parseFloat(createdModal.link.amount).toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-slate-300">{createdModal.link.description}</p>
            </div>

            {/* Link Copy Box */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Shareable Public URL</label>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800">
                <input
                  type="text"
                  readOnly
                  value={createdModal.payUrl}
                  className="bg-transparent text-xs text-slate-300 w-full focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(createdModal.payUrl, "modal")}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 shrink-0"
                >
                  {copiedId === "modal" ? <FaCheck className="text-emerald-400" /> : <FaCopy />}
                  {copiedId === "modal" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            {/* Quick Share Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <a
                href={createdModal.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
              >
                <FaWhatsapp className="text-base" /> Share on WhatsApp
              </a>
              <button
                type="button"
                onClick={() => {
                  setQrModal(createdModal.link);
                  setCreatedModal(null);
                }}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <FaQrcode className="text-base" /> Show QR Code
              </button>
            </div>
          </div>
        </div>
      )}

      <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-slate-900/60 backdrop-blur-xl border-b border-slate-800/80">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              ☰
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <FaLink className="text-emerald-400" />
                  Payment Requests &amp; Share Links
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  WhatsApp Pay
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Collect payments via shareable links, instant dynamic UPI QR codes &amp; WhatsApp
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Key KPI Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Collected */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900/80 border border-emerald-500/30">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                  <FaMoneyBillWave className="text-emerald-400" /> Total Collected
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                  {stats.paidCount} Paid
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-emerald-400">
                  ₹{stats.totalCollected.toLocaleString("en-IN")}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">Credited directly to bank wallet</p>
            </div>

            {/* Pending Amount */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900/80 border border-amber-500/30">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <FaClock className="text-amber-400" /> Pending Collection
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                  {stats.activeCount} Active
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-amber-300">
                  ₹{stats.pendingAmount.toLocaleString("en-IN")}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">Awaiting payer settlement</p>
            </div>

            {/* Instant UPI Integration */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900/80 border border-indigo-500/30">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                  <FaQrcode className="text-indigo-400" /> Dynamic UPI QR
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                  Zero Fee
                </span>
              </div>
              <p className="text-sm font-bold text-white">Google Pay • PhonePe • Paytm</p>
              <p className="mt-1 text-[11px] text-slate-400 leading-tight">
                Works with all BHIM UPI apps across India with instant settlement.
              </p>
            </div>

            {/* WhatsApp Direct */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-950/40 via-slate-900 to-slate-900/80 border border-teal-500/30">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
                  <FaWhatsapp className="text-emerald-400 text-sm" /> 1-Click WhatsApp
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300">
                  Auto Text
                </span>
              </div>
              <p className="text-sm font-bold text-white">Pre-formatted Pay Requests</p>
              <p className="mt-1 text-[11px] text-slate-400 leading-tight">
                Dispatches custom payment links straight into customer WhatsApp chats.
              </p>
            </div>
          </div>

          {/* Generator Studio & Active Links Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Create Payment Request Form (5 cols) */}
            <div className="lg:col-span-5 p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl space-y-5">
              <div className="border-b border-slate-800 pb-3">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <FaPlus className="text-emerald-400" />
                  Create Payment Request
                </h2>
                <p className="text-xs text-slate-400">
                  Generate instant link &amp; QR to request money from friends or clients
                </p>
              </div>

              <form onSubmit={handleCreateLink} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Request Amount (₹) <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      required
                      min="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="500"
                      className="w-full pl-9 pr-4 py-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-white font-bold text-lg focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Purpose / Note</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Dinner Split, Freelance Invoice #102"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Payer Name</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-4 py-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">WhatsApp Phone</label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full px-4 py-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Link Validity</label>
                  <select
                    value={expireDays}
                    onChange={(e) => setExpireDays(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="1">1 Day (Urgent)</option>
                    <option value="3">3 Days</option>
                    <option value="7">7 Days (Standard)</option>
                    <option value="30">30 Days (Extended)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={creating || !amount}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FaBolt />
                  {creating ? "Generating..." : "Generate Payment Link"}
                </button>
              </form>
            </div>

            {/* Right: Payment Links Management Table (7 cols) */}
            <div className="lg:col-span-7 p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FaLink className="text-cyan-400" />
                  Your Active &amp; Settled Links
                </h3>
                <span className="text-xs text-slate-400">{links.length} Total Links</span>
              </div>

              {links.length === 0 ? (
                <div className="py-12 text-center rounded-2xl bg-slate-950/40 border border-slate-800/60 space-y-2">
                  <p className="text-sm font-semibold text-slate-300">No Payment Links Created</p>
                  <p className="text-xs text-slate-500">
                    Use the form on the left to create your first payment link!
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  {links.map((link) => {
                    const payUrl = getFullPayUrl(link.link_code);
                    const waText = encodeURIComponent(
                      `Hi! Please pay ₹${parseFloat(link.amount).toLocaleString(
                        "en-IN"
                      )} for "${link.description}" using this link: ${payUrl}`
                    );
                    const waUrl = `https://api.whatsapp.com/send?text=${waText}${
                      link.customer_phone ? `&phone=${link.customer_phone.replace(/\D/g, "")}` : ""
                    }`;

                    return (
                      <div
                        key={link.id}
                        className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-cyan-300">
                                {link.link_code}
                              </span>
                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                                  link.status === "paid"
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : link.status === "active"
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                    : "bg-slate-800 text-slate-400 border border-slate-700"
                                }`}
                              >
                                {link.status}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-white mt-1">
                              {link.description}
                            </h4>
                            {link.customer_name && (
                              <p className="text-[11px] text-slate-400">
                                Payer: {link.customer_name}
                              </p>
                            )}
                          </div>

                          <div className="text-right">
                            <p className="text-lg font-black text-white">
                              ₹{parseFloat(link.amount).toLocaleString("en-IN")}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {new Date(link.created_at).toLocaleDateString("en-IN")}
                            </p>
                          </div>
                        </div>

                        {/* Paid Notice or Actions */}
                        {link.status === "paid" ? (
                          <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-emerald-300">
                            <span>
                              Paid by: <strong className="text-white">{link.paid_by_name}</strong> via{" "}
                              {link.paid_by_method}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {link.transaction_ref}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                            {/* Copy Link */}
                            <button
                              type="button"
                              onClick={() => copyToClipboard(payUrl, link.id)}
                              className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                            >
                              {copiedId === link.id ? (
                                <FaCheck className="text-emerald-400" />
                              ) : (
                                <FaCopy />
                              )}
                              <span>{copiedId === link.id ? "Copied" : "Copy Link"}</span>
                            </button>

                            {/* WhatsApp Share */}
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                            >
                              <FaWhatsapp /> <span>WhatsApp</span>
                            </a>

                            {/* QR Code Preview */}
                            <button
                              type="button"
                              onClick={() => setQrModal(link)}
                              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                            >
                              <FaQrcode /> <span>QR</span>
                            </button>

                            {/* Open Public Page */}
                            <Link
                              to={`/pay/${link.link_code}`}
                              target="_blank"
                              className="py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white text-xs flex items-center justify-center"
                              title="Open public checkout"
                            >
                              <FaExternalLinkAlt />
                            </Link>

                            {/* Cancel Link */}
                            <button
                              type="button"
                              onClick={() => handleCancelLink(link.id)}
                              className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all text-xs"
                              title="Cancel Link"
                            >
                              <FaTimes />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
