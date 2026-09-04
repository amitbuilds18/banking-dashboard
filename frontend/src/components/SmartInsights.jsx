import { useEffect, useState } from "react";
import API from "../services/api";
import { FaShieldAlt, FaFire, FaHourglassHalf, FaLightbulb, FaExclamationTriangle } from "react-icons/fa";

export default function SmartInsights() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const res = await API.get("/transactions/insights");
        setInsights(res.data);
      } catch (err) {
        console.error("Error loading insights:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, []);

  if (loading) {
    return <div className="h-44 animate-pulse rounded-3xl border border-slate-800 bg-slate-900/60 p-6" />;
  }

  if (!insights) return null;

  return (
    <div className="rounded-3xl border border-slate-700/80 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-lg text-white shadow-md shadow-indigo-500/20">
            ⚡
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">
              Financial Co-Pilot
            </span>
            <h3 className="text-xl font-bold text-white">Smart Intelligence & Risk Guard</h3>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-300">
          <FaShieldAlt /> Health: {insights.healthGrade}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {/* Metric 1: Runway */}
        <div className="rounded-2xl border border-slate-700/70 bg-slate-800/60 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Cash Runway</span>
            <FaHourglassHalf className="text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            {insights.runwayDays >= 365 ? "365+ Days" : `${insights.runwayDays} Days`}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Estimated longevity at current spending rate
          </p>
        </div>

        {/* Metric 2: Daily Burn Rate */}
        <div className="rounded-2xl border border-slate-700/70 bg-slate-800/60 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Daily Burn Rate</span>
            <FaFire className="text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            ₹{Number(insights.dailyBurnRate).toLocaleString("en-IN")}
            <span className="text-xs font-normal text-slate-400"> /day</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Average daily outflow this month</p>
        </div>

        {/* Metric 3: Financial Health Score */}
        <div className="rounded-2xl border border-slate-700/70 bg-slate-800/60 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Fintech Health Score</span>
            <FaShieldAlt className="text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            {insights.healthScore}
            <span className="text-xs font-normal text-slate-400"> / 100</span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-700">
            <div
              className={`h-1.5 rounded-full ${
                insights.healthScore >= 80
                  ? "bg-emerald-400"
                  : insights.healthScore >= 60
                  ? "bg-amber-400"
                  : "bg-red-400"
              }`}
              style={{ width: `${insights.healthScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* AI Advice Note */}
      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-3.5 text-xs text-blue-200">
        <FaLightbulb className="mt-0.5 shrink-0 text-base text-blue-300" />
        <div className="leading-relaxed">
          <span className="font-semibold text-white">Algorithmic Advice: </span>
          {insights.smartAdvice}
        </div>
      </div>

      {/* Anomaly Alerts if any */}
      {insights.anomalies && insights.anomalies.length > 0 && (
        <div className="mt-3 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200">
          <FaExclamationTriangle className="mt-0.5 shrink-0 text-base text-amber-300" />
          <div>
            <span className="font-semibold text-white">Anomaly Warning: </span>
            Large transaction detected: "{insights.anomalies[0].name}" for ₹
            {Number(insights.anomalies[0].amount).toLocaleString("en-IN")}. Verified and monitored.
          </div>
        </div>
      )}
    </div>
  );
}
