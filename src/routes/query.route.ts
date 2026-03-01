import express from "express";
import { answerQuestion } from "../services/rag.service";
import ChatHistory from "../models/chat.model";

const router = express.Router();

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
    await ChatHistory.create({
      sessionId,
      role: "user",
      text: question,
      score:0,
    });

    // 2️⃣ Get RAG answer
    const result = await answerQuestion(sessionId, question);

    // 3️⃣ Save bot message
    await ChatHistory.create({
      sessionId,
      role: "bot",
      text: result.answer,
      score: result.score || 0,
    });

    // 4️⃣ Return response
    res.json({
      answer: result.answer,
      score: result.score || [],
    });

  } catch (error: any) {
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

    const history = await ChatHistory.find({ sessionId })
      .sort({ createdAt: 1 });

    res.json(history);

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete Chat History
 */
router.delete("/history/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    await ChatHistory.deleteMany({ sessionId });

    res.json({ message: "Chat history deleted" });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;