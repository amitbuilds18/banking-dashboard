import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import NotificationBell from "../components/NotificationBell";
import {
  FaIdCard,
  FaShieldAlt,
  FaCheckCircle,
  FaTimes,
  FaArrowRight,
  FaFingerprint,
  FaLock,
  FaPrint,
  FaAward,
  FaCheck,
  FaExclamationTriangle,
  FaBuilding,
  FaWallet,
} from "react-icons/fa";

const API_BASE = "http://localhost:5000/api";

export default function KycVerification() {
  const { user, token } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [kycData, setKycData] = useState(null);

  // Stepper Form State
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: user?.name || "",
    panNumber: "",
    dob: "1998-05-15",
    aadhaarNumber: "",
    gender: "Male",
    address: "B-42, Sector 62, Noida, Uttar Pradesh, India",
    occupation: "Salaried Professional",
    annualIncome: "₹7.5 Lakh - ₹15 Lakh",
  });

  const [submitting, setSubmitting] = useState(false);
  const [verifyingAnimation, setVerifyingAnimation] = useState(false);
  const [certificateModal, setCertificateModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch Current KYC Status
  const fetchKycStatus = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/kyc/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setKycData(res.data);
      }
    } catch (err) {
      console.error("KYC fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchKycStatus();
    }
  }, [token]);

  // Format Aadhaar in groups of 4
  const handleAadhaarChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 12);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
    setFormData({ ...formData, aadhaarNumber: formatted });
  };

  // Format PAN uppercase
  const handlePanChange = (e) => {
    const raw = e.target.value.toUpperCase().slice(0, 10);
    setFormData({ ...formData, panNumber: raw });
  };

  // Handle Submit KYC
  const handleSubmitKyc = async (e) => {
    e.preventDefault();

    const cleanPan = formData.panNumber.trim().toUpperCase();
    const cleanAadhaar = formData.aadhaarNumber.replace(/\s+/g, "").trim();

    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
      setErrorMessage("Invalid PAN format. Must be 5 letters, 4 numbers, 1 letter (e.g. ABCDE1234F).");
      return;
    }

    if (!/^\d{12}$/.test(cleanAadhaar)) {
      setErrorMessage("Aadhaar number must be exactly 12 numeric digits.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);
      setVerifyingAnimation(true);

      // Simulate DigiLocker API response time
      await new Promise((r) => setTimeout(r, 1800));

      const res = await axios.post(
        `${API_BASE}/kyc/submit`,
        {
          ...formData,
          panNumber: cleanPan,
          aadhaarNumber: cleanAadhaar,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        showToast("🎉 Verified via DigiLocker e-KYC!");
        fetchKycStatus();
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.error || "KYC submission failed.");
    } finally {
      setSubmitting(false);
      setVerifyingAnimation(false);
    }
  };

  const isVerified = Boolean(kycData?.isVerified);

  return (
    <div className="flex min-h-screen bg-slate-950 text-white selection:bg-cyan-500 selection:text-slate-950">
      {/* Sidebar Navigation */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transition-transform duration-200 md:static md:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onClose={() => setMobileMenuOpen(false)} />
      </div>

      {mobileMenuOpen && (
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/80 backdrop-blur-sm md:hidden"
          aria-label="Close mobile menu"
        />
      )}

      {/* Main Canvas */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Header Banner */}
          <header className="relative overflow-hidden rounded-3xl border border-slate-700/70 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950/90 p-6 shadow-2xl backdrop-blur-xl">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="rounded-2xl border border-slate-700 bg-slate-800/80 p-2.5 text-slate-300 transition hover:bg-slate-700 hover:text-white md:hidden"
                  aria-label="Open menu"
                >
                  ☰
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-2xl text-slate-950 shadow-lg shadow-emerald-500/20">
                    <FaIdCard />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400">
                        Government Identity & Compliance
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                          isVerified
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${isVerified ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                        {isVerified ? "Full KYC Verified (DigiLocker Authenticated)" : "Pending KYC (Restricted Tier)"}
                      </span>
                    </div>
                    <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                      Digital KYC & Identity Verification
                    </h1>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Instant RBI-compliant verification via PAN & DigiLocker Aadhaar e-KYC gateway.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                {isVerified && (
                  <button
                    type="button"
                    onClick={() => setCertificateModal(true)}
                    className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:brightness-110 active:scale-95"
                  >
                    <FaPrint />
                    <span>e-KYC Certificate</span>
                  </button>
                )}
                <NotificationBell />
              </div>
            </div>
          </header>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="flex items-center justify-between rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-4 text-emerald-300 shadow-xl backdrop-blur-md animate-fade-in">
              <div className="flex items-center gap-3">
                <FaCheckCircle className="text-xl text-emerald-400" />
                <span className="text-sm font-semibold">{toastMessage}</span>
              </div>
              <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
                <FaTimes />
              </button>
            </div>
          )}

          {/* Tier Comparison Summary Cards */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Restricted Card */}
            <div
              className={`rounded-3xl border p-6 transition backdrop-blur-xl ${
                !isVerified
                  ? "border-amber-500/40 bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-950"
                  : "border-slate-800 bg-slate-900/40 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Basic Tier (Unverified)
                </span>
                {!isVerified && (
                  <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-400">
                    Current Level
                  </span>
                )}
              </div>
              <p className="mt-2 text-xl font-black text-white">Restricted Account</p>
              <ul className="mt-4 space-y-2 text-xs text-slate-400">
                <li className="flex items-center gap-2">
                  <FaTimes className="text-rose-400 text-xs shrink-0" />
                  <span>Transfer limit capped at ₹10,000 / month</span>
                </li>
                <li className="flex items-center gap-2">
                  <FaTimes className="text-rose-400 text-xs shrink-0" />
                  <span>International SWIFT Wire Transfers blocked</span>
                </li>
                <li className="flex items-center gap-2">
                  <FaTimes className="text-rose-400 text-xs shrink-0" />
                  <span>Fixed Deposits capped at ₹25,000</span>
                </li>
                <li className="flex items-center gap-2">
                  <FaTimes className="text-rose-400 text-xs shrink-0" />
                  <span>Pre-approved credit line not eligible</span>
                </li>
              </ul>
            </div>

            {/* Verified Card */}
            <div
              className={`rounded-3xl border p-6 transition backdrop-blur-xl ${
                isVerified
                  ? "border-emerald-500/50 bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-950 shadow-xl shadow-emerald-500/10"
                  : "border-emerald-500/20 bg-slate-900/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Full KYC Tier (Verified)
                </span>
                {isVerified && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                    <FaCheckCircle className="text-xs" /> Active
                  </span>
                )}
              </div>
              <p className="mt-2 text-xl font-black text-white">Full Borderless Privilege</p>
              <ul className="mt-4 space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <FaCheck className="text-emerald-400 text-xs shrink-0" />
                  <span><strong>Unlimited transfers</strong> up to ₹50,00,000 / day</span>
                </li>
                <li className="flex items-center gap-2">
                  <FaCheck className="text-emerald-400 text-xs shrink-0" />
                  <span>Global Forex & 8-Currency Multi-Wallet Unlocked</span>
                </li>
                <li className="flex items-center gap-2">
                  <FaCheck className="text-emerald-400 text-xs shrink-0" />
                  <span>High-yield Fixed Deposits up to ₹50,00,000 at 8.50% p.a.</span>
                </li>
                <li className="flex items-center gap-2">
                  <FaCheck className="text-emerald-400 text-xs shrink-0" />
                  <span>Official Verified Green Tick badge on public profile</span>
                </li>
              </ul>
            </div>
          </div>

          {/* If already verified, show certificate card */}
          {isVerified ? (
            <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950/90 p-8 shadow-2xl backdrop-blur-xl">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-slate-800 pb-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-3xl text-emerald-400">
                    <FaAward />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-black text-white">Identity Fully Verified</h2>
                      <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                        DigiLocker Authenticated
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      Ref ID: <span className="font-mono text-white">{kycData?.record?.verificationRef}</span> • Verified On:{" "}
                      {new Date(kycData?.record?.verifiedAt || Date.now()).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setCertificateModal(true)}
                  className="flex items-center gap-2 rounded-2xl bg-slate-800 border border-slate-700 px-5 py-3 text-xs font-bold text-white hover:bg-slate-700 transition"
                >
                  <FaPrint />
                  <span>View Official Compliance Certificate</span>
                </button>
              </div>

              {/* Verified Details Matrix */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-slate-400 uppercase tracking-wider text-[10px]">Full Legal Name</p>
                  <p className="text-sm font-bold text-white mt-1">{kycData?.record?.fullName}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-slate-400 uppercase tracking-wider text-[10px]">PAN Card (Masked)</p>
                  <p className="font-mono text-sm font-bold text-emerald-400 mt-1">{kycData?.record?.panMasked}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-slate-400 uppercase tracking-wider text-[10px]">Aadhaar (DigiLocker)</p>
                  <p className="font-mono text-sm font-bold text-emerald-400 mt-1">{kycData?.record?.aadhaarMasked}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-slate-400 uppercase tracking-wider text-[10px]">Annual Income Tier</p>
                  <p className="text-sm font-bold text-white mt-1">{kycData?.record?.annualIncome}</p>
                </div>
              </div>
            </div>
          ) : (
            /* KYC Form Stepper */
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
              {/* Stepper Tabs */}
              <div className="flex justify-between items-center border-b border-slate-800 pb-5">
                {[
                  { num: 1, label: "PAN & Identity" },
                  { num: 2, label: "DigiLocker Aadhaar" },
                  { num: 3, label: "Income & Occupation" },
                ].map((s) => (
                  <button
                    key={s.num}
                    type="button"
                    onClick={() => setStep(s.num)}
                    className="flex items-center gap-2 text-xs font-bold transition"
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                        step === s.num
                          ? "bg-cyan-500 text-slate-950"
                          : step > s.num
                          ? "bg-emerald-500 text-slate-950"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {step > s.num ? "✓" : s.num}
                    </span>
                    <span className={step === s.num ? "text-white" : "text-slate-500 hidden sm:inline"}>
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmitKyc} className="mt-6 space-y-5">
                {step === 1 && (
                  <div className="space-y-4 animate-fade-in text-xs">
                    <div>
                      <label className="font-bold uppercase tracking-wider text-slate-400">Full Name as per PAN</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rahul Sharma"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="mt-1 w-full rounded-2xl border border-slate-700 bg-slate-950/80 p-3.5 text-sm font-bold text-white focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-bold uppercase tracking-wider text-slate-400">PAN Card Number</label>
                      <input
                        type="text"
                        maxLength="10"
                        required
                        placeholder="e.g. ABCDE1234F"
                        value={formData.panNumber}
                        onChange={handlePanChange}
                        className="mt-1 w-full rounded-2xl border border-slate-700 bg-slate-950/80 p-3.5 font-mono text-lg font-black tracking-widest text-cyan-300 focus:border-cyan-400 focus:outline-none uppercase"
                      />
                      <p className="mt-1 text-[11px] text-slate-500">10-character alphanumeric tax identifier</p>
                    </div>

                    <div>
                      <label className="font-bold uppercase tracking-wider text-slate-400">Date of Birth</label>
                      <input
                        type="date"
                        required
                        value={formData.dob}
                        onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                        className="mt-1 w-full rounded-2xl border border-slate-700 bg-slate-950/80 p-3.5 font-mono text-sm text-white focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    <div className="pt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="flex items-center gap-2 rounded-2xl bg-cyan-500 px-6 py-3 font-bold text-slate-950 hover:bg-cyan-400"
                      >
                        <span>Next: Aadhaar e-KYC</span>
                        <FaArrowRight />
                      </button>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4 animate-fade-in text-xs">
                    <div>
                      <label className="font-bold uppercase tracking-wider text-slate-400">12-Digit Aadhaar Number</label>
                      <input
                        type="text"
                        maxLength="14"
                        required
                        placeholder="1234 5678 9012"
                        value={formData.aadhaarNumber}
                        onChange={handleAadhaarChange}
                        className="mt-1 w-full rounded-2xl border border-slate-700 bg-slate-950/80 p-3.5 font-mono text-lg font-black tracking-widest text-cyan-300 focus:border-cyan-400 focus:outline-none"
                      />
                      <p className="mt-1 text-[11px] text-slate-500">Encrypted transmission via UIDAI DigiLocker</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold uppercase tracking-wider text-slate-400">Gender</label>
                        <select
                          value={formData.gender}
                          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                          className="mt-1 w-full rounded-2xl border border-slate-700 bg-slate-950/80 p-3 font-semibold text-white focus:border-cyan-400 focus:outline-none"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="font-bold uppercase tracking-wider text-slate-400">State / Region</label>
                        <input
                          type="text"
                          value="Delhi NCR, India"
                          readOnly
                          className="mt-1 w-full rounded-2xl border border-slate-700 bg-slate-950/60 p-3 text-slate-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold uppercase tracking-wider text-slate-400">Residential Address</label>
                      <textarea
                        rows="2"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="mt-1 w-full rounded-2xl border border-slate-700 bg-slate-950/80 p-3 text-xs text-white focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    <div className="pt-4 flex justify-between">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="rounded-2xl border border-slate-700 bg-slate-800 px-5 py-3 font-bold text-slate-300 hover:bg-slate-700"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep(3)}
                        className="flex items-center gap-2 rounded-2xl bg-cyan-500 px-6 py-3 font-bold text-slate-950 hover:bg-cyan-400"
                      >
                        <span>Next: Occupation</span>
                        <FaArrowRight />
                      </button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4 animate-fade-in text-xs">
                    <div>
                      <label className="font-bold uppercase tracking-wider text-slate-400">Occupation / Employment</label>
                      <select
                        value={formData.occupation}
                        onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                        className="mt-1 w-full rounded-2xl border border-slate-700 bg-slate-950/80 p-3.5 font-semibold text-white focus:border-cyan-400 focus:outline-none"
                      >
                        <option value="Salaried Professional">Salaried Professional</option>
                        <option value="Business Owner / Self Employed">Business Owner / Self Employed</option>
                        <option value="Freelancer / Consultant">Freelancer / Consultant</option>
                        <option value="Student">Student</option>
                        <option value="Homemaker">Homemaker</option>
                        <option value="Retired">Retired</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold uppercase tracking-wider text-slate-400">Annual Income Slab</label>
                      <select
                        value={formData.annualIncome}
                        onChange={(e) => setFormData({ ...formData, annualIncome: e.target.value })}
                        className="mt-1 w-full rounded-2xl border border-slate-700 bg-slate-950/80 p-3.5 font-semibold text-white focus:border-cyan-400 focus:outline-none"
                      >
                        <option value="Below ₹3 Lakh">Below ₹3 Lakh</option>
                        <option value="₹3 Lakh - ₹7.5 Lakh">₹3 Lakh - ₹7.5 Lakh</option>
                        <option value="₹7.5 Lakh - ₹15 Lakh">₹7.5 Lakh - ₹15 Lakh</option>
                        <option value="₹15 Lakh - ₹25 Lakh">₹15 Lakh - ₹25 Lakh</option>
                        <option value="₹25 Lakh+">₹25 Lakh+ (HNW)</option>
                      </select>
                    </div>

                    {/* Consent checkbox */}
                    <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 flex items-start gap-3">
                      <input
                        type="checkbox"
                        required
                        defaultChecked
                        id="consent"
                        className="mt-0.5 accent-cyan-400"
                      />
                      <label htmlFor="consent" className="text-[11px] text-slate-300 leading-relaxed">
                        I hereby authorize NovaPay to fetch my digital demographic and biometric verification records via DigiLocker and UIDAI for RBI e-KYC compliance.
                      </label>
                    </div>

                    {errorMessage && (
                      <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs font-semibold text-rose-300">
                        {errorMessage}
                      </div>
                    )}

                    <div className="pt-4 flex justify-between">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="rounded-2xl border border-slate-700 bg-slate-800 px-5 py-3 font-bold text-slate-300 hover:bg-slate-700"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-3.5 font-black text-slate-950 shadow-xl shadow-emerald-500/20 hover:brightness-110 active:scale-95 disabled:opacity-50"
                      >
                        <span>{submitting ? "Verifying with DigiLocker..." : "Complete DigiLocker e-KYC"}</span>
                        <FaFingerprint />
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Official Certificate Modal */}
      {certificateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-emerald-500/40 bg-slate-900 p-8 shadow-2xl">
            <button
              onClick={() => setCertificateModal(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-white"
            >
              <FaTimes className="text-lg" />
            </button>

            <div className="text-center border-b border-slate-800 pb-5">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-2xl text-emerald-400">
                <FaShieldAlt />
              </div>
              <h3 className="mt-3 text-xl font-black uppercase tracking-wider text-white">
                DigiLocker e-KYC Compliance Certificate
              </h3>
              <p className="text-xs text-slate-400">Reserve Bank of India (RBI) KYC Master Direction 2016</p>
            </div>

            <div className="mt-6 space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Certificate Reference ID:</span>
                <span className="font-mono font-bold text-white">{kycData?.record?.verificationRef}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Account Holder Legal Name:</span>
                <span className="font-bold text-white">{kycData?.record?.fullName || user?.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">PAN Verification:</span>
                <span className="font-mono font-bold text-emerald-400">AUTHENTICATED ({kycData?.record?.panMasked})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Aadhaar DigiLocker XML:</span>
                <span className="font-mono font-bold text-emerald-400">AUTHENTICATED ({kycData?.record?.aadhaarMasked})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Compliance Authority:</span>
                <span className="text-slate-300">UIDAI / NSDL via NovaPay DigiLocker Gateway</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Verification Timestamp:</span>
                <span className="text-slate-200">{new Date(kycData?.record?.verifiedAt || Date.now()).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Account Status:</span>
                <span className="font-bold uppercase text-emerald-400">FULL PRIVILEGE UNRESTRICTED</span>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full rounded-xl bg-emerald-500 py-3 text-xs font-bold text-slate-950 hover:bg-emerald-400"
              >
                Print Certificate Sheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
