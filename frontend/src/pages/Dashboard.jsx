import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import Cards from "../components/Cards";
import VirtualCard from "../components/VirtualCard";
import SmartInsights from "../components/SmartInsights";
import SavingsVaults from "../components/SavingsVaults";
import Charts from "../components/Charts";
import TransactionsTable from "../components/TransactionsTable";
import StripeCheckout from "../components/StripeCheckout";
import NotificationBell from "../components/NotificationBell";
import AIAssistant from "../components/AIAssistant";
import {
  FaShieldAlt,
  FaArrowRight,
  FaBolt,
  FaCreditCard,
  FaPaperPlane,
} from "react-icons/fa";

export default function Dashboard() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [copilotTrigger, setCopilotTrigger] = useState(null);

  const handleRefreshData = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleOpenCopilot = (query = null) => {
    setCopilotTrigger({ query, timestamp: Date.now() });
  };

  // Dynamic time-based greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const formattedDate = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex min-h-screen bg-slate-950 text-white selection:bg-cyan-500 selection:text-slate-950">
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

      {/* Main Dashboard Canvas */}
      <div className="dashboard-shell flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Executive Header Banner */}
          <header className="relative overflow-hidden rounded-3xl border border-slate-700/70 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950/90 p-6 shadow-2xl backdrop-blur-xl">
            {/* Glow Orbs */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              {/* Left Column: Greeting & Status */}
              <div className="flex items-start gap-4">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="rounded-2xl border border-slate-700 bg-slate-800/80 p-2.5 text-slate-300 transition hover:bg-slate-700 hover:text-white md:hidden"
                  aria-label="Open menu"
                >
                  ☰
                </button>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400">
                      NovaPay Financial HQ
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                      Live Network
                    </span>
                  </div>

                  <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                    {greeting},{" "}
                    <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-300 bg-clip-text text-transparent">
                      {user?.name ? user.name.split(" ")[0] : "Commander"}
                    </span>
                  </h1>

                  <p className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                    <span>{formattedDate}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <FaShieldAlt className="text-emerald-400" /> 256-Bit SSL Protected
                    </span>
                  </p>
                </div>
              </div>

              {/* Right Column: Executive Action Shortcuts */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleOpenCopilot()}
                  className="flex items-center gap-2 rounded-2xl border border-cyan-500/40 bg-gradient-to-r from-cyan-500/15 via-blue-500/15 to-indigo-500/15 px-4 py-2.5 text-xs font-bold text-cyan-300 shadow-lg shadow-cyan-500/10 backdrop-blur-md transition hover:border-cyan-400 hover:bg-cyan-500/25 hover:text-white active:scale-95"
                >
                  <FaBolt className="text-cyan-400" />
                  <span>AI Copilot</span>
                </button>

                <Link
                  to="/send-money"
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/25 transition hover:brightness-110 active:scale-95"
                >
                  <FaPaperPlane className="text-xs" />
                  <span>Send Money</span>
                </Link>

                <Link
                  to="/bills"
                  className="flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs font-semibold text-amber-300 backdrop-blur-md transition hover:bg-amber-500/20 hover:text-white"
                >
                  <FaBolt className="text-xs text-amber-400" />
                  <span>Pay Bills</span>
                </Link>

                <Link
                  to="/payment"
                  className="flex items-center gap-2 rounded-2xl border border-slate-700/80 bg-slate-800/80 px-3.5 py-2.5 text-xs font-semibold text-slate-200 backdrop-blur-md transition hover:bg-slate-700 hover:text-white"
                >
                  <FaCreditCard className="text-xs text-amber-400" />
                  <span>Top-Up</span>
                </Link>

                <Link
                  to="/transactions"
                  className="rounded-2xl border border-slate-700/80 bg-slate-800/80 px-3.5 py-2.5 text-xs font-semibold text-slate-200 backdrop-blur-md transition hover:bg-slate-700 hover:text-white"
                >
                  Statements
                </Link>

                <div className="ml-1">
                  <NotificationBell />
                </div>
              </div>
            </div>
          </header>

          {/* Section 1: Executive KPI Cards & Velocity */}
          <section>
            <Cards key={`cards-${refreshKey}`} />
          </section>

          {/* Quick Utility Hub */}
          <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400">
                  Quick Utility Hub
                </span>
                <h3 className="text-base font-bold text-white">Bill Payments & Recharges</h3>
              </div>
              <Link
                to="/bills"
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition"
              >
                View All Categories →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { name: "Electricity", icon: "⚡", desc: "Tata / Adani", color: "from-amber-500 to-yellow-600" },
                { name: "Mobile", icon: "📱", desc: "Jio / Airtel 5G", color: "from-blue-500 to-cyan-600" },
                { name: "Broadband", icon: "🌐", desc: "JioFiber / Xstream", color: "from-emerald-500 to-teal-600" },
                { name: "OTT & Stream", icon: "🎬", desc: "Netflix / Prime", color: "from-rose-500 to-pink-600" },
                { name: "LPG Gas", icon: "🔥", desc: "Indane / Bharat", color: "from-orange-500 to-red-600" },
              ].map((item) => (
                <Link
                  key={item.name}
                  to="/bills"
                  className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 hover:border-cyan-500/40 hover:bg-slate-800/80 transition group"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${item.color} text-lg shadow-md group-hover:scale-105 transition`}
                  >
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition truncate">
                      {item.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 truncate">{item.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Section 2: 3D Virtual Card + AI Financial Insights Split Row */}
          <section>
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <VirtualCard />
              </div>
              <div className="lg:col-span-7">
                <SmartInsights
                  key={`insights-${refreshKey}`}
                  onOpenCopilot={handleOpenCopilot}
                />
              </div>
            </div>
          </section>

          {/* Section 3: Smart Savings Vaults with Round-Up */}
          <section>
            <SavingsVaults onBalanceUpdate={handleRefreshData} />
          </section>

          {/* Section 4: Instant Stripe Wallet Recharge */}
          <section>
            <StripeCheckout />
          </section>

          {/* Section 5: Charts & Financial Analytics */}
          <section>
            <Charts key={`charts-${refreshKey}`} />
          </section>

          {/* Section 6: Transactions Table with Badges & Icons */}
          <section>
            <TransactionsTable key={`tx-${refreshKey}`} />
          </section>
        </div>
      </div>

      {/* Interactive AI Financial Copilot Drawer/Modal */}
      <AIAssistant
        externalTrigger={copilotTrigger}
        onTriggerHandled={() => setCopilotTrigger(null)}
      />
    </div>
  );
}