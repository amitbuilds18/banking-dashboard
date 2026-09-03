import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import API from "../services/api";

export default function Register() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();

    if (!name || !email || !form.password) {
      const message = "Name, email and password are required";
      setError(message);
      showToast(message, "error");
      return;
    }

    if (!email.includes("@") || form.password.length < 8) {
      const message = "Enter a valid email and use a password of at least 8 characters";
      setError(message);
      showToast(message, "error");
      return;
    }

    setLoading(true);

    try {
      const res = await API.post("/auth/register", {
        name,
        email,
        password: form.password,
      });
      const data = res.data;

      if (data.error) {
        setError(data.error);
        showToast(data.error, "error");
        return;
      }

      showToast("Account created successfully", "success");
      navigate("/login");
    } catch (err) {
      console.error(err);
      const message = err.response?.data?.error || "Unable to create account";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_30%)]" />

      <form
        onSubmit={handleRegister}
        className="relative w-full max-w-md rounded-3xl border border-slate-700/80 bg-slate-900/80 p-8 shadow-2xl shadow-emerald-950/30 backdrop-blur-xl"
      >
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-green-400 text-2xl font-bold text-white shadow-lg shadow-emerald-500/30">
            ✓
          </div>
        </div>

        <div className="mb-6 text-center">
          <h2 className="text-3xl font-bold text-white">Create account</h2>
          <p className="mt-2 text-sm text-slate-400">Open your secure banking account</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm text-slate-300">Full Name</label>
            <input
              type="text"
              placeholder="Full Name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Email</label>
            <input
              type="email"
              placeholder="Email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Password</label>
            <input
              type="password"
              placeholder="Password"
              minLength={8}
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
        </div>

        <button
          disabled={loading}
          className={`mt-6 w-full rounded-xl py-3 font-semibold text-white transition ${
            loading ? "cursor-not-allowed bg-slate-600" : "bg-linear-to-r from-emerald-500 to-green-500 hover:brightness-110"
          }`}
        >
          {loading ? "Creating account..." : "Register"}
        </button>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-emerald-400 hover:text-emerald-300">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}