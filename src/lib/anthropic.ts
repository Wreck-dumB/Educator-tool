import Anthropic from "@anthropic-ai/sdk";
import type { EylfOutcome, GeneratedActivity } from "@/lib/types/domain";
import type { Hazard, RiskLikelihood, RiskConsequence, RiskRating } from "@/lib/types/database.types";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export interface GenerationInput {
  mode: "materials" | "time" | "outcome" | "interest" | "surprise_me";
  surpriseMe?: boolean;
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

  if (input.surpriseMe) {
    lines.push(
      "The educator wants to be surprised — be creative and vary the mix, but still respect any constraints given below.",
    );
  }

  if (input.materials && input.materials.length > 0) {
    lines.push(
      `Materials on hand: ${input.materials.join(", ")}. Every activity MUST primarily use these materials — do not propose an activity that ignores them.`,
    );
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

// =========================================
// Risk assessment generation
// =========================================
// Standard Australian WHS-style 5x5 risk matrix (likelihood x consequence).
// We never trust the model's own risk rating — it's computed deterministically
// here, the same guardrail philosophy as validating EYLF codes against the
// seeded taxonomy: anything that could be relied on for compliance documentation
// gets checked in code, not taken on faith from the model's output.
const LIKELIHOOD_ORDER: RiskLikelihood[] = ["rare", "unlikely", "possible", "likely", "almost_certain"];
const CONSEQUENCE_ORDER: RiskConsequence[] = ["insignificant", "minor", "moderate", "significant", "major"];

// rows = likelihood index (0-4), cols = consequence index (0-4)
const RISK_MATRIX: RiskRating[][] = [
  ["low", "low", "low", "medium", "medium"], // rare
  ["low", "low", "medium", "medium", "high"], // unlikely
  ["low", "medium", "medium", "high", "high"], // possible
  ["medium", "medium", "high", "high", "extreme"], // likely
  ["medium", "high", "high", "extreme", "extreme"], // almost_certain
];

export function computeRiskRating(likelihood: RiskLikelihood, consequence: RiskConsequence): RiskRating {
  const row = LIKELIHOOD_ORDER.indexOf(likelihood);
  const col = CONSEQUENCE_ORDER.indexOf(consequence);
  return RISK_MATRIX[row]?.[col] ?? "medium";
}

export interface RawHazard {
  hazard: string;
  who_could_be_harmed: string;
  likelihood: RiskLikelihood;
  consequence: RiskConsequence;
  control_measures: string[];
}

export interface RawRiskAssessment {
  context_notes?: string;
  hazards: RawHazard[];
  involves_excursion: boolean;
  involves_sleep_rest: boolean;
  involves_water: boolean;
}

const PROPOSE_RISK_ASSESSMENT_TOOL: Anthropic.Tool = {
  name: "propose_risk_assessment",
  description:
    "Propose a baseline risk assessment for an early childhood activity, identifying realistic hazards and control measures following standard Australian WHS risk-management practice.",
  input_schema: {
    type: "object",
    properties: {
      context_notes: {
        type: "string",
        description: "Short note on the assumed setting, e.g. 'Indoor, small group, ages 2-3'.",
      },
      hazards: {
        type: "array",
        minItems: 2,
        maxItems: 8,
        items: {
          type: "object",
          required: ["hazard", "who_could_be_harmed", "likelihood", "consequence", "control_measures"],
          properties: {
            hazard: { type: "string", description: "A specific, concrete hazard arising from this activity's materials, steps, or setting." },
            who_could_be_harmed: { type: "string", description: "e.g. 'Children in the group', 'Educator', 'Children with allergies'." },
            likelihood: { type: "string", enum: LIKELIHOOD_ORDER },
            consequence: { type: "string", enum: CONSEQUENCE_ORDER },
            control_measures: {
              type: "array",
              items: { type: "string" },
              description: "Concrete control measures, preferring elimination/substitution/isolation over administrative controls or PPE where realistic, per the WHS hierarchy of controls.",
            },
          },
        },
      },
      involves_excursion: {
        type: "boolean",
        description: "True if this activity would normally involve leaving the service premises.",
      },
      involves_sleep_rest: {
        type: "boolean",
        description: "True if this activity involves children sleeping or resting.",
      },
      involves_water: {
        type: "boolean",
        description: "True if this activity involves water play, swimming, or other water-based risk.",
      },
    },
    required: ["hazards", "involves_excursion", "involves_sleep_rest", "involves_water"],
  },
};

const RISK_ASSESSMENT_SYSTEM_PROMPT = `You are an assistant helping Australian early childhood educators draft a BASELINE risk assessment for a specific activity, to be reviewed and added to by qualified staff before being relied on.

Follow standard Australian WHS risk-management practice: identify specific, realistic hazards (not generic boilerplate) arising from this activity's actual materials, steps, age range, and setting — consider physical hazards (choking, sharp edges, slips/trips, falls), chemical/allergen hazards (paints, food-based materials, allergens), supervision/ratio hazards (energetic or whole-group activities), and hygiene/infection hazards where relevant. For each hazard, rate likelihood and consequence honestly (most ordinary classroom hazards should NOT be rated as likely+major — reserve high ratings for genuinely serious risks), and give concrete control measures, preferring elimination/substitution/isolation of the hazard over administrative controls or PPE where realistic (the WHS hierarchy of controls).

Also flag whether this activity, by its nature, would involve an excursion (leaving the premises), sleep/rest, or water — these each require their own SEPARATE mandatory risk assessment under the Education and Care Services National Regulations (excursions: regs 100-103; sleep/rest; emergencies) that this baseline does not replace.`;

function buildRiskAssessmentUserPrompt(activity: GeneratedActivity): string {
  const lines: string[] = [
    `Activity: ${activity.title}`,
    `Summary: ${activity.summary}`,
  ];
  if (activity.steps.length > 0) lines.push(`Steps: ${activity.steps.join(" | ")}`);
  if (activity.materials_used.length > 0) lines.push(`Materials used: ${activity.materials_used.join(", ")}`);
  if (activity.age_range) lines.push(`Age range: ${activity.age_range}`);
  if (activity.group_size_fit) lines.push(`Group size: ${activity.group_size_fit.replace("_", " ")}`);
  if (activity.energy_level) lines.push(`Energy level: ${activity.energy_level}`);
  lines.push("Propose a baseline risk assessment using the propose_risk_assessment tool.");
  return lines.join("\n");
}

export async function generateRiskAssessment(activity: GeneratedActivity): Promise<RawRiskAssessment> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: RISK_ASSESSMENT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildRiskAssessmentUserPrompt(activity) }],
    tools: [PROPOSE_RISK_ASSESSMENT_TOOL],
    tool_choice: { type: "tool", name: "propose_risk_assessment" },
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );

  if (!toolUse) {
    throw new Error("Model did not return a tool call");
  }

  return toolUse.input as RawRiskAssessment;
}

