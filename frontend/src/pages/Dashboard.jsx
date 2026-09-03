import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Cards from "../components/Cards";
import Charts from "../components/Charts";
import TransactionsTable from "../components/TransactionsTable";
import StripeCheckout from "../components/StripeCheckout";
import NotificationBell from "../components/NotificationBell";

export default function Dashboard() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        <div className="mx-auto max-w-7xl">
          <header className="mb-8 flex flex-col gap-4 rounded-2xl border border-slate-700/60 bg-slate-900/50 p-5 shadow-lg md:flex-row md:items-center md:justify-between">
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
                <p className="text-sm uppercase tracking-[0.2em] text-blue-400">Overview</p>
                <h1 className="mt-2 text-3xl font-bold text-white">Finance Dashboard</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-300">
                Active account
              </div>
              <NotificationBell />
            </div>
          </header>

          <Cards />

          <div className="my-6">
            <StripeCheckout />
          </div>

          <Charts />
          <TransactionsTable />
        </div>
      </div>
    </div>
  );
}