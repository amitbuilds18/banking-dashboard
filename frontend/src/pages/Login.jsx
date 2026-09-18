import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import API from "../services/api";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const res = await API.post("/auth/login", form);
      const data = res.data;

      if (data.error) {
        setError(data.error || "Login failed");
        showToast(data.error || "Login failed", "error");
        return;
      }

      login(data.token, data.user);
      showToast("Login successful", "success");
      navigate("/");
    } catch (err) {
      console.error("Login Error:", err);
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        (err.message === "Network Error"
          ? "Unable to connect to banking server. Please check your network connection."
          : "Invalid email or password. Please try again.");
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await API.post("/auth/demo");
      const data = res.data;

      if (data.error) {
        setError(data.error || "Demo login failed");
        showToast(data.error || "Demo login failed", "error");
        return;
      }

      login(data.token, data.user);
      showToast("Welcome to NovaPay Demo Tour! 🚀", "success");
      navigate("/");
    } catch (err) {
      console.error("Demo login error:", err);
      const message =
        err.response?.data?.error ||
        "Demo server temporarily busy. Please try again.";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_30%)]" />

      <form
        onSubmit={handleLogin}
        className="relative w-full max-w-md rounded-3xl border border-slate-700/80 bg-slate-900/80 p-8 shadow-2xl shadow-blue-950/30 backdrop-blur-xl"
      >
        <div className="mb-6 flex justify-center">
          <Link
            to="/"
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-600 to-indigo-600 text-2xl font-bold text-white shadow-lg shadow-cyan-500/30 transition hover:scale-105"
            title="NovaPay Home"
          >
            ₹
          </Link>
        </div>

        <div className="mb-6 text-center">
          <h2 className="text-3xl font-bold text-white">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-400">Login to your banking dashboard</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm text-slate-300">Email</label>
            <input
              type="email"
              required
              placeholder="Enter your email"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Password</label>
            <input
              type="password"
              required
              placeholder="Enter your password"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
        </div>

        <button
          disabled={loading}
          className={`mt-6 w-full rounded-xl py-3 font-semibold text-white transition ${
            loading ? "cursor-not-allowed bg-slate-600" : "bg-gradient-to-r from-blue-500 to-cyan-500 hover:brightness-110"
          }`}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {/* Instant One-Click Demo Access */}
        <div className="relative my-5 flex items-center justify-center">
          <div className="w-full border-t border-slate-800" />
          <span className="absolute bg-slate-900 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            or explore
          </span>
        </div>

        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-indigo-500/10 py-3 text-xs font-bold text-cyan-300 shadow-md shadow-cyan-500/10 transition hover:bg-cyan-500/20 hover:text-white active:scale-95"
        >
          <span>⚡ Instant Demo Access (One-Click Tour)</span>
        </button>

        <p className="mt-6 text-center text-sm text-slate-400">
          Don’t have an account?{" "}
          <Link to="/register" className="font-medium text-blue-400 hover:text-blue-300">
            Register
          </Link>
        </p>

        <div className="mt-4 text-center">
          <Link to="/" className="text-xs text-slate-500 hover:text-slate-300 transition">
            ← Back to NovaPay Showcase
          </Link>
        </div>
      </form>
    </div>
  );
}