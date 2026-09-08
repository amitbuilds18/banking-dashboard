import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import transactionRoutes from "./routes/transactionRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import pdfRoutes from "./routes/pdfRoutes.js";
import budgetRoutes from "./routes/budgetRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import cardRoutes from "./routes/cardRoutes.js";
import vaultRoutes from "./routes/vaultRoutes.js";
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

    callback(new Error("Not allowed by CORS"));
  },
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