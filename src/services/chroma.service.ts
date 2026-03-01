import { ChromaClient, EmbeddingFunction } from "chromadb";
import { embeddings } from "./embedding.service";

/**
 * Custom embedding function
 */
class LocalEmbeddingFunction implements EmbeddingFunction {
  async generate(texts: string[]): Promise<number[][]> {
    return embeddings.embedDocuments(texts);
  }

  async generateForQueries(texts: string[]): Promise<number[][]> {
    return embeddings.embedDocuments(texts);
  }
}

const client = new ChromaClient({
  path: process.env.CHROMA_URL || "http://localhost:8000",
});

export const getOrCreateCollection = async (sessionId: string) => {
  const name = `session_${sessionId}`;

  try {
    return await client.getOrCreateCollection({
      name,
      embeddingFunction: new LocalEmbeddingFunction(),
    });
  } catch (err: any) {
    const msg = String(err?.message || err);

    // Fix old collections created without embedding function
    if (msg.includes("No embedding function configuration")) {
      console.log("Deleting old collection schema...");

      try {
        await client.deleteCollection({ name });
      } catch {}

      return await client.createCollection({
        name,
        embeddingFunction: new LocalEmbeddingFunction(),
      });
    }

    throw err;
  }
};

export const deleteCollection = async (sessionId: string) => {
  await client.deleteCollection({
    name: `session_${sessionId}`,
  });
};
