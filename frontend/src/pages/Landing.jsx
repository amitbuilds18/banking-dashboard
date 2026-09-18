import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import API from "../services/api";
import {
  FaShieldAlt,
  FaBolt,
  FaCreditCard,
  FaPaperPlane,
  FaPiggyBank,
  FaRobot,
  FaLock,
  FaArrowRight,
  FaCheckCircle,
  FaStar,
} from "react-icons/fa";

export default function Landing() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();
  const [loadingDemo, setLoadingDemo] = useState(false);

  const handleLaunchDemo = async () => {
    setLoadingDemo(true);
    try {
      const res = await API.post("/auth/demo");
      const data = res.data;

      if (data.error) {
        showToast(data.error || "Failed to load demo", "error");
        return;
      }

      login(data.token, data.user);
      showToast("Welcome to NovaPay Demo Tour! 🚀", "success");
      navigate("/");
    } catch {
      showToast("Demo server temporarily busy. Please try again.", "error");
    } finally {
      setLoadingDemo(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-cyan-500 selection:text-slate-950">
      {/* Background Ambient Glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-indigo-500/10 blur-[150px]" />
        <div className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      {/* Top Navigation */}
      <header className="relative z-20 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-600 to-indigo-600 text-white shadow-lg shadow-cyan-500/25 ring-2 ring-cyan-400/30">
              <FaShieldAlt className="text-xl" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-tight text-white">NovaPay</span>
                <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-cyan-300 border border-cyan-500/30">
                  Neo
                </span>
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                AI Neo-Banking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleLaunchDemo}
              disabled={loadingDemo}
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3.5 py-2 text-xs font-bold text-cyan-300 transition hover:bg-cyan-500/20 hover:text-white disabled:opacity-50"
            >
              <FaBolt className="text-xs" />
              <span>{loadingDemo ? "Launching Demo..." : "Instant Demo"}</span>
            </button>

            <Link
              to="/login"
              className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
            >
              Sign In
            </Link>

            <Link
              to="/register"
              className="rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition hover:brightness-110 active:scale-95"
            >
              Open Account
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-16 pb-24 text-center md:pt-24">
        {/* Top Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-bold text-cyan-300 shadow-md backdrop-blur-md">
          <FaBolt className="text-cyan-400 animate-pulse" />
          <span>Next-Generation Neo-Banking Platform</span>
          <span className="hidden sm:inline text-slate-500">•</span>
          <span className="hidden sm:inline text-slate-400">Powered by Real-Time AI</span>
        </div>

        {/* Hero Title */}
        <h1 className="mt-8 text-4xl font-black tracking-tight text-white sm:text-6xl md:text-7xl lg:leading-[1.1]">
          The Intelligent Bank <br />
          <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Built for Modern Finance
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base text-slate-300 sm:text-lg sm:leading-relaxed">
          Take total control of your cash flow with an autonomous <strong>AI Financial Copilot</strong>,
          interactive <strong>3D virtual debit cards</strong>, automated <strong>round-up savings vaults</strong>,
          and zero-fee instant global transfers.
        </p>

        {/* Hero CTA Action Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={handleLaunchDemo}
            disabled={loadingDemo}
            className="flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-600 to-indigo-600 px-7 py-4 text-sm font-extrabold text-white shadow-2xl shadow-cyan-500/30 transition-all duration-300 hover:scale-105 hover:brightness-110 active:scale-95 disabled:opacity-60"
          >
            <FaBolt className="text-base" />
            <span>{loadingDemo ? "Preparing Live Dashboard..." : "Explore Live Demo (1-Click Tour)"}</span>
            <FaArrowRight className="text-xs" />
          </button>

          <Link
            to="/register"
            className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 px-7 py-4 text-sm font-bold text-slate-200 backdrop-blur-md transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
          >
            <span>Create Free Account</span>
          </Link>
        </div>

        {/* Instant Guarantee */}
        <div className="mt-4 flex items-center justify-center gap-6 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <FaCheckCircle className="text-emerald-400" /> No credit card required
          </span>
          <span className="flex items-center gap-1.5">
            <FaCheckCircle className="text-emerald-400" /> Instant activation
          </span>
          <span className="flex items-center gap-1.5">
            <FaCheckCircle className="text-emerald-400" /> ₹50,000 sandbox balance
          </span>
        </div>

        {/* Visual Mockup Showcase Preview */}
        <div className="relative mx-auto mt-16 max-w-5xl">
          <div className="relative overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-900/70 p-4 sm:p-8 shadow-2xl shadow-cyan-500/10 backdrop-blur-2xl">
            {/* Header Mockup */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-rose-500" />
                <div className="h-3 w-3 rounded-full bg-amber-500" />
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
                <span className="ml-2 text-xs font-semibold text-slate-400">
                  NovaPay Live Financial Command Center
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-400">
                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-400" />
                Live Network Active
              </div>
            </div>

            {/* Mockup Grid */}
            <div className="mt-6 grid gap-6 md:grid-cols-12 text-left">
              {/* Virtual Card Snippet */}
              <div className="rounded-2xl border border-slate-700/70 bg-gradient-to-br from-indigo-900/60 via-slate-900/80 to-slate-950/90 p-5 md:col-span-6">
                <div className="flex items-center justify-between text-xs text-indigo-300">
                  <span className="font-bold tracking-widest uppercase">Platinum Neo</span>
                  <FaCreditCard className="text-base text-cyan-400" />
                </div>
                <div className="mt-8 text-xl font-mono tracking-widest text-white">
                  •••• •••• •••• 4892
                </div>
                <div className="mt-6 flex items-end justify-between">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-slate-400">Cardholder</span>
                    <p className="text-xs font-bold text-slate-200">DEMO COMMANDER</p>
                  </div>
                  <div className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                    Active & Protected
                  </div>
                </div>
              </div>

              {/* AI Copilot Snippet */}
              <div className="flex flex-col justify-between rounded-2xl border border-cyan-500/30 bg-slate-950/80 p-5 md:col-span-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                    <FaRobot className="text-cyan-400" />
                    <span>AI Copilot Intelligence</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                    "You're currently spending 34% below your burn rate limit. Based on recurring trends,
                    you can comfortably allocate <strong>₹5,000</strong> to your Emergency Savings Vault today."
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3 text-[11px]">
                  <span className="text-slate-400">Runway Forecast</span>
                  <span className="font-bold text-emerald-400">185+ Days Safe</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Core Pillars Section */}
      <section className="relative z-10 border-t border-slate-800/80 bg-slate-900/40 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">
              Architecture & Features
            </span>
            <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">
              Everything You Need to Master Your Money
            </h2>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Feature 1 */}
            <div className="rounded-3xl border border-slate-700/80 bg-slate-900/80 p-6 shadow-xl backdrop-blur-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20">
                <FaRobot className="text-xl" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-white">AI Financial Copilot</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Natural language financial intelligence grounded in your real transactions. Ask about spending trends,
                burn rates, and savings strategies.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-3xl border border-slate-700/80 bg-slate-900/80 p-6 shadow-xl backdrop-blur-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
                <FaCreditCard className="text-xl" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-white">3D Virtual Neo-Card</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Interactive 3D card controls: instant freeze/unfreeze, auto-masked CVV security timers,
                and customizable daily online spending caps.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-3xl border border-slate-700/80 bg-slate-900/80 p-6 shadow-xl backdrop-blur-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20">
                <FaPiggyBank className="text-xl" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-white">Round-Up Savings Vaults</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Micro-saving on autopilot. Every money transfer automatically rounds up to the nearest ₹50
                and deposits spare change into goal-oriented vaults.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="rounded-3xl border border-slate-700/80 bg-slate-900/80 p-6 shadow-xl backdrop-blur-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
                <FaPaperPlane className="text-xl" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-white">Instant Global Transfers</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Seamless peer-to-peer transfers with atomic PostgreSQL transactions, balance safeguards,
                and zero platform commission fees.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Institutional Security Bar */}
      <section className="relative z-10 border-t border-slate-800/80 bg-slate-950 py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-6 text-center sm:grid-cols-4">
            <div>
              <p className="text-3xl font-black text-cyan-400">256-Bit</p>
              <p className="mt-1 text-xs text-slate-400">Military-Grade SSL</p>
            </div>
            <div>
              <p className="text-3xl font-black text-emerald-400">99.99%</p>
              <p className="mt-1 text-xs text-slate-400">Uptime Reliability</p>
            </div>
            <div>
              <p className="text-3xl font-black text-indigo-400">Zero SQL</p>
              <p className="mt-1 text-xs text-slate-400">Multi-Tenant AI Safety</p>
            </div>
            <div>
              <p className="text-3xl font-black text-amber-400">PCI-DSS</p>
              <p className="mt-1 text-xs text-slate-400">Level 1 Compliant</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Footer Banner */}
      <section className="relative z-10 border-t border-slate-800/80 bg-gradient-to-b from-slate-900/50 to-slate-950 py-16 text-center">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-black text-white sm:text-5xl">
            Ready to Take Control of Your Financial Velocity?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-slate-400">
            Join thousands of users who optimize their daily burn rate and automate their savings with NovaPay.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button
              type="button"
              onClick={handleLaunchDemo}
              disabled={loadingDemo}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-600 to-indigo-600 px-8 py-4 text-sm font-bold text-white shadow-xl shadow-cyan-500/20 transition hover:scale-105 hover:brightness-110 active:scale-95 disabled:opacity-50"
            >
              <FaBolt />
              <span>{loadingDemo ? "Launching..." : "Launch Instant Demo"}</span>
            </button>

            <Link
              to="/register"
              className="rounded-2xl border border-slate-700 bg-slate-800/80 px-8 py-4 text-sm font-bold text-white transition hover:bg-slate-700"
            >
              Sign Up in 30 Seconds
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-8 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} NovaPay Neo-Banking Technologies. All rights reserved.</p>
        <p className="mt-1">Bank-grade security protocols • Real-time AI Financial Intelligence.</p>
      </footer>
    </div>
  );
}
