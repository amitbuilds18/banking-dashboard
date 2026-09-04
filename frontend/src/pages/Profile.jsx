import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { useToast } from "../context/ToastContext";

export default function Profile() {
  const navigate = useNavigate(); 
  const { showToast } = useToast();
  const [user, setUser] = useState({
    name: "",
    email: "",
    balance: 0,
    phone: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const res = await API.get("/auth/profile");
        setUser(res.data);
      } catch (err) {
        console.error(err);
        showToast("Unable to load profile", "error");
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [navigate, showToast]);

  const handleChange = (e) => {
    setUser({
      ...user,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async () => {
    if (!user.name?.trim()) {
      showToast("Name cannot be empty", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await API.put("/auth/profile", {
        name: user.name,
        phone: user.phone,
      });

      showToast("Profile updated successfully! ✨", "success");
      // Update cached user in localStorage if present
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        localStorage.setItem("user", JSON.stringify({ ...parsed, name: user.name }));
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || "Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-700/80 bg-slate-900/80 p-8 shadow-2xl shadow-emerald-950/30 backdrop-blur-xl">
        <button
          onClick={() => navigate("/")}
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white"
        >
          ← Back to Dashboard
        </button>

        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-400 text-4xl shadow-lg shadow-emerald-500/30">
            👤
          </div>
          <h2 className="text-3xl font-bold text-white">My Profile & Security</h2>
          <p className="mt-1 text-xs text-slate-400">Manage account information & verified identity</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="h-12 animate-pulse rounded-xl bg-slate-700" />
            <div className="h-12 animate-pulse rounded-xl bg-slate-700" />
            <div className="h-20 animate-pulse rounded-xl bg-slate-700" />
          </div>
        ) : (
          <>
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm text-slate-300">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={user.name}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">Email Address (Immutable)</label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full cursor-not-allowed rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">Phone Number (Optional)</label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="+91 98765 43210"
                  value={user.phone || ""}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">Verified Wallet Balance</label>
                <div className="rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 p-5 text-3xl font-bold text-white shadow-lg shadow-emerald-500/20">
                  ₹ {Number(user.balance).toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-8 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 py-3 font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:brightness-110 disabled:opacity-60"
            >
              {saving ? "Saving Changes..." : "Save Changes"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}