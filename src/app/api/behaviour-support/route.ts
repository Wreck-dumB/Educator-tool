import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rateLimit";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

const PROPOSE_SUPPORT_TOOL: Anthropic.Tool = {
  name: "propose_support_strategies",
  description:
    "Propose practical de-escalation and behaviour support strategies for an early childhood educator dealing with a specific situation involving a child.",
  input_schema: {
    type: "object",
    required: ["patterns_observed", "immediate_strategies", "longer_term_adjustments", "when_to_escalate"],
    properties: {
      patterns_observed: {
        type: "array",
        items: { type: "string" },
        description:
          "Patterns or context from the child's history and profile that are relevant to the current situation. Be specific and evidence-based — only note patterns genuinely visible in the data provided.",
      },
      immediate_strategies: {
        type: "array",
        minItems: 3,
        maxItems: 6,
        items: { type: "string" },
        description:
          "Concrete, actionable de-escalation strategies the educator can use right now or in the next session. Each strategy should be a complete sentence explaining what to do and briefly why it may help for this specific child.",
      },
      longer_term_adjustments: {
        type: "array",
        minItems: 2,
        maxItems: 4,
        items: { type: "string" },
        description:
          "Environmental, routine, or relational adjustments to consider over the coming weeks to reduce the frequency or intensity of these situations.",
      },
      when_to_escalate: {
        type: "array",
        minItems: 2,
        maxItems: 4,
        items: { type: "string" },
        description:
          "Specific signs or circumstances that should prompt the educator to involve the Director, the child's family, or an external support service (e.g. speech pathologist, inclusion support).",
      },
    },
  },
};

const SYSTEM_PROMPT = `You are a specialist early childhood behaviour support consultant helping Australian educators manage difficult situations in an age-appropriate, developmentally informed way.

Your advice must be:
- Grounded in the child's actual profile and history provided, not generic
- Practical for a busy educator in a group care setting
- Consistent with the Australian EYLF (Early Years Learning Framework) and the National Quality Standard
- Trauma-informed and strengths-based
- Never diagnostic — you don't know this child's full clinical picture

When you see incident patterns in the data, name them specifically (e.g. "incidents appear to cluster around transition times" or "this child's recent incidents involve physical aggression towards peers, which may indicate frustration when verbal communication breaks down"). If the data is sparse, say so honestly rather than speculating.

Frame all strategies positively and practically — what to DO, not just what to avoid.

PRIVACY: Never include or repeat any child's name, date of birth, or any personal identifier in your response. Refer to the child only as "the child". This is a child safety requirement.`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (isRateLimited(`behaviour-support:${user.id}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "You've hit the support strategy limit for now — try again in a bit." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const childId = typeof body?.childId === "string" ? body.childId.trim() : "";
  const situation = typeof body?.situation === "string" ? body.situation.trim().slice(0, 2000) : "";

  if (!childId || !situation) {
    return NextResponse.json({ error: "Child and situation description are required" }, { status: 400 });
  }

  // Fetch child profile + recent observations + recent incidents (all RLS-filtered to the caller's service)
  const [{ data: child }, { data: observations }, { data: incidents }] = await Promise.all([
    supabase.from("children").select("first_name, date_of_birth, current_interests, additional_needs").eq("id", childId).single(),
    supabase.from("observations").select("note_text, observed_at").eq("child_id", childId).order("observed_at", { ascending: false }).limit(15),
    supabase.from("child_incident_reports").select("record_type, occurred_at, description, action_taken").eq("child_id", childId).order("occurred_at", { ascending: false }).limit(15),
  ]);

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Build age string
  let ageText = "age unknown";
  if (child.date_of_birth) {
    const dob = new Date(child.date_of_birth);
    const now = new Date();
    const months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    ageText = remMonths > 0 ? `${years} yr ${remMonths} mo` : `${years} yr`;
  }

  const incidentSummary =
    incidents && incidents.length > 0
      ? incidents
          .map(
            (i) =>
              `- ${new Date(i.occurred_at).toLocaleDateString("en-AU")}: ${i.record_type} — ${i.description}` +
              (i.action_taken ? ` (action: ${i.action_taken})` : ""),
          )
          .join("\n")
      : "No incidents on record.";

  const observationSummary =
    observations && observations.length > 0
      ? observations.map((o) => `- ${new Date(o.observed_at).toLocaleDateString("en-AU")}: ${o.note_text}`).join("\n")
      : "No observations on record.";

  const userPrompt = `Child: the child (${ageText})
Current interests: ${child.current_interests || "not recorded"}
Additional needs: ${child.additional_needs || "none recorded"}

Recent incidents (most recent first):
${incidentSummary}

Recent observations (most recent first):
${observationSummary}

Current situation described by educator:
${situation}

Propose support strategies using the propose_support_strategies tool.`;

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
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
      tools: [PROPOSE_SUPPORT_TOOL],
      tool_choice: { type: "tool", name: "propose_support_strategies" },
    });

    const toolUse = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    if (!toolUse) throw new Error("No tool call returned");
    result = toolUse.input;
  } catch (err) {
    console.error("Behaviour support generation failed:", err);
    return NextResponse.json({ error: "Failed to generate support strategies" }, { status: 502 });
  }

  return NextResponse.json(result);
}
