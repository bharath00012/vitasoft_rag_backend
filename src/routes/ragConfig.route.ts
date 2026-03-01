import express from "express";
import {
  getRagConfig,
  updateRagConfig,
  resetRagConfig,
} from "../config/rag.config";

const router = express.Router();

// GET current config
router.get("/", (req, res) => {
  res.json(getRagConfig());
});

// UPDATE config
router.put("/", (req, res) => {
  const updated = updateRagConfig(req.body);
  res.json(updated);
});

// RESET config
router.get("/reset", (req, res) => {
  const reset = resetRagConfig();
  res.json(reset);
});

export default router;