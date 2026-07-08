import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rateLimit";

export const runtime = "nodejs";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
const MAX_TEXT_CHARS = 15000;

const REVIEW_TOOL: Anthropic.Tool = {
  name: "review_document",
  description: "Review an uploaded early childhood centre document and provide structured feedback.",
  input_schema: {
    type: "object",
    required: ["document_type_detected", "quality_score", "summary", "strengths", "gaps", "suggestions", "import_recommendation"],
    properties: {
      document_type_detected: {
        type: "string",
        description: "What type of document this appears to be (e.g. 'Excursion Policy', 'Enrolment Form', 'Safe Work Procedure', 'Risk Assessment').",
      },
      quality_score: {
        type: "integer",
        description: "Overall quality score from 1 (poor) to 10 (excellent).",
      },
      summary: {
        type: "string",
        description: "2-3 sentence plain-language summary of what this document is and its current state.",
      },
      strengths: {
        type: "array",
        items: { type: "string" },
        description: "What the document does well — be specific, reference actual content where possible.",
      },
      gaps: {
        type: "array",
        items: { type: "string" },
        description: "Specific things missing, unclear, or that don't meet current NQS/EYLF/WHS/regulatory expectations for this document type.",
      },
      nqs_alignment: {
        type: "array",
        items: { type: "string" },
        description: "Specific NQS Quality Areas or Standards this document addresses or should address. Use exact standard codes (e.g. 'QA2.1.3'). Omit if not a policy/procedure.",
      },
      suggestions: {
        type: "array",
        items: { type: "string" },
        description: "Concrete, actionable suggestions for improvement — each as a complete sentence. Max 6.",
      },
      import_recommendation: {
        type: "string",
        enum: ["ready", "minor_edits", "major_rewrite"],
        description: "'ready' = can import as-is; 'minor_edits' = small tweaks needed first; 'major_rewrite' = significant work needed before importing.",
      },
    },
  },
};

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  const data = await parser.getText();
  return data.text ?? "";
}

async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value ?? "";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (isRateLimited(`document-review:${user.id}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "You've reached the document review limit for now — try again in an hour." },
      { status: 429 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Could not read the uploaded file" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const category = (formData.get("category") as string | null) ?? "other";

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File is too large (max 20 MB)" }, { status: 400 });
  }

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isDocx =
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.toLowerCase().endsWith(".docx");

  if (!isPdf && !isDocx) {
    return NextResponse.json({ error: "Only PDF and DOCX files are supported" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let rawText: string;
  try {
    rawText = isPdf ? await extractTextFromPdf(buffer) : await extractTextFromDocx(buffer);
  } catch (err) {
    console.error("Text extraction failed:", err);
    return NextResponse.json({ error: "Could not read the file content — try a different format" }, { status: 422 });
  }

  rawText = rawText.trim();
  if (rawText.length < 50) {
    return NextResponse.json(
      { error: "Not enough readable text found — the file may be scanned or image-only" },
      { status: 422 },
    );
  }

  const truncated = rawText.length > MAX_TEXT_CHARS;
  const documentText = rawText.slice(0, MAX_TEXT_CHARS);

  const systemPrompt = `You are an Australian early childhood education compliance specialist reviewing documents for services registered under the Education and Care Services National Law and Regulations. Your feedback must be:
- Specific to the Australian NQS (National Quality Standard), EYLF V2.0, and relevant WHS/state regulations
- Practical for a small-to-medium childcare service (not a large bureaucratic organisation)
- Honest about gaps without being harsh — frame everything as "here's how to make it better"
- Focused on what matters for ACECQA assessment and real operational use`;

  const userPrompt = `Document filename: ${file.name}
Document category the educator selected: ${category}${truncated ? "\n\n[Note: This document was truncated to fit — only the first ~15,000 characters are shown]" : ""}

--- DOCUMENT TEXT START ---
${documentText}
--- DOCUMENT TEXT END ---

Please review this document using the review_document tool.`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  let result;
  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      tools: [REVIEW_TOOL],
      tool_choice: { type: "tool", name: "review_document" },
    });

    const toolUse = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    if (!toolUse) throw new Error("No tool call returned");
    result = toolUse.input;
  } catch (err) {
    console.error("Document review generation failed:", err);
    return NextResponse.json({ error: "AI review failed — please try again" }, { status: 502 });
  }

  return NextResponse.json(Object.assign({}, result as object, { filename: file.name, truncated }));
}
