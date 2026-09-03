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
  });

  const [loading, setLoading] = useState(true);

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

    const initialLoad = setTimeout(loadProfile, 0);

    return () => clearTimeout(initialLoad);
  }, [navigate, showToast]);

  const handleChange = (e) => {
    setUser({
      ...user,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-700/80 bg-slate-900/80 p-8 shadow-2xl shadow-emerald-950/30 backdrop-blur-xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-linear-to-br from-emerald-500 to-green-400 text-4xl shadow-lg shadow-emerald-500/30">
            👤
          </div>
          <h2 className="text-3xl font-bold text-white">My Profile</h2>
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
                <label className="mb-2 block text-sm text-slate-300">Name</label>
                <input
                  type="text"
                  name="name"
                  value={user.name}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">Email</label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full cursor-not-allowed rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">Wallet Balance</label>
                <div className="rounded-2xl bg-linear-to-r from-emerald-500 to-green-500 p-5 text-3xl font-bold text-white">
                  ₹ {Number(user.balance).toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            <button className="mt-8 w-full rounded-xl bg-linear-to-r from-emerald-500 to-green-500 py-3 font-semibold text-white transition hover:brightness-110">
              Save Changes
            </button>
          </>
        )}
      </div>
    </div>
  );
}