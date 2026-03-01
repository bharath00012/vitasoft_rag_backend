"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const chatSchema = new mongoose_1.default.Schema({
    sessionId: { type: String, required: true },
    role: { type: String, enum: ["user", "bot"], required: true },
    text: { type: String, required: true },
}, { timestamps: true });
const ChatHistory = mongoose_1.default.model("ChatHistory", chatSchema);
exports.default = ChatHistory;
