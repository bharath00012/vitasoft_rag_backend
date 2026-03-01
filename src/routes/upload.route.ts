import express from "express";
import multer from "multer";
import fs from "fs/promises";
import { extractText } from "../loaders/pdf.loader";
import path from "path";
import { chunkText } from "../chunking/chunker";
import { embeddings } from "../services/embedding.service";
import { getOrCreateCollection } from "../services/chroma.service";
import Session from "../models/session.model";
import { v4 as uuid } from "uuid";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/", upload.single("file"), async (req, res) => {
  const file = req.file;

  try {
    const { sessionId } = req.body;

    if (!sessionId || !file) {
      if (file) await fs.unlink(file.path).catch(() => {});
      return res.status(400).json({ error: "Missing data" });
    }

    // validate extension early so we can reject unsupported types before doing work
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".pdf" && ext !== ".txt") {
      await fs.unlink(file.path).catch(() => {});
      return res.status(400).json({
        error: "Unsupported file type. Only .pdf and .txt are supported.",
      });
    }

    /* ===========================
       SESSION HANDLING
    =========================== */

    let session = await Session.findOne({ sessionId });

    if (!session) {
      session = await Session.create({
        sessionId,
        messages: [],
      });
    }

    session.file = {
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      uploadedAt: new Date(),
    };

    await session.save();

    /* ===========================
       FILE PROCESSING (PDF or TXT)
    =========================== */

    // pass original name since multer strips extensions from the saved file
    const rawText = await extractText(file.path, file.originalname);

    if (!rawText?.trim()) {
      await fs.unlink(file.path).catch(() => {});
      return res.status(400).json({
        error: "No text extracted from file",
      });
    }

    /* ===========================
       CHUNKING (Using chunker.ts)
    =========================== */

    const finalChunks = chunkText(rawText).filter(
      (c) => c.trim().length > 30
    );

    if (!finalChunks.length) {
      await fs.unlink(file.path).catch(() => {});
      return res.status(400).json({
        error: "No valid chunks generated",
      });
    }

    console.log("Total valid chunks:", finalChunks.length);

    /* ===========================
       EMBEDDINGS (BATCHED)
    =========================== */

    const BATCH_SIZE = 100;
    const embeddingVectors: number[][] = [];

    for (let i = 0; i < finalChunks.length; i += BATCH_SIZE) {
      const batch = finalChunks.slice(i, i + BATCH_SIZE);

      const batchEmbeddings = await embeddings.embedDocuments(batch);

      if (!Array.isArray(batchEmbeddings) || !batchEmbeddings.length) {
        throw new Error("Embedding generation failed for batch");
      }

      embeddingVectors.push(...batchEmbeddings);
    }

    if (embeddingVectors.length !== finalChunks.length) {
      throw new Error("Embedding mismatch error");
    }

    /* ===========================
       STORE IN CHROMA
    =========================== */

    const collection = await getOrCreateCollection(sessionId);

    await collection.add({
      ids: finalChunks.map(() => uuid()),
      documents: finalChunks,
      embeddings: embeddingVectors,
      metadatas: finalChunks.map(() => ({ sessionId })),
    });

    session.chunkCount = finalChunks.length;
    await session.save();

    /* ===========================
       CLEAN FILE
    =========================== */

    await fs.unlink(file.path).catch(() => {});

    return res.json({
      message: "File processed successfully",
      chunksCreated: finalChunks.length,
    });

  } catch (error: any) {
    console.error("Upload error:", error);

    if (file) await fs.unlink(file.path).catch(() => {});

    return res.status(500).json({
      error: "Upload failed",
      details: error.message,
    });
  }
});

export default router;