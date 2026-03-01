export interface ChunkConfig {
    chunkSize: number;
    chunkOverlap: number;
}

/**
 * Splits text into overlapping chunks using a sliding window.
 * Reads config from env, falls back to provided config or defaults.
 *
 * Example with size=500, overlap=50:
 *   [0→500], [450→950], [900→1400] ...
 */
export function chunkText(text: string, config?: Partial<ChunkConfig>): string[] {
    const chunkSize =
        config?.chunkSize ??
        parseInt(process.env['CHUNK_SIZE'] ?? '500', 10);

    const chunkOverlap =
        config?.chunkOverlap ??
        parseInt(process.env['CHUNK_OVERLAP'] ?? '50', 10);

    if (chunkSize <= 0) throw new Error('chunkSize must be > 0');
    if (chunkOverlap < 0) throw new Error('chunkOverlap must be >= 0');
    if (chunkOverlap >= chunkSize) throw new Error('chunkOverlap must be < chunkSize');

    const chunks: string[] = [];
    const step = chunkSize - chunkOverlap;
    let start = 0;

    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        const chunk = text.slice(start, end).trim();
        if (chunk.length > 0) {
            chunks.push(chunk);
        }
        if (end === text.length) break;
        start += step;
    }

    return chunks;
}
