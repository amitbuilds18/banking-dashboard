import express from "express";
import protect from "../middleware/authMiddleware.js";
import { apiLimiter } from "../middleware/rateLimiter.js";
import { chatWithAI, getAISummary } from "../controllers/aiController.js";

const router = express.Router();

// Natural Language AI Financial Assistant
router.post("/chat", protect, apiLimiter, chatWithAI);

// Dynamic AI Spending Summary Digest
router.get("/summary", protect, apiLimiter, getAISummary);

export default router;
