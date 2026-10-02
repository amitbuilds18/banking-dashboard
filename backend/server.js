import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { initSocket } from "./socket.js";

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
import billRoutes from "./routes/billRoutes.js";
import beneficiaryRoutes from "./routes/beneficiaryRoutes.js";
import recurringRoutes from "./routes/recurringRoutes.js";
import storeRoutes from "./routes/storeRoutes.js";
import splitBillRoutes from "./routes/splitBillRoutes.js";
import fdRoutes from "./routes/fdRoutes.js";
import forexRoutes from "./routes/forexRoutes.js";
import kycRoutes from "./routes/kycRoutes.js";
import loanRoutes from "./routes/loanRoutes.js";
import rewardRoutes from "./routes/rewardRoutes.js";
import goldRoutes from "./routes/goldRoutes.js";
import paymentLinkRoutes from "./routes/paymentLinkRoutes.js";
import taxRoutes from "./routes/taxRoutes.js";
import biometricRoutes from "./routes/biometricRoutes.js";
import creditCardRoutes from "./routes/creditCardRoutes.js";
import { initDatabase } from "./initDb.js";

// Initialize database schema tables on startup
initDatabase();

const app = express();
const server = http.createServer(app);
const io = initSocket(server);
app.set("io", io);

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

// ⚡ UTILITY BILL & RECHARGE ROUTES
app.use("/api/bills", billRoutes);

// 👥 SAVED BENEFICIARIES & QUICK PAY ROUTES
app.use("/api/beneficiaries", beneficiaryRoutes);

// 🔁 RECURRING AUTOPAY & SUBSCRIPTIONS ROUTES
app.use("/api/recurring", recurringRoutes);

// 🛍️ STORE PAY & MERCHANT EXPENSE ROUTES
app.use("/api/store-pay", storeRoutes);

// 👥 SPLIT BILL & GROUP EXPENSE ROUTES
app.use("/api/split-bills", splitBillRoutes);

// 🏛️ FIXED DEPOSITS & HIGH-YIELD SAVINGS ROUTES
app.use("/api/fixed-deposits", fdRoutes);

// 🌐 MULTI-CURRENCY & FOREX WALLETS ROUTES
app.use("/api/forex", forexRoutes);

// 🆔 DIGITAL IDENTITY & E-KYC ROUTES
app.use("/api/kyc", kycRoutes);

// 💰 PRE-APPROVED PERSONAL LOANS & CREDIT LINE ROUTES
app.use("/api/loans", loanRoutes);

// 🎁 REWARDS, CASHBACK & SCRATCH CARDS ROUTES
app.use("/api/rewards", rewardRoutes);

// ✨ 24K DIGITAL GOLD & WEALTH ROUTES
app.use("/api/gold", goldRoutes);

// 🔗 PAYMENT REQUESTS & SHAREABLE PAYMENT LINKS ROUTES
app.use("/api/payment-links", paymentLinkRoutes);

// 🏛️ SMART TAX OPTIMIZER & ADVANCE TAX ROUTES
app.use("/api/tax", taxRoutes);

// ⚡ HARDWARE BIOMETRIC WEBAUTHN AUTHENTICATION ROUTES
app.use("/api/biometrics", biometricRoutes);

// 💳 EXTERNAL CREDIT CARD BILL MANAGEMENT & PAYMENTS ROUTES
app.use("/api/credit-cards", creditCardRoutes);

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
  server.listen(process.env.PORT || 5000, () => {
    console.log(`Server & Socket.io running on port ${process.env.PORT || 5000}`);
  });
}

export { server };
export default app;