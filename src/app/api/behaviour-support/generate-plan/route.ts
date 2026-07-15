import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rateLimit";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

const GENERATE_PLAN_TOOL: Anthropic.Tool = {
  name: "generate_bsp_strategies",
  description:
    "Generate structured Behaviour Support Plan strategies for an early childhood educator, " +
    "suitable for a formal plan shared with families and external services.",
  input_schema: {
    type: "object",
    required: [
      "educator_strategies",
      "family_strategies",
      "environment_adjustments",
    ],
    properties: {
      educator_strategies: {
        type: "string",
        description:
          "3-5 practical, proactive strategies for educators at the service. " +
          "Write as a clear prose paragraph or a short numbered list. " +
          "Focus on what educators will consistently DO, not avoid. " +
          "Ground strategies in the specific behaviour, triggers, and hypothesised function provided.",
      },
      family_strategies: {
        type: "string",
        description:
          "3-4 home-based strategies families can use to maintain consistency with the service approach. " +
          "Written in warm, accessible language suitable for a parent to read directly. " +
          "Avoid jargon. Focus on practical, everyday moments.",
      },
      environment_adjustments: {
        type: "string",
        description:
          "2-3 adjustments to the physical or social environment that may reduce triggers or " +
          "support the child's regulation. E.g. seating arrangements, transition warnings, " +
          "visual schedules, sensory considerations.",
      },
    },
  },
};

const SYSTEM_PROMPT = `You are a specialist early childhood behaviour support consultant helping Australian educators develop formal Behaviour Support Plans (BSPs).

Your strategies must be:
- Strengths-based and trauma-informed
- Grounded in the specific behaviour description, triggers, and hypothesised function provided
- Practical for a busy early childhood educator in a group care setting
- Consistent with the Australian EYLF and the National Quality Standard
- Written at a level appropriate for formal documentation and family sharing
- Never diagnostic — frame everything as "may help" or "can support", not clinical conclusions
- Framed around what to DO, never just what to avoid

PRIVACY: Never include or repeat any child's name, date of birth, or personal identifiers. Refer to the child only as "the child".

This plan will be shared with families, so write with that audience in mind — warm, professional, and jargon-free.`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (isRateLimited(`bsp-plan:${user.id}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "You've hit the plan generation limit — try again in a bit." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const childId = typeof body?.childId === "string" ? body.childId.trim() : "";
  const behaviourDescription =
    typeof body?.behaviourDescription === "string"
      ? body.behaviourDescription.trim().slice(0, 2000)
      : "";
  const triggers =
    typeof body?.triggers === "string" ? body.triggers.trim().slice(0, 1000) : "";
  const frequency =
    typeof body?.frequency === "string" ? body.frequency.trim() : "sometimes";
  const behaviourFunction =
    typeof body?.behaviourFunction === "string"
      ? body.behaviourFunction.trim().slice(0, 1000)
      : "";
  const childStrengths =
    typeof body?.childStrengths === "string"
      ? body.childStrengths.trim().slice(0, 1000)
      : "";
  const childInterests =
    typeof body?.childInterests === "string"
      ? body.childInterests.trim().slice(0, 1000)
      : "";

  if (!childId || !behaviourDescription) {
    return NextResponse.json(
      { error: "Child and behaviour description are required" },
      { status: 400 },
    );
  }

  // Fetch child profile (RLS-filtered to caller's service)
  const { data: child } = await supabase
    .from("children")
    .select("date_of_birth, current_interests, additional_needs")
    .eq("id", childId)
    .single();

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  let ageText = "age unknown";
  if (child.date_of_birth) {
    const dob = new Date(child.date_of_birth);
    const months =
      (new Date().getFullYear() - dob.getFullYear()) * 12 +
      (new Date().getMonth() - dob.getMonth());
    const years = Math.floor(months / 12);
    const rem = months % 12;
    ageText = rem > 0 ? `${years} yr ${rem} mo` : `${years} yr`;
  }

  const prompt = `Child age: ${ageText}
Known strengths: ${childStrengths || child.current_interests || "not provided"}
Current interests: ${childInterests || child.current_interests || "not recorded"}
Additional needs or context: ${child.additional_needs || "none recorded"}

Behaviour described:
${behaviourDescription}

Known triggers:
${triggers || "not specified"}

Frequency: ${frequency}

Hypothesised function (what need the behaviour may be meeting):
${behaviourFunction || "not specified"}

Please generate structured Behaviour Support Plan strategies using the generate_bsp_strategies tool.`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
      tools: [GENERATE_PLAN_TOOL],
      tool_choice: { type: "tool", name: "generate_bsp_strategies" },
    });

    const toolUse = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    if (!toolUse) throw new Error("No tool call returned");

    return NextResponse.json(toolUse.input);
  } catch (err) {
    console.error("BSP strategy generation failed:", err);
    return NextResponse.json(
      { error: "Failed to generate strategies" },
      { status: 502 },
    );
  }
}
