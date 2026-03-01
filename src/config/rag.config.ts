export interface RagConfig {
  chunkSize: number;
  chunkOverlap: number;
  semanticThreshold: number;
  topK: number;
  similarityThreshold: number;
}

const defaultConfig: RagConfig = {
  chunkSize: 500,
  chunkOverlap: 50,
  semanticThreshold: 0.82,
  topK: 5,
  similarityThreshold: 0.20,
};

let currentConfig: RagConfig = { ...defaultConfig };

export const getRagConfig = () => currentConfig;

export const updateRagConfig = (data: Partial<RagConfig>) => {
  currentConfig = { ...currentConfig, ...data };
  return currentConfig;
};

export const resetRagConfig = () => {
  currentConfig = { ...defaultConfig };
  return currentConfig;
};