"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const rag_service_1 = require("../services/rag.service");
const chat_model_1 = __importDefault(require("../models/chat.model"));
const router = express_1.default.Router();
/**
 * Ask Question
 */
router.post("/", async (req, res) => {
    try {
        const { sessionId, question } = req.body;
        if (!sessionId || !question) {
            return res.status(400).json({ error: "Missing fields" });
        }
        // 1️⃣ Save user message
        await chat_model_1.default.create({
            sessionId,
            role: "user",
            text: question,
        });
        // 2️⃣ Get RAG answer
        const result = await (0, rag_service_1.answerQuestion)(sessionId, question);
        // 3️⃣ Save bot message
        await chat_model_1.default.create({
            sessionId,
            role: "bot",
            text: result.answer,
        });
        // 4️⃣ Return response
        res.json({
            answer: result.answer,
            score: result.score || [],
        });
    }
    catch (error) {
        console.error("QUERY ERROR:", error.message);
        res.status(500).json({ error: error.message });
    }
});
/**
 * Get Chat History
 */
router.get("/history/:sessionId", async (req, res) => {
    try {
        const { sessionId } = req.params;
        const history = await chat_model_1.default.find({ sessionId })
            .sort({ createdAt: 1 });
        res.json(history);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * Delete Chat History
 */
router.delete("/history/:sessionId", async (req, res) => {
    try {
        const { sessionId } = req.params;
        await chat_model_1.default.deleteMany({ sessionId });
        res.json({ message: "Chat history deleted" });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
