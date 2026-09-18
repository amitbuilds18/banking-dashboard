import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useEffect, useState } from "react";
import { FaChartPie, FaChartLine, FaLayerGroup } from "react-icons/fa";
import API from "../services/api";

const COLORS = [
  "#38bdf8", // Sky
  "#818cf8", // Indigo
  "#34d399", // Emerald
  "#fbbf24", // Amber
  "#f43f5e", // Rose
  "#a855f7", // Purple
  "#2dd4bf", // Teal
];

// Custom Glassmorphic Tooltip for Recharts
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const item = payload[0];
    const itemName = label || item.name;
    const itemVal = Number(item.value || 0);

    return (
      <div className="rounded-2xl border border-slate-700/90 bg-slate-950/95 p-3.5 shadow-2xl backdrop-blur-xl">
        <p className="text-xs font-semibold text-slate-400">{itemName}</p>
        <p className="mt-1 text-sm font-black text-white">
          ₹{itemVal.toLocaleString("en-IN")}
        </p>
      </div>
    );
  }
  return null;
}

export default function Charts() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      const res = await API.get("/transactions/chart");
      const data = res.data;

      if (data.error) {
        setExpenses([]);
        setError("No chart data available right now.");
        return;
      }

      const formatted = (Array.isArray(data) ? data : []).map((item) => ({
        name: item.name || "General",
        value: Math.abs(Number(item.value || 0)),
      }));

      setExpenses(formatted);
      setError("");
    } catch (err) {
      console.error("Chart load error:", err);
      setExpenses([]);
      setError("Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadData, 0);
    return () => clearTimeout(timer);
  }, []);

  const totalExpense = expenses.reduce((acc, curr) => acc + curr.value, 0);

  if (error && !loading) {
    return (
      <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs font-semibold text-amber-200">
        {error}
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12 mb-6">
      {/* 1. Category Distribution Pie */}
      <div className="rounded-3xl border border-slate-700/80 bg-slate-900/85 p-6 shadow-2xl backdrop-blur-xl lg:col-span-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-md shadow-blue-500/20">
                <FaChartPie className="text-sm" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
                  Portfolio Allocation
                </span>
                <h3 className="text-lg font-bold text-white">Expense Distribution</h3>
              </div>
            </div>

            <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
              {expenses.length} Categories
            </span>
          </div>

          {loading ? (
            <div className="h-64 animate-pulse rounded-2xl bg-slate-800" />
          ) : expenses.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-slate-500">
              <FaLayerGroup className="text-3xl mb-2" />
              <p className="text-xs">No expense transactions recorded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-4">
              <div className="sm:col-span-7 h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenses}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {expenses.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                          stroke="#0f172a"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Category Legend List */}
              <div className="sm:col-span-5 space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-none">
                {expenses.slice(0, 5).map((entry, idx) => {
                  const pct = totalExpense > 0 ? Math.round((entry.value / totalExpense) * 100) : 0;
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 p-2 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        />
                        <span className="truncate text-slate-300">{entry.name}</span>
                      </div>
                      <span className="shrink-0 font-bold text-white">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Tracked Total Outflow</span>
          <span className="font-bold text-white">₹{totalExpense.toLocaleString("en-IN")}</span>
        </div>
      </div>

      {/* 2. Expense Trend Curve */}
      <div className="rounded-3xl border border-slate-700/80 bg-slate-900/85 p-6 shadow-2xl backdrop-blur-xl lg:col-span-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20">
                <FaChartLine className="text-sm" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400">
                  Outflow Velocity
                </span>
                <h3 className="text-lg font-bold text-white">Spending Trajectory</h3>
              </div>
            </div>

            <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-300">
              Curve Analysis
            </span>
          </div>

          {loading ? (
            <div className="h-64 animate-pulse rounded-2xl bg-slate-800" />
          ) : expenses.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-slate-500">
              <FaLayerGroup className="text-3xl mb-2" />
              <p className="text-xs">No trend data available.</p>
            </div>
          ) : (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={expenses} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#334155" strokeDasharray="3 3" opacity={0.4} />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₹${v >= 1000 ? `${v / 1000}k` : v}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#38bdf8"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#expenseGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Trajectory Status</span>
          <span className="font-semibold text-emerald-400">Stable Volatility</span>
        </div>
      </div>
    </div>
  );
}