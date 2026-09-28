import pkg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded regardless of current working directory
dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Neon SSL
  },
  max: 10, // Maintain safe connection ceiling for serverless pooling
  idleTimeoutMillis: 30000, // Release idle connections back to Neon pooler
  connectionTimeoutMillis: 10000, // 10s grace period for Neon compute cold-starts
});

// Gracefully handle unexpected idle client disconnections without crashing Node process
pool.on("error", (err) => {
  console.warn("⚠️ Neon PostgreSQL idle connection reset (auto-recovering):", err.message);
});

export default pool;