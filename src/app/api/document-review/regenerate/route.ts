import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rateLimit";
import { getNqsStandards } from "@/lib/supabase/qip";
import { regeneratePolicyFromReview, type PriorDocumentReview } from "@/lib/anthropic";
import { MAX_TEXT_CHARS, extractTextFromPdf, extractTextFromDocx, isPdfFile, isDocxFile } from "@/lib/documentExtraction";

export const runtime = "nodejs";

// Finds the first NQS code in a review's nqs_alignment list that resolves to
// a real seeded Quality Area/Standard, e.g. "QA2.1.3" or "2.1" -> "2.1".
// Never trusts the model's own code at face value, same guardrail as
// /api/qip's standard_code validation.
function resolveNqsCode(codes: string[], validCodes: Set<string>): { qualityAreaNumber: number; standardCode: string | null } | null {
  for (const raw of codes) {
    const match = raw.match(/([1-7])\.(\d)/);
    if (!match) continue;
    const standardCode = `${match[1]}.${match[2]}`;
    return {
      qualityAreaNumber: Number(match[1]),
      standardCode: validCodes.has(standardCode) ? standardCode : null,
    };
  }
  return null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (isRateLimited(`document-review-regenerate:${user.id}`, 5, 60 * 60 * 1000)) {
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
  const amendmentNotes = ((formData.get("amendmentNotes") as string | null) ?? "").trim().slice(0, 3000);
  const priorReviewRaw = formData.get("priorReview") as string | null;

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  let priorReview: PriorDocumentReview;
  try {
    const parsed = JSON.parse(priorReviewRaw ?? "");
    priorReview = {
      documentTypeDetected: typeof parsed.documentTypeDetected === "string" ? parsed.documentTypeDetected : "Document",
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps.filter((g: unknown) => typeof g === "string") : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.filter((s: unknown) => typeof s === "string") : [],
      nqsAlignment: Array.isArray(parsed.nqsAlignment) ? parsed.nqsAlignment.filter((n: unknown) => typeof n === "string") : [],
    };
  } catch {
    return NextResponse.json({ error: "Missing the original review — please run the review again" }, { status: 400 });
  }

  const isPdf = isPdfFile(file);
  const isDocx = isDocxFile(file);
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
  const documentText = rawText.slice(0, MAX_TEXT_CHARS);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  let revised;
  try {
    revised = await regeneratePolicyFromReview(category, documentText, priorReview, amendmentNotes);
  } catch (err) {
    console.error("Policy regeneration failed:", err);
    const truncated = err instanceof Error && err.message.startsWith("AI_RESPONSE_TRUNCATED");
    return NextResponse.json(
      {
        error: truncated
          ? "The updated document was too long to generate in one go — try shorter amendment notes, or split the original document into smaller sections and review each separately."
          : "AI review failed — please try again",
      },
      { status: 502 },
    );
  }

  const standards = await getNqsStandards();
  const validCodes = new Set(standards.map((s) => s.code));
  const resolved = resolveNqsCode(priorReview.nqsAlignment, validCodes);

  const qipSuggestion = resolved
    ? {
        qualityAreaNumber: resolved.qualityAreaNumber,
        standardCode: resolved.standardCode,
        description: [
          `Updated "${revised.title}" to address gaps identified during AI document review` +
            (priorReview.gaps.length > 0 ? `: ${priorReview.gaps.slice(0, 5).join("; ")}` : "."),
          amendmentNotes ? `Also incorporated: ${amendmentNotes}` : null,
        ]
          .filter(Boolean)
          .join(" ")
          .slice(0, 2000),
      }
    : null;

  return NextResponse.json({
    policy: {
      title: revised.title,
      purpose: revised.purpose ?? null,
      scope: revised.scope ?? null,
      procedureSteps: revised.procedure_steps ?? [],
      relatedLegislation: revised.related_legislation ?? [],
      suggestedAdditions: revised.suggested_additions ?? [],
    },
    qipSuggestion,
  });
}
