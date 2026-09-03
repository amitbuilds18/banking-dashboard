import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Sidebar({ onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
    if (onClose) onClose();
  };

  const menu = [
    { name: "Dashboard", icon: "📊", path: "/" },
    { name: "Transactions", icon: "💳", path: "/transactions" },
    { name: "Send Money", icon: "💸", path: "/send-money" },
    { name: "Recharge Wallet", icon: "💰", path: "/payment" },
    { name: "Profile", icon: "👤", path: "/profile" },
  ];

  return (
    <aside className="flex min-h-screen w-72 flex-col justify-between border-r border-slate-700/80 bg-slate-900/90 backdrop-blur-xl">
      <div>
        <div className="flex items-center justify-between border-b border-slate-700/80 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 text-xl shadow-lg shadow-blue-500/30">
              💳
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-blue-400">Banking</p>
              <h1 className="text-xl font-bold text-white">NovaPay</h1>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-300 md:hidden"
          >
            ✕
          </button>
        </div>

        <div className="border-b border-slate-700/80 p-5">
          <div className="flex items-center gap-4 rounded-2xl bg-slate-800/70 p-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-400 text-xl shadow-lg shadow-emerald-500/20">
              👤
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-white">{user?.name || "Guest"}</h3>
              <p className="truncate text-xs text-slate-400">{user?.email || "No Email"}</p>
            </div>
          </div>
        </div>

        <nav className="space-y-2 p-4">
          {menu.map((item) => {
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/10 text-white ring-1 ring-blue-500/40"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-700/80 p-4">
        <button
          onClick={handleLogout}
          className="w-full rounded-xl bg-gradient-to-r from-red-500 to-rose-500 px-4 py-3 font-semibold text-white shadow-lg shadow-red-500/20 transition hover:brightness-110"
        >
          🚪 Logout
        </button>
      </div>
    </aside>
  );
}