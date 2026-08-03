// Shared PDF/DOCX text extraction, used by both the document-review and
// document-review/regenerate routes.

import type { PolicyStep } from "@/lib/types/domain";

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

// Converts to Markdown rather than plain text so that heading/list structure
// survives extraction (see splitIntoBlocks) - a plain-text extraction throws
// away every paragraph style, which is what previously made regenerated
// policies collapse into one undifferentiated wall of numbered lines even
// though the wording itself was preserved correctly. Images are stripped
// (real-world docs commonly have an embedded letterhead/logo, which
// convertToMarkdown would otherwise inline as a giant base64 data URI).
// mammoth's bundled type declarations predate its convertToMarkdown export
// (present at runtime in the installed version, just untyped), so it's
// accessed via a narrow cast reusing convertToHtml's identical signature
// shape rather than an `any` escape hatch.
type MammothWithMarkdown = typeof import("mammoth") & {
  convertToMarkdown: typeof import("mammoth").convertToHtml;
};

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const mammoth = (await import("mammoth")) as unknown as MammothWithMarkdown;
  const noImages = mammoth.images.imgElement(() => Promise.resolve({ src: "" }));
  const result = await mammoth.convertToMarkdown({ buffer }, { convertImage: noImages });
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

// Above this size, a blank-line-free paragraph gets sentence-chunked (see
// splitLongParagraph) instead of kept whole - otherwise a PDF export with no
// blank lines between paragraphs (very common from pdf-parse) collapses the
// ENTIRE document into a single block, which defeats block-number reuse
// completely: the model would have to retype the whole document as new text
// on every regeneration, regardless of how small the requested edit is.
const MAX_BLOCK_CHARS = 600;

