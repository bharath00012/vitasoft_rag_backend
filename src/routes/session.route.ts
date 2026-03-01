import express from "express";
import Session from "../models/session.model";
import ChatHistory from "../models/chat.model";

const router = express.Router();

/* =========================================
   CREATE SESSION
========================================= */
router.post("/", async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "sessionId required" });
    }

    let session = await Session.findOne({ sessionId });

    if (!session) {
      session = await Session.create({
        sessionId,
      });
    }

    res.json({
      success: true,
      sessionId: session.sessionId,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/* =========================================
   GET ALL SESSIONS (WITHOUT CHATS)
========================================= */
router.get("/", async (req, res) => {
  try {
    const sessions = await Session.find({}, { _id: 0, __v: 0 })
      .sort({ createdAt: -1 })
      .lean();

    const formatted = sessions.map((session: any) => ({
  sessionId: session.sessionId,

  chunkCount: session.chunkCount || 0,   // ✅ ADD THIS

  file: session.file
    ? {
        filename: session.file.filename,
        originalName: session.file.originalName,
        uploadedAt: session.file.uploadedAt,
      }
    : null,

  createdAt: session.createdAt,
  updatedAt: session.updatedAt,
}));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/* =========================================
   GET SINGLE SESSION WITH ALL CHATS
========================================= */
router.get("/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    // 1️⃣ Get session info
    const session = await Session.findOne(
      { sessionId },
      { _id: 0, __v: 0 }
    ).lean();

    // 2️⃣ Get chat history from ChatHistory collection
    const messages = await ChatHistory.find(
      { sessionId },
      { _id: 0, __v: 0 }
    )
      .sort({ createdAt: 1 }) // oldest first
      .lean();

    res.json({
      sessionId,
      chunkCount: session?.chunkCount || 0,
      messages: messages.map((msg: any) => ({
        role: msg.role,
        text: msg.text,
        score:msg.score,
        timestamp: msg.createdAt,
      })),
      file: session?.file
        ? {
            filename: session.file.filename,
            originalName: session.file.originalName,
            uploadedAt: session.file.uploadedAt,
          }
        : null,
      createdAt: session?.createdAt || null,
      updatedAt: session?.updatedAt || null,
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/* =========================================
   DELETE SESSION + ALL CHATS
========================================= */
router.delete("/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    await Session.deleteOne({ sessionId });
    await ChatHistory.deleteMany({ sessionId });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
/* =========================================
   DELETE ONLY CHAT HISTORY (KEEP SESSION)
========================================= */
router.delete("/:sessionId/chats", async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Delete only chat messages, keep session
    await ChatHistory.deleteMany({ sessionId });

    res.json({ success: true, message: "Chat messages deleted, session intact." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
export default router;