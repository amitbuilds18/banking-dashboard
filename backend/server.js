import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config();

import pool from "./db.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import pdfRoutes from "./routes/pdfRoutes.js";
import budgetRoutes from "./routes/budgetRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import cardRoutes from "./routes/cardRoutes.js";
import vaultRoutes from "./routes/vaultRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import { initDatabase } from "./initDb.js";

// Initialize database schema tables on startup
initDatabase();

const app = express();

const configuredFrontendOrigin = process.env.FRONTEND_URL || "http://localhost:5173";
const allowedOrigins = new Set([
  configuredFrontendOrigin,
  "http://localhost:5173",
  "http://localhost:5176",
]);
const localOriginPattern = /^http:\/\/localhost:\d+$/;
const vercelOriginPattern = /^https:\/\/.*\.vercel\.app$/;

app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      allowedOrigins.has(origin) ||
      localOriginPattern.test(origin) ||
      vercelOriginPattern.test(origin)
    ) {
      callback(null, true);
      return;
    }

    // Allow all clients in production to prevent unexpected client-side CORS rejection
    callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));
app.use(express.json());

// 🔐 AUTH ROUTES
app.use("/api/auth", authRoutes);

// 💸 TRANSACTION ROUTES
app.use("/api/transactions", transactionRoutes);

// 💳 PAYMENT ROUTES
app.use("/api/payment", paymentRoutes);

app.use("/api/pdf", pdfRoutes);

app.use("/api/budget", budgetRoutes);

app.use("/api/notifications", notificationRoutes);

// 💳 VIRTUAL CARD ROUTES
app.use("/api/card", cardRoutes);

// 🏺 SAVINGS VAULTS ROUTES
app.use("/api/vaults", vaultRoutes);

// 🤖 AI COPILOT & INSIGHTS ROUTES
app.use("/api/ai", aiRoutes);

// HEALTH CHECK ROUTE (Verifies Neon PostgreSQL live connection & latency)
app.get("/api/health", async (req, res) => {
  try {
    const start = Date.now();
    await pool.query("SELECT 1");
    const latencyMs = Date.now() - start;
    res.json({
      status: "healthy",
      database: "Neon PostgreSQL Connected",
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      status: "degraded",
      database: "Connection Failed",
      error: err.message,
    });
  }
});

// TEST ROUTE
app.get("/", (req, res) => {
  res.send("API Running...");
});

// 404 handler - agar koi route match hi nahi hua
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Centralized error handler - hamesha SABSE LAST middleware hona chahiye
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    message: err.message || "Something went wrong, please try again",
  });
});

if (!process.env.VERCEL) {
  app.listen(process.env.PORT || 5000, () => {
    console.log(`Server running on port ${process.env.PORT || 5000}`);
  });
}

export default app;