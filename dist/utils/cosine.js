"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cosineSimilarity = void 0;
const cosineSimilarity = (a, b) => {
    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dot / (magA * magB);
};
exports.cosineSimilarity = cosineSimilarity;
