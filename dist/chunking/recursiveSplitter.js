"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recursiveSplit = void 0;
const rag_config_1 = require("../config/rag.config");
const separators = ["\n\n", "\n", ". ", " "];
const recursiveSplit = (text) => {
    const chunkSize = rag_config_1.RAG_CONFIG.chunkSize;
    const splitRecursively = (content) => {
        if (content.length <= chunkSize)
            return [content];
        for (const sep of separators) {
            const parts = content.split(sep);
            if (parts.length === 1)
                continue;
            const chunks = [];
            let current = "";
            for (const part of parts) {
                if ((current + part).length > chunkSize) {
                    if (current)
                        chunks.push(current);
                    current = part;
                }
                else {
                    current += (current ? sep : "") + part;
                }
            }
            if (current)
                chunks.push(current);
            return chunks.flatMap(c => c.length > chunkSize ? splitRecursively(c) : [c]);
        }
        return [content.slice(0, chunkSize)];
    };
    return splitRecursively(text);
};
exports.recursiveSplit = recursiveSplit;
