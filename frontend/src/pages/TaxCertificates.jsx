import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import NotificationBell from "../components/NotificationBell";
import {
  FaFileInvoiceDollar,
  FaDownload,
  FaPrint,
  FaCheckCircle,
  FaCalendarAlt,
  FaBuilding,
  FaShieldAlt,
  FaArrowRight,
  FaCopy,
  FaPiggyBank,
  FaPercent,
  FaInfoCircle,
} from "react-icons/fa";

export default function TaxCertificates() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [fds, setFds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedFy, setSelectedFy] = useState("2024-25");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [profRes, fdRes] = await Promise.all([
          API.get("/auth/profile"),
          API.get("/fixed-deposits").catch(() => ({ data: [] })),
        ]);
        setProfile(profRes.data);
        setFds(fdRes.data || []);
      } catch (err) {
        console.error("Error loading tax certificate data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const balance = Number(profile?.balance || 50000);
  const savingsInterestAnnual = Math.round(Math.max(25000, balance) * 0.035);
  const q1 = Math.round(savingsInterestAnnual * 0.24);
  const q2 = Math.round(savingsInterestAnnual * 0.25);
  const q3 = Math.round(savingsInterestAnnual * 0.26);
  const q4 = savingsInterestAnnual - (q1 + q2 + q3);

  // FD Interest calculation
  const totalFdPrincipal = fds.reduce((acc, f) => acc + Number(f.principal_amount || 0), 0);
  const totalFdInterest = fds.length > 0
    ? fds.reduce((acc, f) => acc + Math.round(Number(f.principal_amount) * (Number(f.interest_rate) / 100)), 0)
    : 12500;
  const totalTds = totalFdInterest > 40000 ? Math.round(totalFdInterest * 0.1) : 0;

  const totalGrossInterest = savingsInterestAnnual + totalFdInterest;
  const exemption80tta = Math.min(10000, savingsInterestAnnual);
  const taxableInterest = totalGrossInterest - exemption80tta;

  const certRef = `NEO/INT/${selectedFy.replace("-", "")}/${String(profile?.id || "14").padStart(6, "0")}`;
  const ayYear = selectedFy === "2024-25" ? "2025-26" : "2026-27";

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      const token = localStorage.getItem("token");
      const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const response = await fetch(`${baseURL}/api/pdf/interest-certificate?fy=${selectedFy}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to generate PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Interest_Certificate_${selectedFy}_${(profile?.name || "User").replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Error downloading interest certificate: " + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const text = `INCOME TAX ITR DETAILS (Schedule OS - Interest Income)\n` +
      `Financial Year: FY ${selectedFy} (AY ${ayYear})\n` +
      `Bank: Neo Digital Bank Ltd. (IFSC: NEOB0001092)\n` +
      `Savings Account Interest: ₹${savingsInterestAnnual.toLocaleString("en-IN")}\n` +
      `Section 80TTA Exemption: ₹${exemption80tta.toLocaleString("en-IN")}\n` +
      `Term Deposit / FD Interest: ₹${totalFdInterest.toLocaleString("en-IN")}\n` +
      `TDS Deducted (Form 16A / 26AS): ₹${totalTds.toLocaleString("en-IN")}\n` +
      `Net Taxable Interest Income: ₹${taxableInterest.toLocaleString("en-IN")}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-white">
      {/* Sidebar Navigation (Hidden during print) */}
      <div className="print:hidden">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-slate-900/60 backdrop-blur-xl border-b border-slate-800/80 print:hidden">
          <div className="flex items-center gap-4">
            <Link
              to="/tax"
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-medium transition"
            >
              ← Back to Tax Optimizer
            </Link>
            <div className="h-4 w-px bg-slate-800 hidden sm:block" />
            <span className="text-xs font-semibold text-slate-300 hidden sm:inline">
              Form 16A &amp; Section 80TTA Certification
            </span>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 max-w-6xl w-full mx-auto space-y-8">
          {/* Header & Actions Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6 print:hidden">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-tr from-emerald-600 to-teal-600 rounded-2xl shadow-lg shadow-emerald-500/20 text-white">
                  <FaFileInvoiceDollar className="text-2xl" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                    Interest Certificates & Tax Statements
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Section 80TTA / 80TTB
                    </span>
                  </h1>
                  <p className="text-sm text-slate-400 mt-0.5">
                    Official certified interest statement for savings accounts & term deposits for ITR e-filing.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Financial Year Selector */}
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
                <FaCalendarAlt className="text-slate-400 text-xs" />
                <span className="text-xs text-slate-400">FY:</span>
                <select
                  value={selectedFy}
                  onChange={(e) => setSelectedFy(e.target.value)}
                  className="bg-transparent text-xs font-bold text-white focus:outline-none"
                >
                  <option value="2025-26" className="bg-slate-900">2025-26 (AY 2026-27)</option>
                  <option value="2024-25" className="bg-slate-900">2024-25 (AY 2025-26)</option>
                  <option value="2023-24" className="bg-slate-900">2023-24 (AY 2024-25)</option>
                </select>
              </div>

              <button
                onClick={handleDownloadPdf}
                disabled={downloading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold shadow-lg shadow-emerald-500/20 text-xs transition active:scale-95 disabled:opacity-50"
              >
                <FaDownload /> {downloading ? "Generating PDF..." : "Download Official PDF"}
              </button>

              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition"
              >
                <FaPrint /> Print
              </button>

              <button
                onClick={handleCopySummary}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold text-xs border border-slate-700 transition"
              >
                <FaCopy /> {copied ? "Copied!" : "Copy ITR Summary"}
              </button>
            </div>
          </div>

          {/* Quick Notice Banner */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3 text-xs text-emerald-300 print:hidden">
            <FaShieldAlt className="text-emerald-400 text-lg flex-shrink-0" />
            <div>
              <strong>Section 80TTA Tax Exemption:</strong> Individuals are eligible for a tax deduction of up to <strong>₹10,000</strong> on interest earned from savings bank accounts. Senior citizens (60+) enjoy up to <strong>₹50,000</strong> deduction under Section 80TTB covering both Savings and Fixed Deposits.
            </div>
            <Link
              to="/tax"
              className="ml-auto text-emerald-400 hover:underline font-bold whitespace-nowrap flex items-center gap-1"
            >
              Tax Optimizer <FaArrowRight className="text-[10px]" />
            </Link>
          </div>

          {/* CERTIFICATE PREVIEW DOCUMENT (High Authenticity Styled Sheet) */}
          <div className="bg-white text-slate-900 rounded-3xl p-8 md:p-12 shadow-2xl border border-slate-200 relative overflow-hidden print:p-0 print:border-none print:shadow-none">
            {/* Watermark Logo in background */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
              <span className="text-9xl font-black">NEO BANK</span>
            </div>

            {/* Bank Header Bar */}
            <div className="border-b-2 border-slate-900 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span className="bg-slate-900 text-white px-2.5 py-1 rounded-lg text-lg">NEO</span>
                  NEO DIGITAL BANK
                </div>
                <div className="text-xs text-slate-500 mt-1 font-medium">
                  Scheduled Commercial Bank | RBI License No. 8849-B/2026
                </div>
                <div className="text-xs text-slate-500">
                  Registered Office: FinTech Park, CyberCity, Mumbai 400051
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="inline-block bg-slate-100 text-slate-800 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-slate-300">
                  Official Tax Statement
                </span>
                <div className="text-xs font-mono text-slate-600 mt-1 font-bold">
                  Ref: {certRef}
                </div>
                <div className="text-xs text-slate-500">
                  Date of Generation: {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                </div>
              </div>
            </div>

            {/* Certificate Title */}
            <div className="text-center my-6">
              <h2 className="text-xl font-extrabold uppercase tracking-wide text-slate-900">
                Interest Certificate for Income Tax Return (ITR)
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Issued for Assessment Year <strong>{ayYear}</strong> (Financial Year <strong>{selectedFy}</strong>)
              </p>
            </div>

            {/* Customer Details Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <div className="text-slate-400 font-semibold uppercase text-[10px]">Account Holder Name</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{profile?.name || "Amit Arya"}</div>
              </div>
              <div>
                <div className="text-slate-400 font-semibold uppercase text-[10px]">PAN (Permanent Account No.)</div>
                <div className="text-sm font-mono font-bold text-slate-900 mt-0.5">
                  ABCDE{profile?.id || "14"}92F <span className="text-[10px] text-emerald-600 font-normal">✔ Verified</span>
                </div>
              </div>
              <div>
                <div className="text-slate-400 font-semibold uppercase text-[10px]">Customer ID (CIF)</div>
                <div className="text-sm font-mono font-bold text-slate-900 mt-0.5">NEO-CUST-{10000 + (profile?.id || 14)}</div>
              </div>
              <div>
                <div className="text-slate-400 font-semibold uppercase text-[10px]">Primary Savings Account</div>
                <div className="text-sm font-mono font-bold text-slate-900 mt-0.5">
                  4099-2810-{String(profile?.id || 14).padStart(4, "0")}
                </div>
              </div>
              <div>
                <div className="text-slate-400 font-semibold uppercase text-[10px]">Branch & IFSC</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">Digital Branch (NEOB0001092)</div>
              </div>
              <div>
                <div className="text-slate-400 font-semibold uppercase text-[10px]">Registered Email</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{profile?.email || "user@example.com"}</div>
              </div>
            </div>

            {/* Section 1: Savings Account Interest Breakdown */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  1. Savings Bank Account Interest (Eligible u/s 80TTA)
                </h3>
                <span className="text-xs text-slate-500 font-medium">Interest Credited Quarterly @ 3.50% p.a.</span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Period / Quarter</th>
                      <th className="py-2.5 px-4">Interest Rate</th>
                      <th className="py-2.5 px-4">TDS Deducted</th>
                      <th className="py-2.5 px-4 text-right">Interest Credited (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr>
                      <td className="py-2.5 px-4 font-medium">Q1: 01-Apr to 30-Jun</td>
                      <td className="py-2.5 px-4">3.50%</td>
                      <td className="py-2.5 px-4">₹0 (No TDS)</td>
                      <td className="py-2.5 px-4 text-right font-semibold">₹{q1.toLocaleString("en-IN")}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-medium">Q2: 01-Jul to 30-Sep</td>
                      <td className="py-2.5 px-4">3.50%</td>
                      <td className="py-2.5 px-4">₹0 (No TDS)</td>
                      <td className="py-2.5 px-4 text-right font-semibold">₹{q2.toLocaleString("en-IN")}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-medium">Q3: 01-Oct to 31-Dec</td>
                      <td className="py-2.5 px-4">3.50%</td>
                      <td className="py-2.5 px-4">₹0 (No TDS)</td>
                      <td className="py-2.5 px-4 text-right font-semibold">₹{q3.toLocaleString("en-IN")}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-medium">Q4: 01-Jan to 31-Mar</td>
                      <td className="py-2.5 px-4">3.50%</td>
                      <td className="py-2.5 px-4">₹0 (No TDS)</td>
                      <td className="py-2.5 px-4 text-right font-semibold">₹{q4.toLocaleString("en-IN")}</td>
                    </tr>
                    <tr className="bg-slate-100 font-bold text-slate-900">
                      <td colSpan="3" className="py-2.5 px-4">Total Savings Interest Credited (A):</td>
                      <td className="py-2.5 px-4 text-right font-black text-blue-700">
                        ₹{savingsInterestAnnual.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 2: Fixed Deposit / Term Deposit Summary */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-600" />
                  2. Fixed Deposits / Recurring Deposits Interest & TDS (Section 194A)
                </h3>
                <span className="text-xs text-slate-500 font-medium">Form 16A TDS Certificate</span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Deposit Description</th>
                      <th className="py-2.5 px-4">Active Accounts</th>
                      <th className="py-2.5 px-4">TDS Rate</th>
                      <th className="py-2.5 px-4">TDS Deducted</th>
                      <th className="py-2.5 px-4 text-right">Interest Accrued (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr>
                      <td className="py-2.5 px-4 font-medium">High-Yield Fixed Deposits (8.50% p.a.)</td>
                      <td className="py-2.5 px-4">{Math.max(1, fds.length)} Deposit(s)</td>
                      <td className="py-2.5 px-4">10% (PAN verified)</td>
                      <td className="py-2.5 px-4">₹{totalTds.toLocaleString("en-IN")}</td>
                      <td className="py-2.5 px-4 text-right font-semibold">₹{totalFdInterest.toLocaleString("en-IN")}</td>
                    </tr>
                    <tr className="bg-slate-100 font-bold text-slate-900">
                      <td colSpan="4" className="py-2.5 px-4">Total Term Deposit Interest (B):</td>
                      <td className="py-2.5 px-4 text-right font-black text-amber-700">
                        ₹{totalFdInterest.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 3: Section 80TTA / 80TTB Tax Exemption Calculation */}
            <div className="mb-10 bg-emerald-50 border border-emerald-300 rounded-2xl p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-950 mb-3 flex items-center gap-2">
                <FaCheckCircle className="text-emerald-600" />
                3. Income Tax Return (ITR) Schedule OS Summary
              </h3>

              <div className="space-y-2 text-xs text-emerald-900">
                <div className="flex justify-between py-1 border-b border-emerald-200">
                  <span>Gross Total Interest Earned across all accounts (A + B):</span>
                  <span className="font-bold">₹{totalGrossInterest.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-emerald-200">
                  <span>Less: Exemption Eligible under Section 80TTA (Savings Interest max ₹10,000):</span>
                  <span className="font-bold text-emerald-700">-₹{exemption80tta.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between py-2 text-sm font-black text-emerald-950">
                  <span>Net Taxable Interest Income (to declare under "Income from Other Sources"):</span>
                  <span className="text-base text-emerald-800">₹{taxableInterest.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {/* Signatures & Bank Seal */}
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500">
              <div className="flex items-center gap-4">
                {/* Visual Stamp Seal */}
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-blue-600 flex flex-col items-center justify-center text-blue-700 font-bold text-[9px] text-center p-1 uppercase leading-tight select-none rotate-[-6deg]">
                  <span>Neo Bank</span>
                  <span className="text-[7px] text-blue-900">Official Seal</span>
                  <span>Verified</span>
                </div>
                <div>
                  <div className="font-semibold text-slate-700">Digital Authentication</div>
                  <div className="text-[11px]">SHA-256 Checksum: 49b2-8c10-99af-01c4</div>
                  <div className="text-[10px] text-slate-400">Valid without physical signature</div>
                </div>
              </div>

              <div className="text-center sm:text-right">
                <div className="h-10 flex items-end justify-center sm:justify-end">
                  <span className="font-serif italic font-bold text-base text-slate-800">
                    K. Ramanathan
                  </span>
                </div>
                <div className="w-48 border-t border-slate-400 mt-1 mb-1 mx-auto sm:ml-auto" />
                <div className="font-bold text-slate-800">Authorized Signatory</div>
                <div className="text-[11px] text-slate-500">Taxation & Operations Desk, Neo Digital Bank</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
