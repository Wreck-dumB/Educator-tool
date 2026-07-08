import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rateLimit";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

const QUESTIONS_TOOL: Anthropic.Tool = {
  name: "generate_reflection_questions",
  description: "Generate personalised reflective practice questions for an early childhood educator based on a situation they've described.",
  input_schema: {
    type: "object",
    required: ["questions"],
    properties: {
      questions: {
        type: "array",
        minItems: 4,
        maxItems: 6,
        items: { type: "string" },
        description: "Tailored open-ended reflection questions. Each question should be specific to the situation described, not generic. Use 'you' directly. Avoid yes/no questions.",
      },
    },
  },
};

const SYSTEM_PROMPT = `You are a reflective practice coach for Australian early childhood educators. Your role is to generate thoughtful, situation-specific questions that help an educator deepen their professional reflection after a challenging or noteworthy event.

Questions must:
- Be directly relevant to the specific situation described
- Use the Gibbs Reflective Cycle or Driscoll model principles (describe, analyse, evaluate, plan)
- Be strengths-based and non-judgmental
- Be practical — the educator can answer from memory without special resources
- Avoid asking for clinical diagnoses or legal determinations
- Be phrased in a warm, collegial tone`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (isRateLimited(`reflection-questions:${user.id}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "You've hit the limit for reflection questions — try again later." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const context = typeof body?.context === "string" ? body.context.trim().slice(0, 2000) : "";
  const type = typeof body?.type === "string" ? body.type : "general";

  if (!context || context.length < 10) {
    return NextResponse.json({ error: "Please describe the situation first" }, { status: 400 });
  }

  const typeLabel =
    type === "post_incident" ? "post-incident reflection"
    : type === "end_of_day" ? "end-of-day reflection"
    : "general professional reflection";

  const userPrompt = `Reflection type: ${typeLabel}

Educator's description:
${context}

Generate 4-6 tailored reflection questions using the generate_reflection_questions tool.`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
      tools: [QUESTIONS_TOOL],
      tool_choice: { type: "tool", name: "generate_reflection_questions" },
    });

    const toolUse = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    if (!toolUse) throw new Error("No tool call returned");

    return NextResponse.json(toolUse.input);
  } catch (err) {
    console.error("Reflection question generation failed:", err);
    return NextResponse.json({ error: "Failed to generate questions" }, { status: 502 });
  }
}
