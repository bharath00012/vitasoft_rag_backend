"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const promises_1 = __importDefault(require("fs/promises"));
const pdf_loader_1 = require("../loaders/pdf.loader");
const pageSplitter_1 = require("../chunking/pageSplitter");
const semanticSplitter_1 = require("../chunking/semanticSplitter");
const recursiveSplitter_1 = require("../chunking/recursiveSplitter");
const embedding_service_1 = require("../services/embedding.service");
const chroma_service_1 = require("../services/chroma.service");
const uuid_1 = require("uuid");
const router = express_1.default.Router();
const upload = (0, multer_1.default)({ dest: "uploads/" });
router.post("/", upload.single("file"), async (req, res) => {
    try {
        const { sessionId } = req.body;
        const file = req.file;
        if (!sessionId || !file) {
            return res.status(400).json({ error: "Missing data" });
        }
        const rawText = await (0, pdf_loader_1.extractText)(file.path);
        if (!rawText || rawText.trim().length === 0) {
            return res.status(400).json({
                error: "No text extracted from PDF"
            });
        }
        const pages = (0, pageSplitter_1.splitByPages)(rawText);
        let finalChunks = [];
        for (const page of pages) {
            if (!page.trim())
                continue;
            const semanticChunks = await (0, semanticSplitter_1.semanticSplit)(page);
            for (const chunk of semanticChunks) {
                const recursiveChunks = (0, recursiveSplitter_1.recursiveSplit)(chunk);
                finalChunks.push(...recursiveChunks);
            }
        }
        // 🔥 CRITICAL FIX: Clean chunks
        finalChunks = finalChunks
            .map(c => c.trim())
            .filter(c => c.length > 30); // remove tiny/empty chunks
        if (finalChunks.length === 0) {
            return res.status(400).json({
                error: "No valid chunks generated from document"
            });
        }
        console.log("Total valid chunks:", finalChunks.length);
        console.log("Starting embedding generation for", finalChunks.length, "chunks...");
        let embeddingVectors = [];
        try {
            embeddingVectors = await embedding_service_1.embeddings.embedDocuments(finalChunks);
        }
        catch (embeddingError) {
            console.error("❌ Embedding API Error:", embeddingError);
            return res.status(500).json({
                error: "Embedding API failed",
                details: embeddingError.message,
                suggestion: "Check API key and model name in embedding.service.ts"
            });
        }
        // Validate embeddings and log details
        console.log("Embeddings response type:", typeof embeddingVectors);
        console.log("Embeddings is array:", Array.isArray(embeddingVectors));
        console.log("Embeddings length:", embeddingVectors?.length || 0);
        console.log("First embedding type:", typeof embeddingVectors?.[0]);
        console.log("First embedding is array:", Array.isArray(embeddingVectors?.[0]));
        if (embeddingVectors?.[0]) {
            console.log("First embedding size:", embeddingVectors[0].length);
            console.log("First embedding sample:", embeddingVectors[0].slice(0, 5));
        }
        // Critical check: embeddings should NOT be empty
        if (!embeddingVectors || embeddingVectors.length === 0 || (Array.isArray(embeddingVectors[0]) && embeddingVectors[0].length === 0)) {
            console.error("❌ Embeddings are empty! API returned no data.");
            return res.status(500).json({
                error: "Embedding generation failed",
                details: "API returned empty embedding vectors",
                debugging: {
                    embeddingsLength: embeddingVectors?.length,
                    firstEmbeddingLength: embeddingVectors?.[0]?.length,
                    chunksCount: finalChunks.length
                }
            });
        }
        // 🔥 Validate embeddings before inserting
        const validData = embeddingVectors
            .map((emb, i) => ({
            emb,
            doc: finalChunks[i]
        }))
            .filter(item => Array.isArray(item.emb) && item.emb.length > 0);
        if (validData.length === 0) {
            return res.status(500).json({
                error: "Embedding generation failed",
                details: "No valid embeddings generated"
            });
        }
        console.log("Valid embeddings count:", validData.length);
        console.log("Embedding size:", validData[0].emb.length);
        const collection = await (0, chroma_service_1.getOrCreateCollection)(sessionId);
        await collection.add({
            ids: validData.map(() => (0, uuid_1.v4)()),
            documents: validData.map(v => v.doc),
            embeddings: validData.map(v => v.emb),
        });
        // Clean uploaded file
        await promises_1.default.unlink(file.path);
        res.json({
            message: "File processed successfully",
            chunksCreated: validData.length,
        });
    }
    catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({
            error: "Upload failed",
            details: error.message,
        });
    }
});
exports.default = router;
