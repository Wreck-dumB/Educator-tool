// Shared PDF/DOCX text extraction, used by both the document-review and
// document-review/regenerate routes.

// The model has a 1M-token (~4M character) context window, so this cap exists only
// to keep any single review's cost and latency bounded — not because of a model limit.
// 200,000 chars is ~40-50 pages of dense text, comfortably larger than any single
// childcare policy or procedures manual, while using only ~5% of the context window.
export const MAX_TEXT_CHARS = 200000;

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  const data = await parser.getText();
  return data.text ?? "";
}

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value ?? "";
}

export function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export function isDocxFile(file: File): boolean {
  return (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.toLowerCase().endsWith(".docx")
  );
}

// Splits raw extracted document text into an ordered list of coherent
// blocks (paragraphs, or individual items where a paragraph is really a
// run of numbered list items squashed together by PDF/DOCX extraction).
// Lets the AI reference an unchanged block by index instead of retyping
// it - regeneration only has to pay (in tokens, time, and fidelity risk)
// for what's actually changing, not for reproducing the whole document.
export function splitIntoBlocks(text: string): string[] {
  const paragraphs = text
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const blocks: string[] = [];
  const numberedItemMarker = /(?:^|\n)\s*\d{1,3}[.)]\s+/g;

  for (const para of paragraphs) {
    const markerCount = (para.match(numberedItemMarker) ?? []).length;
    if (markerCount > 1) {
      const parts = para
        .split(/(?=(?:^|\n)\s*\d{1,3}[.)]\s+)/)
        .map((s) => s.trim())
        .filter(Boolean);
      blocks.push(...parts);
    } else {
      blocks.push(para);
    }
  }

  return blocks;
}
