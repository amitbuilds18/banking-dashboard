import express from "express";
import pool from "../db.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/vaults
router.get("/", protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM vaults WHERE user_id = $1 ORDER BY created_at ASC`,
      [req.user.id]
    );

    let vaults = result.rows;

    // If user has no vaults yet, provide a starter vault
    if (vaults.length === 0) {
      const initial = await pool.query(
        `INSERT INTO vaults (user_id, name, target_amount, current_amount, icon, color, is_roundup_target)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [req.user.id, "Emergency Fund", 50000, 0, "🛡️", "from-blue-600 to-indigo-600", true]
      );
      vaults = initial.rows;
    }

    const totalVaultSavings = vaults.reduce(
      (acc, v) => acc + Number(v.current_amount || 0),
      0
    );

    res.json({
      vaults: vaults.map((v) => ({
        ...v,
        percentage: v.target_amount > 0 
          ? Math.min(100, Number(((Number(v.current_amount) / Number(v.target_amount)) * 100).toFixed(1)))
          : 0,
      })),
      totalVaultSavings,
    });
  } catch (err) {
    console.error("Vaults Fetch Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vaults (create new vault)
router.post("/", protect, async (req, res) => {
  try {
    const { name, target_amount, icon, color, is_roundup_target } = req.body;

    if (!name || !target_amount) {
      return res.status(400).json({ error: "Name and target amount are required" });
    }

    const target = Number(target_amount);
    if (!Number.isFinite(target) || target <= 0) {
      return res.status(400).json({ error: "Invalid target amount" });
    }

    // If setting as roundup target, reset others
    if (is_roundup_target) {
      await pool.query(
        "UPDATE vaults SET is_roundup_target = false WHERE user_id = $1",
        [req.user.id]
      );
    }

    const result = await pool.query(
      `INSERT INTO vaults (user_id, name, target_amount, current_amount, icon, color, is_roundup_target)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req.user.id,
        name.trim(),
        target,
        0,
        icon || "🎯",
        color || "from-emerald-500 to-teal-600",
        Boolean(is_roundup_target),
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Vault Create Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vaults/:id/deposit
router.post("/:id/deposit", protect, async (req, res) => {
  const client = await pool.connect();
  try {
    const vaultId = req.params.id;
    const amount = Number(req.body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: "Enter a valid positive deposit amount" });
    }

    await client.query("BEGIN");

    // Check user balance
    const userRes = await client.query(
      "SELECT balance FROM users WHERE id = $1 FOR UPDATE",
      [req.user.id]
    );

    if (userRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "User not found" });
    }

    const currentBalance = Number(userRes.rows[0].balance);
    if (currentBalance < amount) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Insufficient balance in main account" });
    }

    // Check vault
    const vaultRes = await client.query(
      "SELECT * FROM vaults WHERE id = $1 AND user_id = $2 FOR UPDATE",
      [vaultId, req.user.id]
    );

    if (vaultRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Vault not found" });
    }

    // Deduct from user
    await client.query(
      "UPDATE users SET balance = balance - $1 WHERE id = $2",
      [amount, req.user.id]
    );

    // Add to vault
    const updatedVault = await client.query(
      "UPDATE vaults SET current_amount = current_amount + $1 WHERE id = $2 RETURNING *",
      [amount, vaultId]
    );

    // Log transaction
    await client.query(
      `INSERT INTO transactions (name, amount, status, user_id)
       VALUES ($1, $2, $3, $4)`,
      [`Vault Deposit: ${vaultRes.rows[0].name}`, -amount, "success", req.user.id]
    );

    await client.query("COMMIT");

    res.json({
      message: "Successfully deposited into vault",
      vault: updatedVault.rows[0],
      newBalance: currentBalance - amount,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Vault Deposit Error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/vaults/:id/withdraw
router.post("/:id/withdraw", protect, async (req, res) => {
  const client = await pool.connect();
  try {
    const vaultId = req.params.id;
    const amount = Number(req.body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: "Enter a valid withdrawal amount" });
    }

    await client.query("BEGIN");

    // Check vault
    const vaultRes = await client.query(
      "SELECT * FROM vaults WHERE id = $1 AND user_id = $2 FOR UPDATE",
      [vaultId, req.user.id]
    );

    if (vaultRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Vault not found" });
    }

    const currentVaultAmount = Number(vaultRes.rows[0].current_amount);
    if (currentVaultAmount < amount) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Withdrawal amount exceeds vault balance" });
    }

    // Deduct from vault
    const updatedVault = await client.query(
      "UPDATE vaults SET current_amount = current_amount - $1 WHERE id = $2 RETURNING *",
      [amount, vaultId]
    );

    // Add to user balance
    const updatedUser = await client.query(
      "UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance",
      [amount, req.user.id]
    );

    // Log transaction
    await client.query(
      `INSERT INTO transactions (name, amount, status, user_id)
       VALUES ($1, $2, $3, $4)`,
      [`Vault Withdrawal: ${vaultRes.rows[0].name}`, amount, "success", req.user.id]
    );

    await client.query("COMMIT");

    res.json({
      message: "Withdrawn funds back to main wallet",
      vault: updatedVault.rows[0],
      newBalance: updatedUser.rows[0].balance,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Vault Withdraw Error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/vaults/:id/set-roundup
router.put("/:id/set-roundup", protect, async (req, res) => {
  try {
    const vaultId = req.params.id;

    await pool.query(
      "UPDATE vaults SET is_roundup_target = false WHERE user_id = $1",
      [req.user.id]
    );

    const updated = await pool.query(
      "UPDATE vaults SET is_roundup_target = true WHERE id = $1 AND user_id = $2 RETURNING *",
      [vaultId, req.user.id]
    );

    res.json({
      message: "Set as round-up target vault",
      vault: updated.rows[0],
    });
  } catch (err) {
    console.error("Roundup toggle error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/vaults/:id
router.delete("/:id", protect, async (req, res) => {
  const client = await pool.connect();
  try {
    const vaultId = req.params.id;

    await client.query("BEGIN");

    const vaultRes = await client.query(
      "SELECT * FROM vaults WHERE id = $1 AND user_id = $2 FOR UPDATE",
      [vaultId, req.user.id]
    );

    if (vaultRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Vault not found" });
    }

    const funds = Number(vaultRes.rows[0].current_amount);
    if (funds > 0) {
      await client.query(
        "UPDATE users SET balance = balance + $1 WHERE id = $2",
        [funds, req.user.id]
      );
      await client.query(
        `INSERT INTO transactions (name, amount, status, user_id)
         VALUES ($1, $2, $3, $4)`,
        [`Vault Closed: ${vaultRes.rows[0].name}`, funds, "success", req.user.id]
      );
    }

    await client.query("DELETE FROM vaults WHERE id = $1", [vaultId]);

    await client.query("COMMIT");

    res.json({ message: "Vault closed and funds returned to main balance" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Vault Delete Error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

export default router;
