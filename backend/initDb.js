import pool from "./db.js";

export async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vaults (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        target_amount NUMERIC NOT NULL DEFAULT 10000,
        current_amount NUMERIC NOT NULL DEFAULT 0,
        icon VARCHAR(10) DEFAULT '🎯',
        color VARCHAR(40) DEFAULT 'from-blue-500 to-indigo-600',
        is_roundup_target BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_cards (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        card_number VARCHAR(19) NOT NULL,
        holder_name VARCHAR(100) NOT NULL,
        expiry VARCHAR(5) NOT NULL,
        cvv VARCHAR(4) NOT NULL,
        card_tier VARCHAR(30) DEFAULT 'Platinum Neo',
        is_frozen BOOLEAN DEFAULT false,
        online_enabled BOOLEAN DEFAULT true,
        daily_limit NUMERIC DEFAULT 25000,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20) DEFAULT '';
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255);
    `);

    console.log("✅ Database schema initialized successfully (vaults, user_cards verified).");
  } catch (err) {
    console.error("⚠️ Database initialization note:", err.message);
  }
}
