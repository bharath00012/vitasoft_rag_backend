import { ChromaClient, EmbeddingFunction, registerEmbeddingFunction } from "chromadb";
import { embeddings } from "./embedding.service";

// define a lightweight embedding function wrapper so we can store the
// configuration in collections and avoid the default-embed requirement. we
// register it by name so the client can instantiate it when deserializing
// collections.
class LocalEmbeddingFunction implements EmbeddingFunction {
  name = "local_embed";

  async generate(texts: string[]): Promise<number[][]> {
    return embeddings.embedDocuments(texts);
  }

  async generateForQueries(texts: string[]): Promise<number[][]> {
    return embeddings.embedDocuments(texts);
  }
}

// registration is idempotent; ignore errors if already registered
try {
  registerEmbeddingFunction("local_embed", LocalEmbeddingFunction);
} catch {}

const client = new ChromaClient({
  path: process.env.CHROMA_URL || "http://localhost:8000",
});

export const getOrCreateCollection = async (sessionId: string) => {
  const name = `session_${sessionId}`;
  const opts = {
    name,
    // use our registered embedding function so the schema does not reference
    // default-embed.  known functions are serialized by name+config.
    embeddingFunction: {
      type: "known" as const,
      name: "local_embed",
      config: {},
    },
  };

  try {
    return await client.getOrCreateCollection(opts);
  } catch (err: any) {
    const msg = String(err?.message || err);
    console.error("Chroma collection error:", msg);
    // If deserialization complains about DefaultEmbeddingFunction, try to recover
    if (msg.includes("DefaultEmbeddingFunction") || msg.includes("default-embed")) {
      try {
        console.log(`Removing problematic collection ${name} and recreating.`);
        await client.deleteCollection({ name });
      } catch (delErr) {
        console.warn("Failed to delete collection during recovery:", delErr);
      }
      // create a fresh collection with our explicit options
      return client.createCollection(opts as any);
    }
    throw err;
  }
};

export const deleteCollection = async (sessionId: string) => {
  await client.deleteCollection({
    name: `session_${sessionId}`,
  });
};