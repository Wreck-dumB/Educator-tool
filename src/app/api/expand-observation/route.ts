"use server";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rateLimit";
import { runTextCall } from "@/lib/ai/backend";

const FORMAT_INSTRUCTIONS: Record<string, string> = {
  anecdotal: `Rewrite as a polished anecdotal record. Use specific, objective, factual language — what was seen, heard, said. Third person. Present tense description of the moment. No interpretation in the main body. End with one sentence linking to EYLF outcomes if relevant. 2–4 sentences total.`,

  learning_story: `Rewrite as a full learning story. Structure:
1. Opening narrative paragraph (first or second person, e.g. "Today I watched you..." or "Something remarkable happened today...") — 3–5 sentences capturing the moment richly.
2. "What this tells me" section (educator voice, 2–3 sentences): what learning is visible, which EYLF outcomes/dispositions are demonstrated.
3. "What comes next" sentence: one planned provocation or extension.
Write with warmth, specificity, and a sense of wonder. This will be shared with families.`,

  running_record: `Rewrite as a running record. Format as timestamped sequential entries (use approximate times from the note or invent plausible ones ~2 min apart). Each entry describes a discrete observable action, utterance, or interaction. Plain factual language. 4–7 timestamped lines. Add a brief "Setting" line at the top.`,

  jotting: `Rewrite as a clean, precise jotting. One to two sentences maximum. Factual, specific — names, direct quotes if present, observable behaviour only. No interpretation. Quick-capture style.`,

  work_sample: `Rewrite as a work sample observation. Include:
1. Process description: what the child did, said, or decided while creating (3–4 sentences, past tense, specific).
2. Product description: brief description of the output.
3. Educator analysis (2 sentences): what skills, thinking, or learning this demonstrates, with EYLF link.`,

  photo_caption: `Rewrite as a reflective photo caption. 3–5 sentences. Start with what the photo shows (specific, observable). Then explain WHY this moment matters for the child's learning — go beyond the image description to name the learning process, disposition, or milestone visible. End with an EYLF link. Written for families to read alongside the photo.`,

  developmental_note: `Rewrite as a developmental note. Structure:
1. Observation statement (1–2 sentences): specific, factual, what was observed in this developmental domain.
2. Developmental significance (1–2 sentences): what stage/milestone this demonstrates or approaches, referenced to relevant developmental framework.
3. Next steps (1 sentence): planned support, extension, or whether a family conversation or referral is warranted.`,
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (await isRateLimited(`expand-obs:${user.id}`, 30, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Rate limit reached — try again in a moment." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const draftNote = (body?.draftNote as string)?.trim().slice(0, 2000) ?? "";
  const obsType = (body?.obsType as string) ?? "anecdotal";
  const childName = (body?.childName as string)?.trim().slice(0, 100) ?? "";
  const childInterests = (body?.childInterests as string)?.trim().slice(0, 300) ?? "";

  if (!draftNote || draftNote.length < 10) {
    return NextResponse.json({ error: "Draft note too short to expand." }, { status: 400 });
  }

  const formatInstructions = FORMAT_INSTRUCTIONS[obsType] ?? FORMAT_INSTRUCTIONS.anecdotal;

  const systemPrompt = `You are an experienced early childhood educator writing professional EYLF-aligned documentation for an Australian childcare service. Write clearly and specifically. Never fabricate details not present in the draft — only expand, reframe, and structure what is already there. Return ONLY the observation text itself, no labels, headers, or meta-commentary.`;

  const userPrompt = `Child: ${childName || "the child"}${childInterests ? `\nChild's known interests: ${childInterests}` : ""}

Draft note (may be a quick jotting or rough notes):
${draftNote}

Observation format required: ${obsType}

Instructions:
${formatInstructions}

Write the observation now:`;

  const rawText = await runTextCall({
    model: "claude-haiku-4-5-20251001",
    maxTokens: 600,
    messages: [{ role: "user", content: userPrompt }],
    system: systemPrompt,
  });

  const expanded = rawText.trim();

  if (!expanded) {
    return NextResponse.json({ error: "AI did not return content." }, { status: 500 });
  }

  return NextResponse.json({ expanded });
}