/** Attaches a deterministically-computed risk rating to each raw hazard. */
export function scoreHazards(hazards: RawHazard[]): Hazard[] {
  return hazards
    .filter((h) => LIKELIHOOD_ORDER.includes(h.likelihood) && CONSEQUENCE_ORDER.includes(h.consequence))
    .map((h) => ({
      hazard: h.hazard,
      who_could_be_harmed: h.who_could_be_harmed,
      likelihood: h.likelihood,
      consequence: h.consequence,
      risk_rating: computeRiskRating(h.likelihood, h.consequence),
      control_measures: h.control_measures ?? [],
    }));
}

/** Shared single-tool-call helper used by every generator in this file. */
async function callTool<T>(system: string, userPrompt: string, tool: Anthropic.Tool): Promise<T> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system,
    messages: [{ role: "user", content: userPrompt }],
    tools: [tool],
    tool_choice: { type: "tool", name: tool.name },
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  if (!toolUse) {
    throw new Error("Model did not return a tool call");
  }
  return toolUse.input as T;
}

// =========================================
// Safe work procedure generation
// =========================================
// NOT a legal "SWMS" (Safe Work Method Statement) - that term specifically
// covers 18 categories of high-risk CONSTRUCTION work under the WHS
// Regulations and doesn't apply to ordinary daycare tasks. This generates a
// safe-procedure baseline for genuinely hazardous routine staff tasks
// (chemical use, manual handling, ladder use, garden tools) instead.

export interface RawSafeWorkProcedure {
  ppe_required: string[];
  steps: string[];
  hazards: RawHazard[];
}

