import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PositionedTextItem {
  str: string;
  x: number;
  y: number;
}

const getTextItemPosition = (item: any): PositionedTextItem => {
  const transform = Array.isArray(item.transform) ? item.transform : [];

  return {
    str: String(item.str || "").trim(),
    x: Number(transform[4]) || 0,
    y: Number(transform[5]) || 0,
  };
};

const textItemsToReadableText = (items: any[]) => {
  const positioned = items
    .map(getTextItemPosition)
    .filter((item) => item.str.length > 0)
    .sort((a, b) => {
      const yDiff = b.y - a.y;
      return Math.abs(yDiff) > 3 ? yDiff : a.x - b.x;
    });

  const lines: string[] = [];
  let currentLine: PositionedTextItem[] = [];
  let currentY: number | null = null;

  positioned.forEach((item) => {
    if (currentY === null || Math.abs(item.y - currentY) <= 3) {
      currentLine.push(item);
      currentY = currentY ?? item.y;
      return;
    }

    lines.push(currentLine.sort((a, b) => a.x - b.x).map((part) => part.str).join(" "));
    currentLine = [item];
    currentY = item.y;
  });

  if (currentLine.length > 0) {
    lines.push(currentLine.sort((a, b) => a.x - b.x).map((part) => part.str).join(" "));
  }

  return lines.join("\n");
};

export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useWorkerFetch: true,
    isEvalSupported: false,
  });

  const pdf = await loadingTask.promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent({
      includeMarkedContent: false,
      disableNormalization: false,
    });

    pages.push(textItemsToReadableText(textContent.items as any[]));
  }

  return pages.join("\n\n").trim();
}
