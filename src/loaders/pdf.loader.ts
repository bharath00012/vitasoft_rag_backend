import fs from "fs/promises";
import path from "path";

export const extractText = async (
  filePath: string,
  originalName?: string
): Promise<string> => {
  // Determine extension from actual path first, fallback to original name (multer strips extensions)
  let ext = path.extname(filePath).toLowerCase();
  if (!ext && originalName) {
    ext = path.extname(originalName).toLowerCase();
  }

  if (ext === ".txt") {
    // For text files, just read the content
    const text = await fs.readFile(filePath, "utf-8");
    return text.trim();
  }

  if (ext === ".pdf") {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const buffer = await fs.readFile(filePath);
    const uint8Array = new Uint8Array(buffer);

    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdf = await loadingTask.promise;

    let fullText = "";

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();

      const items = content.items.map((item: any) => ({
        str: item.str,
        x: item.transform[4],
        y: Math.round(item.transform[5] / 5) * 5,
      }));

      items.sort((a: any, b: any) => b.y - a.y || a.x - b.x);

      let pageText = "";
      let currentY: number | null = null;

      for (const item of items) {
        if (currentY !== item.y) {
          if (currentY !== null) pageText += "\n";
          currentY = item.y;
        } else {
          pageText += " \t ";
        }
        pageText += item.str;
      }

      fullText += pageText + "\n\n";
    }

    const rawText = fullText.replace(/\n{3,}/g, "\n\n").trim();
    return rawText;
  }

  throw new Error("Unsupported file type. Only .pdf and .txt are supported.");
};