import Anthropic from "@anthropic-ai/sdk";
import type { EylfOutcome, GeneratedActivity } from "@/lib/types/domain";
import type { Hazard, RiskLikelihood, RiskConsequence, RiskRating } from "@/lib/types/database.types";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export interface ChildObservationSummary {
  noteText: string;
  observedAt: string;
  eylfCodes: string[];
}

export interface GenerationInput {
  mode: "materials" | "time" | "outcome" | "interest" | "surprise_me";
  surpriseMe?: boolean;
  materials?: string[];
  timeMinutes?: number;
  groupSize?: "solo" | "small_group" | "whole_group";
  energyLevel?: "calm" | "moderate" | "high";
  targetOutcomeCodes?: string[];
  childInterest?: string;
  childName?: string;
  childRecentObservations?: ChildObservationSummary[];
  additionalNeeds?: string;
  targetAgeBracket?: string;
  targetMilestone?: string;
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
            age_range: { type: "string", description: "e.g. '2-3 years' or 'toddlers'. If the educator gave a target age bracket, this MUST match it." },
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

Never invent a code that isn't in this list. Keep activities playful, safe, age-appropriate, and achievable with ordinary classroom/home resources.

When additional needs/constraints are given (physical, emotional, disability, neurodiversity, family, environmental, or legal), adapt the activity practically and respectfully — focus on concrete accommodations (e.g. seated/standing alternatives, quieter sensory options, simpler instructions, alternative materials) rather than discussing or diagnosing the need itself. Take the educator's description at face value without speculating beyond what's stated.`;
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
  if (input.targetAgeBracket) {
    lines.push(`Target age bracket: ${input.targetAgeBracket}. Every activity's age_range MUST reflect this bracket.`);
  }
  if (input.targetMilestone) {
    lines.push(
      `Target developmental milestone to build towards: "${input.targetMilestone}". Design at least one activity that genuinely supports practising or progressing this specific skill — this is a general developmental guide, not a diagnostic target, so keep it playful rather than drill-like.`,
    );
  }
  if (input.targetOutcomeCodes && input.targetOutcomeCodes.length > 0) {
    lines.push(`Target these EYLF outcome codes specifically: ${input.targetOutcomeCodes.join(", ")}.`);
  }
  if (input.childInterest) {
    const who = input.childName ? `${input.childName}'s` : "A child's";
    lines.push(`${who} current interest to weave in if relevant: ${input.childInterest}.`);
  }

  if (input.additionalNeeds) {
    const who = input.childName ?? "a child in the group";
    lines.push(
      `Additional needs/constraints to accommodate for ${who}: ${input.additionalNeeds}. Adapt the activity practically (alternative materials, pacing, sensory load, positioning, etc.) so it's genuinely accessible, without making this the activity's whole focus.`,
    );
  }

  if (input.childRecentObservations && input.childRecentObservations.length > 0) {
    const who = input.childName ?? "this child";
    const summary = input.childRecentObservations
      .map((o) => {
        const codes = o.eylfCodes.length > 0 ? ` (EYLF ${o.eylfCodes.join(", ")})` : "";
        return `- ${o.observedAt}: ${o.noteText}${codes}`;
      })
      .join("\n");
    lines.push(
      `Recent observations logged about ${who}, most recent first:\n${summary}\nUse this real history to inform the activity — build on what ${who} has been doing or vary it meaningfully (e.g. extend a skill that's emerging, target an EYLF outcome not in this recent list, or revisit an interest from a fresh angle) rather than proposing something disconnected from their actual recent experience.`,
    );
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

// =========================================
// Cultural/national days generation
// =========================================
export interface RawCulturalDay {
  name: string;
  date: string;
  origin: string;
  note: string;
  confidence: "high" | "approximate";
}

const PROPOSE_CULTURAL_DAYS_TOOL: Anthropic.Tool = {
  name: "propose_cultural_days",
  description: "List cultural festivities, national days, and significant observances falling within a date range, for an Australian early childhood program.",
  input_schema: {
    type: "object",
    required: ["days"],
    properties: {
      days: {
        type: "array",
        items: {
          type: "object",
          required: ["name", "date", "origin", "note", "confidence"],
          properties: {
            name: { type: "string", description: "e.g. 'Diwali', 'Harmony Day', 'NAIDOC Week'." },
            date: { type: "string", description: "YYYY-MM-DD, within the requested range." },
            origin: { type: "string", description: "Country or culture of origin, e.g. 'India', 'Australia (First Nations)', 'Vietnam'." },
            note: { type: "string", description: "One sentence on what it is and a simple, respectful way young children could acknowledge it." },
            confidence: {
              type: "string",
              enum: ["high", "approximate"],
              description: "'high' for fixed-calendar-date observances you're confident about; 'approximate' for lunar/lunisolar or moveable-feast dates (Diwali, Lunar New Year, Eid, Easter, etc.) that shift yearly and need the educator to verify the exact current-year date.",
            },
          },
        },
      },
    },
  },
};

const CULTURAL_DAYS_SYSTEM_PROMPT = `You help Australian early childhood educators build culturally inclusive programs, in the spirit of EYLF Outcome 2: children responding to diversity with respect.

List genuine cultural festivities, national days, and significant observances that fall within the given date range. Favour a mix of three tiers: (1) Australian national days (Harmony Day, NAIDOC Week, Reconciliation Week, ANZAC Day, National Sorry Day, etc.), (2) Australian state/territory-specific observances when genuinely relevant (e.g. a state-specific public holiday or commemorative day — note which state(s) it applies to in the origin field, e.g. "Australia (Victoria)"), and (3) genuinely diverse international cultural/religious observances reflecting different countries of origin (e.g. Diwali, Lunar New Year, Eid al-Fitr, Hanukkah, Vesak, etc. when in range) - this is a planning aid for real diversity, not just a token gesture, so include observances beyond the most obvious ones when genuinely relevant to the date range.

Be honest about date certainty: mark fixed-calendar-date observances as "high" confidence, and mark anything based on a lunar/lunisolar calendar or a moveable feast as "approximate" - these shift every year and you are not a live calendar, so the educator must verify the exact current-year date before relying on it. Do not invent a day that doesn't genuinely fall in or near this range. It's fine to return an empty list if nothing relevant falls in range.`;

export async function generateCulturalDays(startDate: string, endDate: string): Promise<RawCulturalDay[]> {
  const userPrompt = `Date range: ${startDate} to ${endDate}.\n\nList relevant cultural/national days using the propose_cultural_days tool.`;
  const result = await callTool<{ days: RawCulturalDay[] }>(
    CULTURAL_DAYS_SYSTEM_PROMPT,
    userPrompt,
    PROPOSE_CULTURAL_DAYS_TOOL,
  );
  return result.days ?? [];
}

// =========================================
// Program planner generation
// =========================================
export interface RawProgramEntry {
  day_date: string;
  title: string;
  notes?: string;
  eylf_codes: string[];
  reused_activity_title?: string | null;
}

const PROPOSE_PROGRAM_TOOL: Anthropic.Tool = {
  name: "propose_program",
  description: "Draft a fun, inclusive educational program of learning experiences across a date range, linked to EYLF outcomes.",
  input_schema: {
    type: "object",
    required: ["entries"],
    properties: {
      entries: {
        type: "array",
        items: {
          type: "object",
          required: ["day_date", "title", "eylf_codes"],
          properties: {
            day_date: { type: "string", description: "YYYY-MM-DD, within the program's date range." },
            title: { type: "string" },
            notes: { type: "string", description: "Brief practical note - what to do, or how it ties to a cultural day if relevant." },
            eylf_codes: { type: "array", items: { type: "string" }, description: "EYLF sub-outcome codes this entry targets, from the provided taxonomy only." },
            reused_activity_title: {
              type: "string",
              description: "If this entry reuses one of the educator's existing saved activities, its EXACT title as given. Omit/null if this is a new suggestion.",
            },
          },
        },
      },
    },
  },
};

function buildProgramSystemPrompt(outcomes: EylfOutcome[]): string {
  const taxonomy = outcomes.map((o) => `${o.code} — ${o.sub_outcome_text}`).join("\n");
  return `You help Australian early childhood educators write a fun, inclusive learning program as quickly as possible, so they can spend less time on paperwork and more time with the children. Every entry must use EYLF sub-outcome codes ONLY from this list:

${taxonomy}

Never invent a code outside this list. Prefer reusing the educator's existing saved activities (listed below) where they genuinely fit a day/outcome well — that's less prep work for them — rather than always inventing something new. When you do reuse one, set reused_activity_title to its EXACT title as given; do not paraphrase it. Spread coverage across the outcomes that need it most (also listed below) rather than repeating the same one or two outcomes every day. Where a cultural/national day genuinely falls on or near one of the program's dates, consider weaving in a simple, age-appropriate, respectful entry for it — but don't force one in if nothing fits naturally.`;
}

function buildProgramUserPrompt(
  startDate: string,
  endDate: string,
  outcomeGaps: { code: string; subOutcomeText: string; timesCovered: number }[],
  culturalDays: RawCulturalDay[],
  existingActivities: { title: string; eylfCodes: string[] }[],
  educatorNotes?: string,
): string {
  const lines: string[] = [`Program date range: ${startDate} to ${endDate}.`];

  if (outcomeGaps.length > 0) {
    lines.push(
      `Outcomes needing attention (least recently/often covered first):\n${outcomeGaps
        .slice(0, 8)
        .map((g) => `- ${g.code} (covered ${g.timesCovered}x recently): ${g.subOutcomeText}`)
        .join("\n")}`,
    );
  }

  if (culturalDays.length > 0) {
    lines.push(
      `Cultural/national days in this range:\n${culturalDays
        .map((d) => `- ${d.date}: ${d.name} (${d.origin})${d.confidence === "approximate" ? " [date approximate]" : ""}`)
        .join("\n")}`,
    );
  }

  if (existingActivities.length > 0) {
    lines.push(
      `Educator's existing saved activities, available to reuse:\n${existingActivities
        .map((a) => `- "${a.title}" (EYLF: ${a.eylfCodes.join(", ") || "none tagged"})`)
        .join("\n")}`,
    );
  }

  if (educatorNotes) {
    lines.push(`Educator's guidance for this program: ${educatorNotes}`);
  }

  lines.push("Propose the program entries using the propose_program tool — one or more entries per day across the range.");
  return lines.join("\n\n");
}

export async function generateProgram(
  startDate: string,
  endDate: string,
  outcomes: EylfOutcome[],
  outcomeGaps: { code: string; subOutcomeText: string; timesCovered: number }[],
  culturalDays: RawCulturalDay[],
  existingActivities: { title: string; eylfCodes: string[] }[],
  educatorNotes?: string,
): Promise<RawProgramEntry[]> {
  const result = await callTool<{ entries: RawProgramEntry[] }>(
    buildProgramSystemPrompt(outcomes),
    buildProgramUserPrompt(startDate, endDate, outcomeGaps, culturalDays, existingActivities, educatorNotes),
    PROPOSE_PROGRAM_TOOL,
  );
  return result.entries ?? [];
}
