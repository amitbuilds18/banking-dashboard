import { useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Cards from "../components/Cards";
import VirtualCard from "../components/VirtualCard";
import SmartInsights from "../components/SmartInsights";
import SavingsVaults from "../components/SavingsVaults";
import Charts from "../components/Charts";
import TransactionsTable from "../components/TransactionsTable";
import StripeCheckout from "../components/StripeCheckout";
import NotificationBell from "../components/NotificationBell";

export default function Dashboard() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefreshData = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <div className={`fixed inset-y-0 left-0 z-40 transition-transform duration-200 md:static md:translate-x-0 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <Sidebar onClose={() => setMobileMenuOpen(false)} />
      </div>

      {mobileMenuOpen && (
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/70 md:hidden"
          aria-label="Close mobile menu"
        />
      )}

      <div className="dashboard-shell flex-1 overflow-y-auto p-6 md:p-8">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Header */}
          <header className="flex flex-col gap-4 rounded-3xl border border-slate-700/60 bg-slate-900/50 p-6 shadow-xl backdrop-blur-xl md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-xl border border-slate-600 bg-slate-800 p-2 text-lg text-slate-200 md:hidden"
                aria-label="Open menu"
              >
                ☰
              </button>

              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-cyan-400">NovaPay Neo-Bank</p>
                <h1 className="mt-1 text-3xl font-black text-white">Financial HQ</h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/send-money"
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition hover:brightness-110"
              >
                💸 Send Money
              </Link>
              <Link
                to="/transactions"
                className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
              >
                📄 Statements
              </Link>
              <NotificationBell />
            </div>
          </header>

          {/* Quick Metrics Cards */}
          <Cards key={`cards-${refreshKey}`} />

          {/* 3D Virtual Card + AI Financial Insights Split Row */}
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <VirtualCard />
            </div>
            <div className="lg:col-span-7">
              <SmartInsights key={`insights-${refreshKey}`} />
            </div>
          </div>

          {/* Smart Savings Vaults with Round-Up */}
          <SavingsVaults onBalanceUpdate={handleRefreshData} />

          {/* Instant Stripe Wallet Recharge */}
          <StripeCheckout />

          {/* Charts & Analytics */}
          <Charts key={`charts-${refreshKey}`} />

          {/* Transactions Table with Badges & Icons */}
          <TransactionsTable key={`tx-${refreshKey}`} />
        </div>
      </div>
    </div>
  );
}