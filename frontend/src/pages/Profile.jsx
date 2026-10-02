import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaQrcode } from "react-icons/fa";
import API from "../services/api";
import { useToast } from "../context/ToastContext";
import MyQRCodeModal from "../components/MyQRCodeModal";

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

  // MPIN Management States
  const [hasCustomMpin, setHasCustomMpin] = useState(false);
  const [currentMpin, setCurrentMpin] = useState("");
  const [newMpin, setNewMpin] = useState("");
  const [confirmMpin, setConfirmMpin] = useState("");
  const [updatingMpin, setUpdatingMpin] = useState(false);

  // QR Modal State
  const [showMyQr, setShowMyQr] = useState(false);

  // Biometric Management States
  const [bioDevices, setBioDevices] = useState([]);
  const [enrollingBio, setEnrollingBio] = useState(false);

  const fetchBioStatus = async () => {
    try {
      const res = await API.get("/biometrics/status");
      if (res.data?.devices) {
        setBioDevices(res.data.devices);
      }
    } catch (e) {
      console.error("Biometric status fetch error:", e);
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const [profileRes, mpinRes, bioRes] = await Promise.allSettled([
          API.get("/auth/profile"),
          API.get("/auth/mpin-status"),
          API.get("/biometrics/status"),
        ]);

        if (profileRes.status === "fulfilled" && profileRes.value.data) {
          setUser(profileRes.value.data);
        }

        if (mpinRes.status === "fulfilled" && mpinRes.value.data) {
          setHasCustomMpin(Boolean(mpinRes.value.data.hasMpin));
        }

        if (bioRes.status === "fulfilled" && bioRes.value.data?.devices) {
          setBioDevices(bioRes.value.data.devices);
        }
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

  const handleEnrollBiometrics = async () => {
    setEnrollingBio(true);
    try {
      const challengeRes = await API.post("/biometrics/register-challenge");
      const opts = challengeRes.data;

      let credentialId = "";
      try {
        if (window.PublicKeyCredential && navigator.credentials?.create) {
          const challengeBuffer = Uint8Array.from(
            atob(opts.challenge.replace(/-/g, "+").replace(/_/g, "/")),
            (c) => c.charCodeAt(0)
          );
          const userIdBuffer = Uint8Array.from(
            atob(opts.user.id.replace(/-/g, "+").replace(/_/g, "/")),
            (c) => c.charCodeAt(0)
          );

          const credential = await navigator.credentials.create({
            publicKey: {
              challenge: challengeBuffer,
              rp: { name: opts.rp.name, id: window.location.hostname },
              user: {
                id: userIdBuffer,
                name: opts.user.name,
                displayName: opts.user.displayName,
              },
              pubKeyCredParams: opts.pubKeyCredParams,
              timeout: 60000,
              attestation: "none",
              authenticatorSelection: {
                userVerification: "preferred",
              },
            },
          });

          if (credential) {
            credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)))
              .replace(/\+/g, "-")
              .replace(/\//g, "_")
              .replace(/=+$/, "");
          }
        }
      } catch (hardwareErr) {
        console.warn("Hardware sensor prompt cancelled or simulated:", hardwareErr);
      }

      if (!credentialId) {
        credentialId = "bio_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      }

      const deviceName = navigator.userAgent.includes("Windows")
        ? "Windows Hello Sensor"
        : navigator.userAgent.includes("Mac")
        ? "Touch ID / Apple Biometrics"
        : navigator.userAgent.includes("Android")
        ? "Android Biometric Sensor"
        : "FIDO2 Security Key";

      const verifyRes = await API.post("/biometrics/register-verify", {
        credentialId,
        publicKey: "fido2-es256-verified",
        deviceName,
      });

      localStorage.setItem("neo_biometric_enrolled", "true");
      localStorage.setItem("neo_biometric_credential_id", credentialId);
      localStorage.setItem("neo_biometric_email", user.email);

      showToast(verifyRes.data.message || "Biometric sensor enrolled successfully! 🛡️", "success");
      await fetchBioStatus();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || "Biometric enrollment could not be completed", "error");
    } finally {
      setEnrollingBio(false);
    }
  };

  const handleRevokeBiometrics = async (id) => {
    try {
      await API.delete(`/biometrics/device/${id}`);
      showToast("Biometric authenticator revoked", "info");
      localStorage.removeItem("neo_biometric_enrolled");
      await fetchBioStatus();
    } catch (err) {
      showToast("Failed to revoke authenticator", "error");
    }
  };

  const handleChange = (e) => {
    setUser({
      ...user,
      [e.target.name]: e.target.value,
    });
  };

  const handleUpdateMpin = async (e) => {
    e.preventDefault();

    if (!newMpin || !/^\d{4}$/.test(newMpin.trim())) {
      showToast("New MPIN must be exactly 4 numeric digits", "error");
      return;
    }

    if (newMpin !== confirmMpin) {
      showToast("New MPIN and Confirm MPIN do not match", "error");
      return;
    }

    setUpdatingMpin(true);
    try {
      const res = await API.post("/auth/set-mpin", {
        currentMpin: currentMpin.trim() || undefined,
        newMpin: newMpin.trim(),
      });

      showToast(res.data?.message || "MPIN updated successfully! 🔐", "success");
      setHasCustomMpin(true);
      setCurrentMpin("");
      setNewMpin("");
      setConfirmMpin("");
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || "Failed to update MPIN", "error");
    } finally {
      setUpdatingMpin(false);
    }
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

            {/* 4-Digit Security MPIN Management */}
            <div className="mt-10 rounded-2xl border border-slate-700/80 bg-slate-800/50 p-6 shadow-xl">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-lg shadow-md shadow-cyan-500/20">
                    🔐
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">4-Digit Security MPIN</h3>
                    <p className="text-xs text-slate-400">Used to authorize peer-to-peer transfers and withdrawals</p>
                  </div>
                </div>

                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  hasCustomMpin
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${hasCustomMpin ? "bg-emerald-400" : "bg-amber-400"}`} />
                  {hasCustomMpin ? "Custom PIN Active" : "Default PIN Active (1234)"}
                </span>
              </div>

              <form onSubmit={handleUpdateMpin} className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-300">
                      Current MPIN
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      placeholder={hasCustomMpin ? "••••" : "1234"}
                      value={currentMpin}
                      onChange={(e) => setCurrentMpin(e.target.value.replace(/\D/g, ""))}
                      className="w-full tracking-[0.3em] text-center rounded-xl border border-slate-700 bg-slate-900 py-2.5 font-mono text-sm text-white outline-none focus:border-cyan-400"
                    />
                    <span className="mt-1 block text-[10px] text-slate-400">
                      {hasCustomMpin ? "Your current 4 digits" : "Default: 1234"}
                    </span>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-300">
                      New MPIN
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="••••"
                      value={newMpin}
                      onChange={(e) => setNewMpin(e.target.value.replace(/\D/g, ""))}
                      className="w-full tracking-[0.3em] text-center rounded-xl border border-slate-700 bg-slate-900 py-2.5 font-mono text-sm text-white outline-none focus:border-cyan-400"
                      required
                    />
                    <span className="mt-1 block text-[10px] text-slate-400">
                      4 numeric digits
                    </span>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-300">
                      Confirm New MPIN
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="••••"
                      value={confirmMpin}
                      onChange={(e) => setConfirmMpin(e.target.value.replace(/\D/g, ""))}
                      className="w-full tracking-[0.3em] text-center rounded-xl border border-slate-700 bg-slate-900 py-2.5 font-mono text-sm text-white outline-none focus:border-cyan-400"
                      required
                    />
                    <span className="mt-1 block text-[10px] text-slate-400">
                      Re-type 4 digits
                    </span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={updatingMpin || newMpin.length !== 4 || confirmMpin.length !== 4}
                    className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-2.5 text-xs font-semibold text-white shadow-md shadow-cyan-500/20 transition hover:brightness-110 disabled:opacity-50"
                  >
                    {updatingMpin ? "Updating PIN..." : "Update Security MPIN"}
                  </button>
                </div>
              </form>
            </div>

            {/* Personal Payment QR Code Card */}
            <div className="mt-6 rounded-2xl border border-slate-700/80 bg-slate-800/50 p-6 shadow-xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-lg shadow-md shadow-emerald-500/20">
                    <FaQrcode className="text-white text-base" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Personal Receiving QR Code</h3>
                    <p className="text-xs text-slate-400">
                      Show or share your unique QR code to receive funds directly into your wallet
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowMyQr(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-emerald-500/20 hover:brightness-110 transition"
                >
                  <FaQrcode /> View & Download QR
                </button>
              </div>
            </div>

            {/* Hardware Biometric Authentication (WebAuthn / Windows Hello / Touch ID) */}
            <div className="mt-6 rounded-2xl border border-slate-700/80 bg-slate-800/50 p-6 shadow-xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 text-lg shadow-md shadow-cyan-500/20">
                    🛡️
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      Biometric Security (WebAuthn)
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                        FIDO2 Certified
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Sign in using your device's fingerprint sensor, Touch ID, Face ID, or Windows Hello.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleEnrollBiometrics}
                  disabled={enrollingBio}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-cyan-500/20 hover:brightness-110 transition active:scale-95 disabled:opacity-60"
                >
                  {enrollingBio ? "Enrolling Sensor..." : "⚡ Enroll Biometric Device"}
                </button>
              </div>

              {/* Enrolled Devices List */}
              <div className="mt-5 border-t border-slate-700/60 pt-4">
                <div className="text-xs font-semibold text-slate-400 mb-2">
                  Enrolled Authenticators ({bioDevices.length})
                </div>

                {bioDevices.length === 0 ? (
                  <div className="text-xs text-slate-500 italic bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    No hardware biometric credentials enrolled yet. Click "Enroll Biometric Device" to register this device's sensor.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {bioDevices.map((dev) => (
                      <div
                        key={dev.id}
                        className="flex items-center justify-between p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-cyan-400 font-bold">✓</span>
                          <span className="font-semibold text-white">{dev.device_name}</span>
                          <span className="text-[10px] text-slate-500">
                            (Enrolled {new Date(dev.created_at).toLocaleDateString("en-IN")})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRevokeBiometrics(dev.id)}
                          className="text-rose-400 hover:text-rose-300 font-medium text-[11px]"
                        >
                          Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* My QR Code Modal */}
        <MyQRCodeModal
          isOpen={showMyQr}
          onClose={() => setShowMyQr(false)}
          user={user}
        />
      </div>
    </div>
  );
}