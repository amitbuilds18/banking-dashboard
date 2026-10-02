import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaUsers, FaUserPlus, FaPaperPlane, FaChevronRight } from "react-icons/fa";
import API from "../services/api";

export default function QuickPayRibbon() {
  const navigate = useNavigate();
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/beneficiaries")
      .then((res) => setBeneficiaries(res.data || []))
      .catch((err) => console.warn("QuickPayRibbon fetch error:", err))
      .finally(() => setLoading(false));
  }, []);

  const getInitials = (name) => {
    if (!name) return "NP";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs">
            <FaUsers />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400">
              Quick Pay Hub
            </span>
            <h3 className="text-sm font-bold text-white">Instant Contact Transfers</h3>
          </div>
        </div>

        <Link
          to="/beneficiaries"
          className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition"
        >
          Manage All <FaChevronRight className="text-[10px]" />
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 py-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-16 w-20 animate-pulse rounded-2xl bg-slate-800/60"
            />
          ))}
        </div>
      ) : beneficiaries.length === 0 ? (
        <div className="flex items-center justify-between rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400">
              <FaUsers />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">No saved beneficiaries yet</p>
              <p className="text-[11px] text-slate-400">
                Add frequent recipients for instant 1-click money transfers.
              </p>
            </div>
          </div>
          <Link
            to="/beneficiaries"
            className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 transition"
          >
            <FaUserPlus className="text-xs" /> Add First
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-thin">
          {/* Add contact shortcut */}
          <Link
            to="/beneficiaries"
            className="flex flex-col items-center justify-center gap-1.5 h-20 w-20 shrink-0 rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 text-slate-400 hover:border-cyan-500/40 hover:text-cyan-300 transition group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-sm group-hover:scale-110 transition">
              <FaUserPlus />
            </div>
            <span className="text-[10px] font-semibold">New</span>
          </Link>

          {/* Beneficiary quick avatars */}
          {beneficiaries.slice(0, 8).map((b) => (
            <button
              key={b.id}
              onClick={() =>
                navigate(
                  `/send-money?email=${encodeURIComponent(
                    b.email
                  )}&name=${encodeURIComponent(b.name)}`
                )
              }
              className="group flex flex-col items-center justify-center gap-1.5 h-20 w-20 shrink-0 rounded-2xl border border-slate-800 bg-slate-950/50 p-2 hover:border-cyan-500/40 hover:bg-slate-800/80 transition active:scale-95"
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${
                  b.avatar_color || "from-blue-500 to-cyan-500"
                } text-xs font-black text-white shadow-sm group-hover:scale-105 transition`}
              >
                {getInitials(b.nickname || b.name)}
              </div>
              <span className="text-[10px] font-medium text-slate-300 group-hover:text-cyan-300 truncate max-w-[68px]">
                {b.nickname || b.name.split(" ")[0]}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