// Undoes Markdown's backslash-escaping of punctuation (mammoth's
// convertToMarkdown escapes characters like . ( ) * so they don't get
// misread as Markdown syntax on re-parse) so stored/displayed text is clean.
function unescapeMarkdown(text: string): string {
  return text.replace(/\\([\\`*_{}[\]()#+\-.!>])/g, "$1");
}

// Strips a line's bold/italic wrapper syntax (__text__, **text**, *text*,
// possibly nested/combined) leaving just the underlying text.
function stripEmphasis(text: string): string {
  let out = text.trim();
  while (true) {
    const boldMatch = out.match(/^(?:__(.+)__|\*\*(.+)\*\*)$/);
    if (boldMatch) {
      out = (boldMatch[1] ?? boldMatch[2]).trim();
      continue;
    }
    const italicMatch = out.match(/^\*(.+)\*$/);
    if (italicMatch) {
      out = italicMatch[1].trim();
      continue;
    }
    break;
  }
  return out;
}

// Removes leftover inline emphasis markers (partial bold/italic runs within
// an otherwise-plain paragraph or list item, e.g. "...costs incurred **at
// the family's expense**.") - common mid-sentence in real-world documents
// that mix ad hoc bold formatting into ordinary body text.
function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "$1");
}

// A line consisting entirely of bold (optionally also italic) text, and
// nothing else - the dominant real-world "heading" pattern in policy
// documents that use manual bold formatting for section titles rather than
// Word's actual Heading styles.
function isEntirelyBold(line: string): boolean {
  return /^(?:__.+__|\*\*.+\*\*)$/.test(line.trim());
}

// Matches a leading numbering/lettering marker: multi-level clause numbers
// (3.2, 4.2.1 - trailing '.'/')' optional since the dots between levels
// already make it unambiguous), a single number/letter/roman numeral
// (requires trailing '.'/')' since otherwise "A" or "I" would collide with
// real words), or a plain '-'/'*' bullet.
const NUMBERING_MARKER = String.raw`\d{1,3}(?:\.\d{1,3}){1,3}\.?|\d{1,3}[.)]|\(?[a-hj-zA-HJ-Z][.)]|\(?[ivxlc]+[.)]`;
const LIST_ITEM_RE = new RegExp(`^(\\s*)(?:[-*]|${NUMBERING_MARKER})\\s+(.*)$`);
const HASH_HEADING_RE = /^(#{1,6})\s+(.*)$/;

// A standalone line whose only marker is a multi-level clause number (e.g.
// "3.2 Serious Injuries", "4.2.1 Reporting") - in real policy documents this
// is how a numbered section/sub-section title reads when the author didn't
// also bold it, as distinct from a flat "1./2./3." or "-" marker which
// denotes an actual list item. Checked only for single-line groups so a
// genuine multi-item numbered sub-list (several such lines together) still
// falls through to ordinary list_item handling below.
const MULTI_LEVEL_HEADING_RE = /^(\d{1,3}(?:\.\d{1,3}){1,3})\.?\s+(.*)$/;

// Strips a leading numbering/lettering marker that survived into a heading or
// paragraph line (e.g. "1. Purpose", "3.2 Minor Injuries", "(a) ...") - the
// same clause-numbering schemes LIST_ITEM_RE recognises, but applied to text
// that isn't itself a list item (a numbered heading, or a numbered paragraph
// that didn't get list-detected because it's alone in its blank-line group).
// Without this, hierarchical policy numbering (very common in real-world
// documents) survives unchanged into reused blocks and shows up literally in
// the rendered output, making it look like every point has been numbered.
const LEADING_NUMBERING_RE = new RegExp(`^(?:${NUMBERING_MARKER})\\s+`);
function stripLeadingNumbering(text: string): string {
  return text.replace(LEADING_NUMBERING_RE, "");
}

// Chunks a long, blank-line-free paragraph into sentence-sized blocks so it
// can still benefit from block-number reuse. Groups sentences together up
// to MAX_BLOCK_CHARS rather than emitting one block per sentence, to avoid
// exploding the block count (and prompt size) on very long sections.
function splitLongParagraph(para: string): string[] {
  const sentences = para
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current && current.length + sentence.length + 1 > MAX_BLOCK_CHARS) {
      chunks.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current) chunks.push(current);

  return chunks.length > 0 ? chunks : [para];
}

// Splits extracted document text into an ordered list of typed blocks
// (heading / list_item / paragraph), so the AI can reference an unchanged
// block by index (preserving both its wording and how it looked) instead of
// retyping it. Text is expected to be Markdown-flavoured (from
// extractTextFromDocx) but plain text (from extractTextFromPdf) degrades
// gracefully to all-paragraph blocks, since it has no recoverable structure.
export function splitIntoBlocks(text: string): PolicyStep[] {
  const groups = text
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const steps: PolicyStep[] = [];

  for (const group of groups) {
    const lines = group.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    if (lines.length === 1) {
      const hashMatch = lines[0].match(HASH_HEADING_RE);
      if (hashMatch) {
        const headingText = stripLeadingNumbering(unescapeMarkdown(stripEmphasis(hashMatch[2])));
        if (headingText) steps.push({ type: "heading", level: hashMatch[1].length - 1, text: headingText });
        continue;
      }
      if (isEntirelyBold(lines[0])) {
        const headingText = stripLeadingNumbering(unescapeMarkdown(stripEmphasis(lines[0])));
        if (headingText) steps.push({ type: "heading", level: 0, text: headingText });
        continue;
      }
      const multiLevelMatch = lines[0].match(MULTI_LEVEL_HEADING_RE);
      if (multiLevelMatch) {
        const headingText = unescapeMarkdown(stripInlineMarkdown(multiLevelMatch[2]));
        // Distinguishes an actual numbered section title ("3.2 Serious
        // Injuries") from a numbered clause of body text ("4.2.1 Staff must
        // check the first aid kit weekly.") - titles are short and don't end
        // in sentence-terminal punctuation; clauses read as full sentences.
        const looksLikeTitle = headingText.length > 0 && headingText.length <= 80 && !/[.!?]$/.test(headingText);
        if (looksLikeTitle) {
          const level = multiLevelMatch[1].split(".").length - 1;
          steps.push({ type: "heading", level, text: headingText });
          continue;
        }
      }
    }

    const listLines = lines.filter((l) => LIST_ITEM_RE.test(l));
    if (listLines.length === lines.length) {
      for (const line of lines) {
        const match = line.match(LIST_ITEM_RE);
        if (!match) continue;
        const level = Math.floor(match[1].length / 2);
        const itemText = unescapeMarkdown(stripInlineMarkdown(match[2]));
        if (itemText) steps.push({ type: "list_item", level, text: itemText });
      }
      continue;
    }

    const paraText = stripLeadingNumbering(unescapeMarkdown(stripInlineMarkdown(lines.join(" "))));
    if (!paraText) continue;
    if (paraText.length > MAX_BLOCK_CHARS) {
      splitLongParagraph(paraText).forEach((t) => steps.push({ type: "paragraph", level: 0, text: t }));
    } else {
      steps.push({ type: "paragraph", level: 0, text: paraText });
    }
  }

  return steps;
}
