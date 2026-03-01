import OpenAI from 'openai';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

// Lazy client — ensures dotenv.config() has run before this is called
let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _openai;
}

/**
 * Computes the L2 norm (magnitude) of a vector.
 */
function magnitude(vec: number[]): number {
  return Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
}

/**
 * Normalizes a vector to unit length (L2 norm = 1).
 * Pre-normalizing allows cosine similarity to be computed as a simple dot product.
 */
function normalizeVector(vec: number[]): number[] {
  const mag = magnitude(vec);
  if (mag === 0) return vec;
  return vec.map((v) => v / mag);
}

export const embeddings = {
  /**
   * Generates a normalized embedding for a single query string.
   */
  async embedQuery(text: string): Promise<number[]> {
    const response = await getOpenAI().embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.trim(),
      dimensions: EMBEDDING_DIMENSIONS,
    });

    const raw = response.data[0]?.embedding;
    if (!raw) {
      throw new Error('No embedding returned from OpenAI');
    }

    return normalizeVector(raw);
  },

  /**
   * Generates normalized embeddings for multiple texts in one API call (batch).
   * More efficient than calling embedQuery() in a loop.
   */
  async embedDocuments(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const response = await getOpenAI().embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts.map((t) => t.trim()),
      dimensions: EMBEDDING_DIMENSIONS,
    });

    return response.data
      .sort((a, b) => a.index - b.index)
      .map((item) => normalizeVector(item.embedding));
  },
};