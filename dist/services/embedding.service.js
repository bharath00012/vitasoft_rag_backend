"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.embeddings = void 0;
const genai_1 = require("@google/genai");
const apiKey = process.env.GOOGLE_API_KEY || "AIzaSyALmmFYVMLCbuxv4Asn7HIDvALg9uH2BKw";
if (!apiKey || apiKey === "AIzaSyALmmFYVMLCbuxv4Asn7HIDvALg9uH2BKw") {
    console.warn("⚠️  Using hardcoded API key. Set GOOGLE_API_KEY env variable for production.");
}
const client = new genai_1.GoogleGenAI({
    apiKey: apiKey,
});
// Wrapper class to maintain compatibility with LangChain interface
exports.embeddings = {
    async embedQuery(text) {
        try {
            const response = await client.models.embedContent({
                model: "gemini-embedding-001",
                contents: [{ parts: [{ text }] }],
            });
            return response.embeddings?.[0]?.values || [];
        }
        catch (error) {
            console.error("❌ embedQuery error:", error.message);
            throw error;
        }
    },
    async embedDocuments(texts) {
        try {
            const embeddings = [];
            for (const text of texts) {
                const response = await client.models.embedContent({
                    model: "gemini-embedding-001",
                    contents: [{ parts: [{ text }] }],
                });
                const embedding = response.embeddings?.[0]?.values || [];
                if (embedding.length === 0) {
                    console.warn("⚠️  Empty embedding for text:", text.substring(0, 50));
                }
                embeddings.push(embedding);
            }
            return embeddings;
        }
        catch (error) {
            console.error("❌ embedDocuments error:", error.message);
            throw error;
        }
    },
};
// Test the API on startup
(async () => {
    try {
        const testEmbed = await exports.embeddings.embedQuery("test");
        if (!testEmbed || testEmbed.length === 0) {
            console.error("❌ EMBEDDING API TEST FAILED: Returned empty embedding");
            console.error("API Key may be invalid or exhausted. Check your GOOGLE_API_KEY");
        }
        else {
            console.log("✅ Embedding API is working. Sample embedding size:", testEmbed.length);
        }
    }
    catch (error) {
        console.error("❌ EMBEDDING API ERROR on startup:", error.message);
    }
})();
