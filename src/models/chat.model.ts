import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true },
    role: { type: String, enum: ["user", "bot"], required: true },
    text: { type: String, required: true },
    score: { type: Number, required: true },
  },
  { timestamps: true }
);

const ChatHistory = mongoose.model("ChatHistory", chatSchema);

export default ChatHistory;