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
