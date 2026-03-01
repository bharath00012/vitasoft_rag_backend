"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractText = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const openai_1 = __importDefault(require("openai"));
const groq = new openai_1.default({
    apiKey: "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",
    baseURL: "https://api.groq.com/openai/v1",
});
const extractText = async (path) => {
    const pdfjsLib = await Promise.resolve().then(() => __importStar(require("pdfjs-dist/legacy/build/pdf.mjs")));
    const buffer = await promises_1.default.readFile(path);
    const uint8Array = new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdf = await loadingTask.promise;
    let fullText = "";
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const items = content.items.map((item) => ({
            str: item.str,
            x: item.transform[4],
            y: Math.round(item.transform[5] / 5) * 5,
        }));
        items.sort((a, b) => b.y - a.y || a.x - b.x);
        let pageText = "";
        let currentY = null;
        for (const item of items) {
            if (currentY !== item.y) {
                if (currentY !== null)
                    pageText += "\n";
                currentY = item.y;
            }
            else {
                pageText += " \t ";
            }
            pageText += item.str;
        }
        fullText += pageText + "\n\n";
    }
    const rawText = fullText
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    // 🔥 Advanced Structured Summary via Groq
    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant", // Advanced model
            temperature: 0,
            messages: [
                {
                    role: "system",
                    content: `
You are an advanced document intelligence system.
Extract structured information with high precision.
Always return structured key-value output.
`,
                },
                {
                    role: "user",
                    content: `
Analyze the following document text and produce a structured, detailed summary.

Rules:
- Detect document type automatically.
- Extract all key entities and relationships.
- Use clean key-value pairs.
- Preserve numbers exactly.
- If resume → Name, Contact, Skills, Projects (with descriptions), GPA, Education, Experience.
- If invoice/receipt → Vendor, Date, Total, Tax, Line Items.
- If general doc → Topic, Key Insights, Important Figures, Dates.

Document Text:
${rawText.substring(0, 30000)}
`,
                },
            ],
        });
        const summary = completion.choices[0].message.content ?? "";
        console.log(rawText + "\n\n--- STRUCTURED AI SUMMARY ---\n\n" + summary);
        return rawText + "\n\n--- STRUCTURED AI SUMMARY ---\n\n" + summary;
    }
    catch (error) {
        console.error("Groq summary failed:", error);
        return rawText;
    }
};
exports.extractText = extractText;
