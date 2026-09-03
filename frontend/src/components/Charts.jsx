import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import { useEffect, useState } from "react";
import API from "../services/api";

export default function Charts() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const COLORS = [
    "#22c55e",
    "#ef4444",
    "#3b82f6",
    "#f59e0b",
    "#8b5cf6",
    "#14b8a6",
  ];

  const loadData = async () => {
    try {
      const res = await API.get("/transactions/chart");
      const data = res.data;

      if (data.error) {
        setExpenses([]);
        setError("No chart data available right now.");
        return;
      }

      const formatted = data.map((item) => ({
        name: item.name,
        value: Math.abs(Number(item.value)),
      }));

      setExpenses(formatted);
      setError("");
    } catch (err) {
      console.error(err);
      setExpenses([]);
      setError("Unable to load chart data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialLoad = setTimeout(loadData, 0);

    return () => clearTimeout(initialLoad);
  }, []);

  if (error && !loading) {
    return (
      <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-200">
        {error}
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6 mb-6">
      <div className="bg-gray-800 rounded-xl p-5 shadow-lg">
        <h2 className="text-xl font-bold mb-5">Expense Distribution</h2>

        {loading ? (
          <div className="h-64 bg-gray-700 rounded animate-pulse"></div>
        ) : expenses.length === 0 ? (
          <div className="text-center text-gray-400 py-20">No Expense Data</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={expenses} dataKey="value" nameKey="name" outerRadius={100} label>
                {expenses.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-gray-800 rounded-xl p-5 shadow-lg">
        <h2 className="text-xl font-bold mb-5">Expense Trend</h2>

        {loading ? (
          <div className="h-64 bg-gray-700 rounded animate-pulse"></div>
        ) : expenses.length === 0 ? (
          <div className="text-center text-gray-400 py-20">No Trend Data</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={expenses}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}