const PROPOSE_SAFE_WORK_PROCEDURE_TOOL: Anthropic.Tool = {
  name: "propose_safe_work_procedure",
  description:
    "Propose a baseline safe work procedure for a hazardous routine staff task in an Australian early childhood service.",
  input_schema: {
    type: "object",
    properties: {
      ppe_required: {
        type: "array",
        items: { type: "string" },
        description: "Personal protective equipment needed, if any (e.g. 'disposable gloves', 'closed shoes'). Empty array if none.",
      },
      steps: {
        type: "array",
        items: { type: "string" },
        description: "Ordered, concrete steps to carry out the task safely, from setup through to clean-up/storage.",
      },
      hazards: {
        type: "array",
        minItems: 1,
        maxItems: 8,
        items: {
          type: "object",
          required: ["hazard", "who_could_be_harmed", "likelihood", "consequence", "control_measures"],
          properties: {
            hazard: { type: "string" },
            who_could_be_harmed: { type: "string" },
            likelihood: { type: "string", enum: LIKELIHOOD_ORDER },
            consequence: { type: "string", enum: CONSEQUENCE_ORDER },
            control_measures: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
    required: ["ppe_required", "steps", "hazards"],
  },
};

const SAFE_WORK_PROCEDURE_SYSTEM_PROMPT = `You are an assistant helping Australian early childhood services draft a BASELINE safe work procedure for a hazardous routine staff task (not a child activity) - e.g. using cleaning chemicals, manual handling/lifting, ladder use, garden tool use. This is a starting draft for staff to review and add to, not a finished compliance document.

This is explicitly NOT a "Safe Work Method Statement" (SWMS) in the legal sense - that term applies only to specific high-risk construction work under the WHS Regulations. Do not use the term SWMS anywhere in your output.

Follow standard Australian WHS risk-management practice: identify realistic hazards specific to this exact task, rate likelihood and consequence honestly, and give concrete control measures preferring elimination/substitution/isolation over administrative controls or PPE where realistic (the WHS hierarchy of controls). List any PPE actually needed, and give clear ordered steps for doing the task safely.`;

export async function generateSafeWorkProcedure(
  taskTitle: string,
  taskDescription: string,
): Promise<RawSafeWorkProcedure> {
  const userPrompt = `Task: ${taskTitle}\nDetails: ${taskDescription}\n\nPropose a baseline safe work procedure using the propose_safe_work_procedure tool.`;
  return callTool<RawSafeWorkProcedure>(
    SAFE_WORK_PROCEDURE_SYSTEM_PROMPT,
    userPrompt,
    PROPOSE_SAFE_WORK_PROCEDURE_TOOL,
  );
}

// =========================================
// Policy builder generation
// =========================================
export interface RawPolicy {
  title: string;
  purpose?: string;
  scope?: string;
  procedure_steps: string[];
  related_legislation: string[];
  suggested_additions: string[];
}

const PROPOSE_POLICY_TOOL: Anthropic.Tool = {
  name: "propose_policy",
  description:
    "Draft a policy and procedure document for an Australian education and care service, based on the educator's description of their service's situation and approach.",
  input_schema: {
    type: "object",
    required: ["title", "procedure_steps", "related_legislation", "suggested_additions"],
    properties: {
      title: { type: "string", description: "A clear policy title, e.g. 'Incident, Injury, Trauma and Illness Policy'." },
      purpose: { type: "string", description: "Why this policy exists, in plain language." },
      scope: { type: "string", description: "Who and what this policy applies to." },
      procedure_steps: {
        type: "array",
        items: { type: "string" },
        description: "Concrete, ordered procedure steps reflecting what the educator described, written as policy clauses.",
      },
      related_legislation: {
        type: "array",
        items: { type: "string" },
        description: "Relevant National Law/Regulations sections or NQS quality areas this policy relates to, where genuinely applicable - do not invent specific regulation numbers you are not confident about; describe the general area instead if unsure.",
      },
      suggested_additions: {
        type: "array",
        items: { type: "string" },
        description: "Specific things the educator's description did NOT cover that a complete policy in this category would normally need to address, or reasonable alternative approaches worth considering. Be concrete, not generic.",
      },
    },
  },
};

const POLICY_SYSTEM_PROMPT = `You are an assistant helping an Australian early childhood education and care service draft a BASELINE policy and procedure document, to be reviewed, customised, and approved by the service's approved provider/nominated supervisor before adoption - this is a starting draft, not a finished, legally-sufficient policy.

Write the policy's purpose, scope, and procedure steps based specifically on what the educator describes about their own service's situation and approach - do not write generic boilerplate that ignores their input. Reference relevant National Law/Regulations areas only where you are genuinely confident they apply; if unsure of an exact regulation number, describe the general requirement area instead of inventing a citation.

Separately, and just as importantly: identify specific things the educator's description left out that a complete policy in this category would normally need to cover, and note any reasonable alternative approaches worth their consideration. This gap-check is as valuable as the draft itself - be concrete and specific to what's missing, not generic advice.`;

export async function generatePolicy(category: string, userInput: string): Promise<RawPolicy> {
  const userPrompt = `Policy category: ${category}\n\nThe educator's description of their service's situation/approach:\n${userInput}\n\nDraft the policy using the propose_policy tool.`;
  return callTool<RawPolicy>(POLICY_SYSTEM_PROMPT, userPrompt, PROPOSE_POLICY_TOOL);
}
