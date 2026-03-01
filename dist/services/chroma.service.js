"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCollection = exports.getOrCreateCollection = void 0;
const chromadb_1 = require("chromadb");
const client = new chromadb_1.ChromaClient({
    path: process.env.CHROMA_URL || "http://localhost:8000",
});
const getOrCreateCollection = async (sessionId) => {
    return client.getOrCreateCollection({
        name: `session_${sessionId}`,
    });
};
exports.getOrCreateCollection = getOrCreateCollection;
const deleteCollection = async (sessionId) => {
    await client.deleteCollection({
        name: `session_${sessionId}`,
    });
};
exports.deleteCollection = deleteCollection;
