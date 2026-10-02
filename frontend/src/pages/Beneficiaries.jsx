import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUsers,
  FaUserPlus,
  FaSearch,
  FaPaperPlane,
  FaTrash,
  FaCheckCircle,
  FaCopy,
  FaArrowLeft,
  FaTimes,
  FaStar,
  FaBuilding,
  FaUser,
  FaHeart,
} from "react-icons/fa";
import API from "../services/api";
import { useToast } from "../context/ToastContext";

const COLOR_OPTIONS = [
  { name: "Cyan", class: "from-blue-500 to-cyan-500" },
  { name: "Emerald", class: "from-emerald-500 to-teal-500" },
  { name: "Purple", class: "from-purple-500 to-indigo-500" },
  { name: "Rose", class: "from-rose-500 to-pink-500" },
  { name: "Amber", class: "from-amber-500 to-orange-500" },
  { name: "Violet", class: "from-violet-500 to-fuchsia-500" },
];

const ACCOUNT_TYPES = [
  { id: "individual", label: "Personal", icon: FaUser },
  { id: "family", label: "Family", icon: FaHeart },
  { id: "business", label: "Business", icon: FaBuilding },
];

export default function Beneficiaries() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    nickname: "",
    phone: "",
    account_type: "individual",
    avatar_color: "from-blue-500 to-cyan-500",
  });

  const fetchBeneficiaries = async () => {
    try {
      setLoading(true);
      const res = await API.get("/beneficiaries");
      setBeneficiaries(res.data || []);
    } catch (err) {
      console.error(err);
      showToast("Failed to load beneficiaries", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBeneficiaries();
  }, []);

  const handleCopyEmail = (email) => {
    navigator.clipboard.writeText(email);
    showToast("Email copied to clipboard!", "success");
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from your beneficiaries?`)) {
      return;
    }

    try {
      await API.delete(`/beneficiaries/${id}`);
      setBeneficiaries((prev) => prev.filter((b) => b.id !== id));
      showToast(`${name} removed from beneficiaries`, "info");
    } catch (err) {
      console.error(err);
      showToast("Failed to delete beneficiary", "error");
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      showToast("Name and email are required", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await API.post("/beneficiaries", formData);
      showToast(res.data?.message || "Beneficiary saved!", "success");
      setShowAddModal(false);
      setFormData({
        name: "",
        email: "",
        nickname: "",
        phone: "",
        account_type: "individual",
        avatar_color: "from-blue-500 to-cyan-500",
      });
      fetchBeneficiaries();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || "Failed to add beneficiary";
      showToast(errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredBeneficiaries = beneficiaries.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.nickname && b.nickname.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (b.phone && b.phone.includes(searchTerm));

    const matchesType =
      filterType === "all" ? true : b.account_type === filterType;

    return matchesSearch && matchesType;
  });

  const getInitials = (name) => {
    if (!name) return "NP";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const verifiedCount = beneficiaries.filter((b) => b.is_registered).length;

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-cyan-500 selection:text-slate-950 p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Top Navigation & Action Banner */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              onClick={() => navigate("/dashboard")}
              className="mb-2 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              <FaArrowLeft className="text-[10px]" /> Back to Dashboard
            </button>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 text-xl font-bold text-white shadow-lg shadow-cyan-500/20">
                <FaUsers />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white sm:text-3xl">
                  Saved Beneficiaries
                </h1>
                <p className="text-xs text-slate-400">
                  Quick Pay contact directory for zero-fee peer transfers
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-500/25 transition hover:brightness-110 active:scale-95"
          >
            <FaUserPlus /> Add Beneficiary
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Total Saved
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{beneficiaries.length}</span>
              <span className="text-xs text-slate-400">Contacts</span>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
              Verified in NeoBank
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-400">{verifiedCount}</span>
              <span className="text-xs text-slate-400">Instant Settlement</span>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">
              Quick Pay Ready
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-cyan-400">100%</span>
              <span className="text-xs text-slate-400">1-Click Authorized</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-xl">
          <div className="relative flex-1">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, nickname, or email..."
              className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 py-2.5 pl-11 pr-4 text-sm text-white placeholder-slate-500 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {["all", "individual", "family", "business"].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`rounded-xl px-3.5 py-2 text-xs font-semibold capitalize transition ${
                  filterType === type
                    ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20"
                    : "border border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Beneficiaries Grid */}
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/40">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
              <p className="text-xs text-slate-400">Loading contacts...</p>
            </div>
          </div>
        ) : filteredBeneficiaries.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/20 p-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/80 text-2xl text-slate-500">
              <FaUsers />
            </div>
            <h3 className="text-lg font-bold text-white">
              {searchTerm ? "No matching contacts found" : "No Beneficiaries Added Yet"}
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-400">
              {searchTerm
                ? "Try searching with a different name or email"
                : "Add friends, family, or business partners to send funds with a single click."}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 px-4 py-2.5 text-xs font-bold text-cyan-400 hover:bg-cyan-500/20 transition"
              >
                <FaUserPlus /> Add First Beneficiary
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBeneficiaries.map((b) => (
              <div
                key={b.id}
                className="group relative flex flex-col justify-between rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl transition hover:border-slate-700 hover:bg-slate-900/80 hover:shadow-xl hover:shadow-cyan-950/20"
              >
                {/* Header: Avatar + Info */}
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${
                          b.avatar_color || "from-blue-500 to-cyan-500"
                        } text-base font-black text-white shadow-md`}
                      >
                        {getInitials(b.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white truncate">
                            {b.name}
                          </h4>
                          {b.is_registered && (
                            <span
                              title="Verified NeoBank Account"
                              className="text-emerald-400"
                            >
                              <FaCheckCircle className="text-xs" />
                            </span>
                          )}
                        </div>
                        {b.nickname && (
                          <span className="inline-block mt-0.5 rounded-md bg-slate-800 border border-slate-700/60 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                            ⭐ {b.nickname}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(b.id, b.name)}
                      className="text-slate-600 hover:text-rose-400 transition p-1.5 rounded-lg hover:bg-rose-500/10"
                      title="Delete beneficiary"
                    >
                      <FaTrash className="text-xs" />
                    </button>
                  </div>

                  {/* Details */}
                  <div className="mt-4 space-y-1.5 rounded-2xl border border-slate-800/80 bg-slate-950/40 p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px]">Email</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-slate-300 truncate max-w-[170px]">
                          {b.email}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyEmail(b.email)}
                          className="text-slate-500 hover:text-cyan-400 transition"
                          title="Copy email"
                        >
                          <FaCopy className="text-[10px]" />
                        </button>
                      </div>
                    </div>

                    {b.phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-[11px]">Phone</span>
                        <span className="font-mono text-slate-300">{b.phone}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px]">Category</span>
                      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                        {b.account_type || "individual"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action: 1-Click Quick Pay */}
                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">
                    {b.is_registered ? "⚡ Live NeoBank Transfer" : "✉️ Direct P2P"}
                  </span>
                  <button
                    onClick={() =>
                      navigate(
                        `/send-money?email=${encodeURIComponent(
                          b.email
                        )}&name=${encodeURIComponent(b.name)}`
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-cyan-500/20 transition hover:brightness-110 active:scale-95"
                  >
                    <FaPaperPlane className="text-[10px]" /> Quick Pay
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ADD BENEFICIARY MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-white transition"
            >
              <FaTimes />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
                <FaUserPlus />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Add Beneficiary</h3>
                <p className="text-xs text-slate-400">
                  Save contact for instant 1-click Quick Pay
                </p>
              </div>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g. Priya Sharma"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Recipient Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="e.g. priya@gmail.com"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nickname (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.nickname}
                    onChange={(e) =>
                      setFormData({ ...formData, nickname: e.target.value })
                    }
                    placeholder="e.g. Roommate, Mom"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="e.g. 9876543210"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {ACCOUNT_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, account_type: type.id })
                        }
                        className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition ${
                          formData.account_type === type.id
                            ? "border-cyan-500 bg-cyan-500/20 text-cyan-300"
                            : "border-slate-700 bg-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        <Icon className="text-[10px]" /> {type.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Avatar Color
                </label>
                <div className="flex gap-2.5">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, avatar_color: c.class })
                      }
                      className={`h-7 w-7 rounded-full bg-gradient-to-br ${
                        c.class
                      } transition ${
                        formData.avatar_color === c.class
                          ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110"
                          : "opacity-60 hover:opacity-100"
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/25 transition hover:brightness-110 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Beneficiary"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
