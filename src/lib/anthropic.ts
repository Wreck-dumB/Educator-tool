import Anthropic from "@anthropic-ai/sdk";
import type { EylfOutcome } from "@/lib/types/domain";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export interface GenerationInput {
  mode: "materials" | "time" | "outcome" | "interest" | "surprise_me";
  materials?: string[];
  timeMinutes?: number;
  groupSize?: "solo" | "small_group" | "whole_group";
  energyLevel?: "calm" | "moderate" | "high";
  targetOutcomeCodes?: string[];
  childInterest?: string;
}

export interface RawActivitySuggestion {
  title: string;
  summary: string;
  steps: string[];
  materials_used: string[];
  reflection_prompts: string[];
  age_range?: string;
  duration_minutes?: number;
  energy_level?: "calm" | "moderate" | "high";
  group_size_fit?: "solo" | "small_group" | "whole_group";
  eylf_codes: string[];
}

const PROPOSE_ACTIVITIES_TOOL: Anthropic.Tool = {
  name: "propose_activities",
  description:
    "Propose 2-3 fun, play-based early childhood activities matching the educator's constraints, each linked to specific EYLF sub-outcome codes drawn only from the provided taxonomy.",
  input_schema: {
    type: "object",
    properties: {
      activities: {
        type: "array",
        minItems: 2,
        maxItems: 3,
        items: {
          type: "object",
          required: ["title", "summary", "steps", "materials_used", "reflection_prompts", "eylf_codes"],
          properties: {
            title: { type: "string" },
            summary: { type: "string", description: "One or two sentences describing the activity." },
            steps: { type: "array", items: { type: "string" }, description: "Short, concrete steps an educator can follow." },
            materials_used: { type: "array", items: { type: "string" } },
            reflection_prompts: {
              type: "array",
              items: { type: "string" },
              description: "Open questions the educator can ask children after the activity, to support the 'do, then reflect' approach.",
            },
            age_range: { type: "string", description: "e.g. '2-3 years' or 'toddlers'." },
            duration_minutes: { type: "integer" },
            energy_level: { type: "string", enum: ["calm", "moderate", "high"] },
            group_size_fit: { type: "string", enum: ["solo", "small_group", "whole_group"] },
            eylf_codes: {
              type: "array",
              items: { type: "string" },
              description: "EYLF sub-outcome codes (e.g. '1.2') that this activity supports. Must only use codes from the provided taxonomy.",
            },
          },
        },
      },
    },
    required: ["activities"],
  },
};

function buildSystemPrompt(outcomes: EylfOutcome[]): string {
  const taxonomy = outcomes
    .map((o) => `${o.code} (Outcome ${o.outcome_number}: ${o.outcome_title}) — ${o.sub_outcome_text}`)
    .join("\n");

  return `You are an assistant for early childhood educators in Australia. You suggest fun, play-based activities that don't feel like forced lessons, following a "do, then reflect" approach. Every activity must be tagged with one or more EYLF (Early Years Learning Framework) sub-outcome codes, chosen ONLY from this exact list:

${taxonomy}

Never invent a code that isn't in this list. Keep activities playful, safe, age-appropriate, and achievable with ordinary classroom/home resources.`;
}

function buildUserPrompt(input: GenerationInput): string {
  const lines: string[] = [];

  if (input.mode === "surprise_me") {
    lines.push(
      "The educator has no specific plan today. Surprise them with a creative mix of activities varying in materials, energy level, and group size.",
    );
  }

  if (input.materials && input.materials.length > 0) {
    lines.push(`Materials on hand: ${input.materials.join(", ")}. Prefer activities that primarily use these.`);
  }
  if (input.timeMinutes) {
    lines.push(`Time available: about ${input.timeMinutes} minutes.`);
  }
  if (input.groupSize) {
    lines.push(`Group size: ${input.groupSize.replace("_", " ")}.`);
  }
  if (input.energyLevel) {
    lines.push(`Desired energy/regulation level: ${input.energyLevel}.`);
  }
  if (input.targetOutcomeCodes && input.targetOutcomeCodes.length > 0) {
    lines.push(`Target these EYLF outcome codes specifically: ${input.targetOutcomeCodes.join(", ")}.`);
  }
  if (input.childInterest) {
    lines.push(`A child's current interest to weave in if relevant: ${input.childInterest}.`);
  }

  if (lines.length === 0) {
    lines.push("No specific constraints were given — propose a varied, generally useful set of activities.");
  }

  lines.push("Propose 2-3 activities using the propose_activities tool.");
  return lines.join("\n");
}

export async function generateActivitySuggestions(
  input: GenerationInput,
  outcomes: EylfOutcome[],
): Promise<RawActivitySuggestion[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: buildSystemPrompt(outcomes),
    messages: [{ role: "user", content: buildUserPrompt(input) }],
    tools: [PROPOSE_ACTIVITIES_TOOL],
    tool_choice: { type: "tool", name: "propose_activities" },
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );

  if (!toolUse) {
    throw new Error("Model did not return a tool call");
  }

  const result = toolUse.input as { activities?: RawActivitySuggestion[] };
  return result.activities ?? [];
}
