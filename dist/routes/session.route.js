"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const chroma_service_1 = require("../services/chroma.service");
const router = express_1.default.Router();
router.delete("/:sessionId", async (req, res) => {
    await (0, chroma_service_1.deleteCollection)(req.params.sessionId);
    res.json({ message: "Session cleared" });
});
exports.default = router;
