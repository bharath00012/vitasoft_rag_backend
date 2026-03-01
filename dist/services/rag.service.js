"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.answerQuestion = void 0;
const embedding_service_1 = require("./embedding.service");
const chroma_service_1 = require("./chroma.service");
const cosine_1 = require("../utils/cosine");
const rag_config_1 = require("../config/rag.config");
const google_genai_1 = require("@langchain/google-genai");
const llm = new google_genai_1.ChatGoogleGenerativeAI({
    apiKey: "AIzaSyD8r-9YW4fvonyB_MCO945VhKvduzqdxjU",
    model: "gemini-2.5-flash",
    temperature: 0,
});
const answerQuestion = async (sessionId, question) => {
    const collection = await (0, chroma_service_1.getOrCreateCollection)(sessionId);
    const queryEmbedding = await embedding_service_1.embeddings.embedQuery(question);
    const results = await collection.get({
        include: ["documents", "embeddings"],
    });
    if (!results.embeddings?.length) {
        throw new Error("No documents uploaded.");
    }
    const scored = results.embeddings.map((emb, i) => ({
        text: results.documents[i],
        score: (0, cosine_1.cosineSimilarity)(queryEmbedding, emb),
    }));
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, rag_config_1.RAG_CONFIG.topK);
    if (top[0].score < rag_config_1.RAG_CONFIG.similarityThreshold) {
        return {
            answer: "This question is outside the scope of uploaded documents.",
            score: top[0].score
        };
    }
    const context = top.map(t => t.text).join("\n\n");
    const prompt = `
SYSTEM INSTRUCTION (STRICT DOCUMENT MODE):

You are a STRICT document-based QA system.

CRITICAL RULES:
1. You MUST answer using ONLY the provided context.
2. You are FORBIDDEN from using any external knowledge.
3. You MAY perform simple operations like counting, listing, or extracting 
   information ONLY if the data exists in the context.
4. Do NOT guess.
5. Do NOT add new information.
6. If the answer cannot be determined strictly from the context, respond EXACTLY with:

"This question is outside the scope of uploaded documents."

7. Do NOT explain reasoning.
8. Provide only the final answer.

---------------------
CONTEXT:
${context}
---------------------

QUESTION:
${question}

FINAL ANSWER:
`;
    const response = await llm.invoke(prompt);
    const finalAnswer = response.content.toString().trim();
    // Extra safety enforcement (no logic change, just guard)
    if (!finalAnswer ||
        finalAnswer.toLowerCase().includes("not mentioned") ||
        finalAnswer.toLowerCase().includes("cannot find") ||
        finalAnswer.toLowerCase().includes("not provided")) {
        return {
            answer: "This question is outside the scope of uploaded documents.",
            score: top[0].score
        };
    }
    return { answer: finalAnswer, score: top[0].score };
};
exports.answerQuestion = answerQuestion;
