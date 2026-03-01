export interface RetrieverConfig {
    topK: number;
    similarityThreshold: number;
}

export interface Chunk {
    text: string;
    embedding: number[];
    index: number;
}

export interface RetrievedChunk {
    text: string;
    score: number;
    index: number;
}

/**
 * Computes cosine similarity between two PRE-NORMALIZED unit vectors.
 * Since both vectors have L2 norm = 1, cosine similarity = dot product.
 * This is O(n) with no additional sqrt needed — bonus optimization.
 *
 * Manual implementation as required by the assessment.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
        throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
    }

    let dot = 0;
    for (let i = 0; i < a.length; i++) {
        dot += (a[i] ?? 0) * (b[i] ?? 0);
    }

    // Clamp to [-1, 1] to handle floating point imprecision
    return Math.min(1, Math.max(-1, dot));
}

/**
 * Retrieves the Top K most semantically similar chunks to a query embedding.
 *
 * Steps:
 *   1. Compute cosine similarity between query and each stored chunk
 *   2. Sort by score descending
 *   3. Return Top K results
 *
 * @param queryEmbedding - Normalized embedding of the user's question
 * @param chunks         - All stored chunks for this session
 * @param config         - topK and similarityThreshold (from env or request)
 */
export function retrieveTopK(
    queryEmbedding: number[],
    chunks: Chunk[],
    config?: Partial<RetrieverConfig>
): RetrievedChunk[] {
    const topK = config?.topK ?? 5;

    const scored: RetrievedChunk[] = chunks.map((chunk) => ({
        text: chunk.text,
        score: cosineSimilarity(queryEmbedding, chunk.embedding),
        index: chunk.index,
    }));

    // Sort descending by similarity score
    scored.sort((a, b) => b.score - a.score);

    // Return Top K
    return scored.slice(0, topK);
}

/**
 * Guardrail: checks if the best similarity score meets the threshold.
 * If not, the question is considered out of scope — LLM is NOT called.
 *
 * @returns true  → question is in scope, proceed to LLM
 * @returns false → question is out of scope, return rejection message
 */
export function isInScope(
    topChunks: RetrievedChunk[],
    config?: Partial<RetrieverConfig>
): boolean {
    const threshold = config?.similarityThreshold ?? 0.20;

    if (topChunks.length === 0) return false;

    const bestScore = topChunks[0]?.score ?? 0;
    return bestScore >= threshold;
}

/**
 * Builds a prompt for the LLM using only retrieved context chunks.
 * Strictly prevents the model from using external knowledge.
 *
 * Includes token budget management — caps context at ~3000 chars
 * to stay within safe limits for gpt-4o-mini.
 */
export function buildPrompt(
    question: string,
    topChunks: RetrievedChunk[]
): { systemPrompt: string; userMessage: string } {
    const MAX_CONTEXT_CHARS = 3000;

    let contextText = '';
    for (const chunk of topChunks) {
        const addition = `[Chunk ${chunk.index + 1} | Score: ${chunk.score.toFixed(3)}]\n${chunk.text}\n\n`;
        if (contextText.length + addition.length > MAX_CONTEXT_CHARS) break;
        contextText += addition;
    }

    const systemPrompt = `You are a precise document Q&A assistant.
Answer the user's question ONLY using the context provided below.
Do NOT use any knowledge outside of the provided context.
If the answer cannot be found in the context, respond EXACTLY with:
"This question is outside the scope of uploaded documents."

CONTEXT:
${contextText.trim()}`;

    return { systemPrompt, userMessage: question.trim() };
}
