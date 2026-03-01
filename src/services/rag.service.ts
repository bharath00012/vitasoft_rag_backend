import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat";
import { embeddings } from "./embedding.service";
import { getOrCreateCollection } from "./chroma.service";
import { retrieveTopK, isInScope, buildPrompt } from "../services/retriever";
import { getRagConfig } from "../config/rag.config";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const OUT_OF_SCOPE_MESSAGE =
  "This question is outside the scope of uploaded documents.";

const chatMemory = new Map<string, ChatCompletionMessageParam[]>();

export const answerQuestion = async (
  sessionId: string,
  question: string
) => {
  const config = getRagConfig();
  const collection = await getOrCreateCollection(sessionId);

  /* -----------------------------
     1️⃣ Load Memory
  ----------------------------- */

  const history: ChatCompletionMessageParam[] =
    chatMemory.get(sessionId) ?? [];

  let queryForEmbedding = question;

  if (history.length >= 2) {
    const lastUser = [...history]
      .reverse()
      .find((h) => h.role === "user");

    const lastAssistant = [...history]
      .reverse()
      .find((h) => h.role === "assistant");

    if (lastUser && lastAssistant && typeof lastUser.content === "string" && typeof lastAssistant.content === "string") {
      queryForEmbedding =
        `${lastUser.content} ${lastAssistant.content} ${question}`;
    }
  }

  /* -----------------------------
     2️⃣ Embed Question
  ----------------------------- */

  const queryEmbedding =
    await embeddings.embedQuery(queryForEmbedding);

  /* -----------------------------
     3️⃣ Load Stored Chunks
  ----------------------------- */

  const results = await collection.get({
    include: ["documents", "embeddings"],
  });

  if (!results.documents?.length || !results.embeddings?.length) {
    throw new Error("No documents uploaded.");
  }

  const chunks = results.documents.map((text, index) => ({
    text,
    embedding: results.embeddings![index] ?? [],
    index,
  }));

  /* -----------------------------
     4️⃣ Retrieve Top K
  ----------------------------- */

  const topChunks = retrieveTopK(queryEmbedding, chunks, {
    topK: config.topK,
    similarityThreshold: config.similarityThreshold,
  });

  /* -----------------------------
     5️⃣ Guardrail Check
  ----------------------------- */

  if (!isInScope(topChunks, {
    similarityThreshold: config.similarityThreshold,
  })) {
    console.log(`[answerQuestion] OUT_OF_SCOPE score=${topChunks[0]?.score.toFixed(3)}`);
    return {
      answer: OUT_OF_SCOPE_MESSAGE,
      score: topChunks[0]?.score ?? 0,
      outOfScope: true,
    };
  }

  const bestScore = topChunks[0].score;
  console.log(`[answerQuestion] IN_SCOPE score=${bestScore.toFixed(3)}`);

  /* -----------------------------
     6️⃣ Build Prompt
  ----------------------------- */

  const { systemPrompt, userMessage } =
    buildPrompt(question, topChunks);

  /* -----------------------------
     7️⃣ Call OpenAI
  ----------------------------- */

  const completion =
    await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: userMessage },
      ],
    });

  const finalAnswer =
    completion.choices[0]?.message?.content?.trim() ??
    OUT_OF_SCOPE_MESSAGE;

  /* -----------------------------
     8️⃣ Update Memory
  ----------------------------- */

  const updatedHistory: ChatCompletionMessageParam[] = [
    ...history,
    { role: "user", content: question },
    { role: "assistant", content: finalAnswer },
  ];

  const MAX_HISTORY = 10;

  chatMemory.set(
    sessionId,
    updatedHistory.slice(-MAX_HISTORY)
  );

  /* -----------------------------
     9️⃣ Return
  ----------------------------- */

  return {
    answer: finalAnswer,
    score: bestScore,
    outOfScope: false,
  };
};