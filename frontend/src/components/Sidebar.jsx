import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  FaHome,
  FaPaperPlane,
  FaReceipt,
  FaWallet,
  FaUser,
  FaSignOutAlt,
  FaShieldAlt,
  FaChevronRight,
  FaTimes,
} from "react-icons/fa";

export default function Sidebar({ onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
    if (onClose) onClose();
  };

  const getInitials = (name) => {
    if (!name) return "NP";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const menu = [
    {
      name: "Dashboard",
      icon: FaHome,
      path: "/",
      badge: "Overview",
    },
    {
      name: "Send Money",
      icon: FaPaperPlane,
      path: "/send-money",
      badge: "Instant",
    },
    {
      name: "Statements",
      icon: FaReceipt,
      path: "/transactions",
      badge: "PDFs",
    },
    {
      name: "Recharge Wallet",
      icon: FaWallet,
      path: "/payment",
      badge: "Stripe",
    },
    {
      name: "Profile & Security",
      icon: FaUser,
      path: "/profile",
      badge: "Verified",
    },
  ];

  return (
    <aside className="flex h-full min-h-screen w-72 flex-col justify-between border-r border-slate-800/80 bg-slate-900/95 p-5 shadow-2xl backdrop-blur-2xl">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-5">
          <Link
            to="/"
            onClick={onClose}
            className="flex items-center gap-3 transition hover:opacity-90"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-600 to-indigo-600 text-white shadow-lg shadow-cyan-500/25 ring-2 ring-cyan-400/30">
              <FaShieldAlt className="text-xl" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight text-white">NovaPay</span>
                <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-cyan-300 border border-cyan-500/30">
                  Neo
                </span>
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Enterprise Banking
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800/80 p-2 text-slate-400 transition hover:bg-slate-700 hover:text-white md:hidden"
            aria-label="Close sidebar"
          >
            <FaTimes className="text-sm" />
          </button>
        </div>

        {/* User Profile Card (Interactive) */}
        <Link
          to="/profile"
          onClick={onClose}
          className="group relative flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5 transition-all duration-200 hover:border-cyan-500/40 hover:bg-slate-850"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 text-sm font-black text-white shadow-md shadow-cyan-500/20">
                {getInitials(user?.name)}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-400" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="truncate text-xs font-bold text-white group-hover:text-cyan-300 transition">
                  {user?.name || "NovaPay Member"}
                </h3>
              </div>
              <p className="truncate text-[11px] text-slate-400">
                {user?.email || "verified@novapay.bank"}
              </p>
            </div>
          </div>

          <FaChevronRight className="text-xs text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition" />
        </Link>

        {/* Navigation Menu */}
        <nav className="space-y-1.5">
          <p className="px-3 pb-1 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
            Command Center
          </p>

          {menu.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`group relative flex items-center justify-between rounded-2xl px-3.5 py-3 text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-cyan-500/15 via-blue-500/10 to-transparent text-white shadow-sm"
                    : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200"
                }`}
              >
                {/* Active left indicator bar */}
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-cyan-400 shadow-md shadow-cyan-400/50" />
                )}

                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                      isActive
                        ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/30"
                        : "bg-slate-800/80 text-slate-400 group-hover:bg-slate-700 group-hover:text-white"
                    }`}
                  >
                    <Icon className="text-xs" />
                  </div>
                  <span className={isActive ? "font-bold text-white" : ""}>
                    {item.name}
                  </span>
                </div>

                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition ${
                    isActive
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : "bg-slate-800/60 text-slate-500 group-hover:text-slate-400 border border-slate-700/50"
                  }`}
                >
                  {item.badge}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Security & Logout */}
      <div className="space-y-4 pt-6 border-t border-slate-800/80">
        {/* Security Assurance Badge */}
        <div className="flex items-center gap-2.5 rounded-2xl border border-slate-800/80 bg-slate-950/50 p-3 text-[11px] text-slate-400">
          <FaShieldAlt className="text-emerald-400 shrink-0 text-sm" />
          <div className="leading-tight">
            <span className="font-bold text-white">Bank-Grade Protocol</span>
            <p className="text-[10px] text-slate-500">256-Bit SSL Encrypted</p>
          </div>
        </div>

        {/* Executive Logout Button */}
        <button
          type="button"
          onClick={handleLogout}
          className="group flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-300 shadow-lg shadow-rose-950/20 transition-all duration-200 hover:bg-rose-600 hover:text-white active:scale-95"
        >
          <FaSignOutAlt className="text-xs transition group-hover:-translate-x-0.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}