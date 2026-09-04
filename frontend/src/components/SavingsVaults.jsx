import { useEffect, useState } from "react";
import API from "../services/api";
import { useToast } from "../context/ToastContext";
import { FaPlus, FaPiggyBank, FaCoins, FaCheckCircle, FaTrashAlt } from "react-icons/fa";

export default function SavingsVaults({ onBalanceUpdate }) {
  const { showToast } = useToast();
  const [vaults, setVaults] = useState([]);
  const [totalSaved, setTotalSaved] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeVaultForTransfer, setActiveVaultForTransfer] = useState(null);
  const [transferType, setTransferType] = useState("deposit"); // 'deposit' | 'withdraw'
  const [transferAmount, setTransferAmount] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);

  // Create Form State
  const [newName, setNewName] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newIcon, setNewIcon] = useState("🎯");
  const [isRoundupTarget, setIsRoundupTarget] = useState(false);

  const fetchVaults = async () => {
    try {
      const res = await API.get("/vaults");
      setVaults(res.data.vaults || []);
      setTotalSaved(res.data.totalVaultSavings || 0);
    } catch (err) {
      console.error("Error loading vaults:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVaults();
  }, []);

  const handleCreateVault = async (e) => {
    e.preventDefault();
    if (!newName || !newTarget) return;

    try {
      await API.post("/vaults", {
        name: newName,
        target_amount: Number(newTarget),
        icon: newIcon,
        is_roundup_target: isRoundupTarget,
      });

      showToast("Vault created successfully! 🎯", "success");
      setIsCreateOpen(false);
      setNewName("");
      setNewTarget("");
      fetchVaults();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || "Failed to create vault", "error");
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!activeVaultForTransfer || !transferAmount) return;

    setTransferLoading(true);
    try {
      const endpoint =
        transferType === "deposit"
          ? `/vaults/${activeVaultForTransfer.id}/deposit`
          : `/vaults/${activeVaultForTransfer.id}/withdraw`;

      const res = await API.post(endpoint, {
        amount: Number(transferAmount),
      });

      showToast(res.data.message, "success");
      setActiveVaultForTransfer(null);
      setTransferAmount("");
      fetchVaults();
      if (onBalanceUpdate) onBalanceUpdate();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || "Transfer failed", "error");
    } finally {
      setTransferLoading(false);
    }
  };

  const handleSetRoundup = async (vaultId) => {
    try {
      await API.put(`/vaults/${vaultId}/set-roundup`);
      showToast("Set as primary round-up target! 🪙", "success");
      fetchVaults();
    } catch (err) {
      console.error(err);
      showToast("Could not update round-up target", "error");
    }
  };

  const handleDeleteVault = async (vaultId) => {
    if (!window.confirm("Close this vault and transfer remaining funds to your main wallet?")) return;

    try {
      await API.delete(`/vaults/${vaultId}`);
      showToast("Vault closed and funds returned.", "info");
      fetchVaults();
      if (onBalanceUpdate) onBalanceUpdate();
    } catch (err) {
      console.error(err);
      showToast("Failed to close vault", "error");
    }
  };

  if (loading) {
    return (
      <div className="h-64 animate-pulse rounded-3xl border border-slate-800 bg-slate-900/60 p-6" />
    );
  }

  return (
    <div className="rounded-3xl border border-slate-700/80 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
              Micro-Savings
            </span>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
              Total: ₹{totalSaved.toLocaleString("en-IN")}
            </span>
          </div>
          <h3 className="mt-1 text-2xl font-bold text-white">Smart Savings Vaults</h3>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:brightness-110"
        >
          <FaPlus /> New Goal Vault
        </button>
      </div>

      {/* Vaults Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {vaults.map((vault) => {
          const current = Number(vault.current_amount || 0);
          const target = Number(vault.target_amount || 1);
          const pct = Math.min(100, Math.round((current / target) * 100));

          return (
            <div
              key={vault.id}
              className="relative flex flex-col justify-between rounded-2xl border border-slate-700/70 bg-slate-800/60 p-5 transition hover:border-slate-600"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-700/60 text-2xl">
                      {vault.icon || "🎯"}
                    </span>
                    <div>
                      <h4 className="font-bold text-white">{vault.name}</h4>
                      <p className="text-xs text-slate-400">
                        Target: ₹{target.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>

                  {vault.is_roundup_target ? (
                    <span
                      title="Spare change from transfers goes here"
                      className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300"
                    >
                      🪙 Round-up
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSetRoundup(vault.id)}
                      title="Make this your round-up target"
                      className="text-xs text-slate-500 hover:text-amber-400"
                    >
                      Set Round-up
                    </button>
                  )}
                </div>

                {/* Progress */}
                <div className="mt-5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-bold text-white">
                      ₹{current.toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs font-semibold text-emerald-400">{pct}%</span>
                  </div>

                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-5 flex items-center gap-2 border-t border-slate-700/60 pt-3">
                <button
                  onClick={() => {
                    setActiveVaultForTransfer(vault);
                    setTransferType("deposit");
                  }}
                  className="flex-1 rounded-lg bg-emerald-500/20 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/30"
                >
                  + Deposit
                </button>
                <button
                  onClick={() => {
                    setActiveVaultForTransfer(vault);
                    setTransferType("withdraw");
                  }}
                  disabled={current <= 0}
                  className="flex-1 rounded-lg bg-slate-700/70 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 disabled:opacity-40"
                >
                  Withdraw
                </button>
                <button
                  onClick={() => handleDeleteVault(vault.id)}
                  title="Close Vault"
                  className="rounded-lg p-1.5 text-slate-500 hover:text-red-400"
                >
                  <FaTrashAlt className="text-xs" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE VAULT MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white">Create Savings Goal Vault</h3>
            <p className="mt-1 text-xs text-slate-400">
              Lock money toward a specific purpose and track your growth.
            </p>

            <form onSubmit={handleCreateVault} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs text-slate-300">Goal Name</label>
                <input
                  type="text"
                  placeholder="e.g., MacBook M3, Tokyo Trip, Emergency Fund"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-300">Target Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="25000"
                    value={newTarget}
                    onChange={(e) => setNewTarget(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-300">Choose Icon</label>
                  <select
                    value={newIcon}
                    onChange={(e) => setNewIcon(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
                  >
                    <option value="🎯">🎯 Target</option>
                    <option value="💻">💻 Tech / Gadgets</option>
                    <option value="✈️">✈️ Travel</option>
                    <option value="🚗">🚗 Vehicle</option>
                    <option value="🛡️">🛡️ Emergency Fund</option>
                    <option value="🏠">🏠 Real Estate</option>
                    <option value="🎁">🎁 Gifts & Celebration</option>
                  </select>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/60 p-3 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={isRoundupTarget}
                  onChange={(e) => setIsRoundupTarget(e.target.checked)}
                  className="h-4 w-4 accent-emerald-500"
                />
                <span>Set as primary target for Spare-Change Round-Ups</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:brightness-110"
                >
                  Create Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEPOSIT / WITHDRAW MODAL */}
      {activeVaultForTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{activeVaultForTransfer.icon}</span>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {transferType === "deposit" ? "Deposit to" : "Withdraw from"}{" "}
                  {activeVaultForTransfer.name}
                </h3>
                <p className="text-xs text-slate-400">
                  Vault Balance: ₹{Number(activeVaultForTransfer.current_amount).toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            <form onSubmit={handleTransfer} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs text-slate-300">
                  Amount to {transferType === "deposit" ? "Deposit" : "Withdraw"} (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 1000"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="flex gap-2 text-xs">
                {[500, 1000, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTransferAmount(amt.toString())}
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-800/80 py-1.5 font-medium text-slate-300 hover:bg-slate-700"
                  >
                    +₹{amt}
                  </button>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveVaultForTransfer(null)}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferLoading}
                  className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:brightness-110"
                >
                  {transferLoading ? "Processing..." : "Confirm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
