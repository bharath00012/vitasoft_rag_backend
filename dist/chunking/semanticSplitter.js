"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.semanticSplit = void 0;
const embedding_service_1 = require("../services/embedding.service");
const cosine_1 = require("../utils/cosine");
const rag_config_1 = require("../config/rag.config");
const semanticSplit = async (text) => {
    const sentences = text.split(/(?<=\.)\s+/);
    if (sentences.length === 0)
        return [];
    try {
        const sentenceEmbeddings = await embedding_service_1.embeddings.embedDocuments(sentences);
        // Validate embeddings
        if (!sentenceEmbeddings || !Array.isArray(sentenceEmbeddings) || sentenceEmbeddings.length === 0) {
            console.error("Invalid embeddings returned:", sentenceEmbeddings);
            throw new Error("Embedding failed - invalid response");
        }
        if (!Array.isArray(sentenceEmbeddings[0])) {
            console.error("First embedding is not an array:", sentenceEmbeddings[0]);
            throw new Error("Embedding format error - expected number arrays");
        }
        const chunks = [];
        let currentChunk = sentences[0];
        let currentEmbedding = sentenceEmbeddings[0];
        for (let i = 1; i < sentences.length; i++) {
            const similarity = (0, cosine_1.cosineSimilarity)(currentEmbedding, sentenceEmbeddings[i]);
            if (similarity > rag_config_1.RAG_CONFIG.semanticThreshold) {
                currentChunk += " " + sentences[i];
            }
            else {
                chunks.push(currentChunk);
                currentChunk = sentences[i];
                currentEmbedding = sentenceEmbeddings[i];
            }
        }
        chunks.push(currentChunk);
        return chunks;
    }
    catch (error) {
        console.error("Semantic split error:", error.message);
        // Fallback to returning sentences as individual chunks
        return sentences.filter(s => s.trim().length > 0);
    }
};
exports.semanticSplit = semanticSplit;
