import Anthropic from "@anthropic-ai/sdk";
import type { EylfOutcome, GeneratedActivity, NqsStandard } from "@/lib/types/domain";
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
  // childName intentionally absent — never send a child's real name to the AI.
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
  suggested_template?: "name_trace" | "drawing_frame" | "writing_lines" | null;
}

function makeActivitiesTool(count: number): Anthropic.Tool {
  return {
    name: "propose_activities",
    description: `Propose ${count} fun, play-based early childhood activities matching the educator's constraints, each linked to specific EYLF sub-outcome codes drawn only from the provided taxonomy.`,
    input_schema: {
      type: "object",
      properties: {
        activities: {
          type: "array",
          minItems: 1,
          maxItems: count,
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
            suggested_template: {
              type: "string",
              enum: ["name_trace", "drawing_frame", "writing_lines"],
              description: "Set this for activities where a printable template helps children engage: 'name_trace' — child traces their own name or letters (dotted SVG guide letters printed per child); 'drawing_frame' — activity involves drawing, illustrating, painting, or colouring on paper (blank bordered space printed per child); 'writing_lines' — activity involves handwriting practice, forming letters, writing words or sentences (ruled handwriting lines printed per child). Always set one of these three for any art, literacy, drawing, colouring, painting, or handwriting activity. Leave absent only for purely oral, physical, or construction activities with no paper component.",
            },
          },
        },
      },
    },
    required: ["activities"],
  },
};
}

function buildSystemPrompt(outcomes: EylfOutcome[]): string {
  const taxonomy = outcomes
    .map((o) => `${o.code} (Outcome ${o.outcome_number}: ${o.outcome_title}) — ${o.sub_outcome_text}`)
    .join("\n");

  return `You are an assistant for early childhood educators in Australia. You suggest fun, play-based activities that don't feel like forced lessons, following a "do, then reflect" approach. Every activity must be tagged with one or more EYLF (Early Years Learning Framework) sub-outcome codes, chosen ONLY from this exact list:

${taxonomy}

Never invent a code that isn't in this list. Keep activities playful, safe, age-appropriate, and achievable with ordinary classroom/home resources.

When additional needs/constraints are given (physical, emotional, disability, neurodiversity, family, environmental, or legal), adapt the activity practically and respectfully — focus on concrete accommodations (e.g. seated/standing alternatives, quieter sensory options, simpler instructions, alternative materials) rather than discussing or diagnosing the need itself. Take the educator's description at face value without speculating beyond what's stated.

PRIVACY: Never include or repeat any child's name, date of birth, or any personal identifier in your response. Refer to any child only as "the child" or "children". This is a child safety requirement.`;
}

function buildUserPrompt(input: GenerationInput, count: number): string {
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
    lines.push(`A child's current interest to weave in if relevant: ${input.childInterest}.`);
  }

  if (input.additionalNeeds) {
    lines.push(
      `Additional needs/constraints to accommodate for a child in the group: ${input.additionalNeeds}. Adapt the activity practically (alternative materials, pacing, sensory load, positioning, etc.) so it's genuinely accessible, without making this the activity's whole focus.`,
    );
  }

  if (input.childRecentObservations && input.childRecentObservations.length > 0) {
    const summary = input.childRecentObservations
      .map((o) => {
        const codes = o.eylfCodes.length > 0 ? ` (EYLF ${o.eylfCodes.join(", ")})` : "";
        return `- ${o.observedAt}: ${o.noteText}${codes}`;
      })
      .join("\n");
    lines.push(
      `Recent observations logged about this child, most recent first:\n${summary}\nUse this real history to inform the activity — build on what this child has been doing or vary it meaningfully (e.g. extend a skill that's emerging, target an EYLF outcome not in this recent list, or revisit an interest from a fresh angle) rather than proposing something disconnected from their actual recent experience.`,
    );
  }

  if (lines.length === 0) {
    lines.push("No specific constraints were given — propose a varied, generally useful set of activities.");
  }

  lines.push(`Propose ${count} activities using the propose_activities tool.`);
  return lines.join("\n");
}

export async function generateActivitySuggestions(
  input: GenerationInput,
  outcomes: EylfOutcome[],
  count = 5,
): Promise<RawActivitySuggestion[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: Math.min(8192, Math.max(2048, count * 700)),
    system: buildSystemPrompt(outcomes),
    messages: [{ role: "user", content: buildUserPrompt(input, count) }],
    tools: [makeActivitiesTool(count)],
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
async function callTool<T>(system: string, userPrompt: string, tool: Anthropic.Tool, maxTokens = 2048): Promise<T> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
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
// General form template generation (permission slips, consent forms, and
// other miscellaneous templates whose wording genuinely varies by service
// - NOT used for enrolment or incident records, which have specific
// mandatory fields fixed by the National Regulations and get dedicated
// structured forms instead).
// =========================================
export interface RawFormTemplate {
  title: string;
  purpose?: string;
  fields_to_complete: string[];
  body_text?: string;
  requires_signature: boolean;
  suggested_additions: string[];
}

const PROPOSE_FORM_TEMPLATE_TOOL: Anthropic.Tool = {
  name: "propose_form_template",
  description: "Draft a form/template document for an Australian education and care service, based on the educator's description of what it's for.",
  input_schema: {
    type: "object",
    required: ["title", "fields_to_complete", "requires_signature", "suggested_additions"],
    properties: {
      title: { type: "string", description: "A clear form title, e.g. 'Excursion Permission Slip — Botanic Gardens Visit'." },
      purpose: { type: "string", description: "One or two sentences on what this form is for and why families/staff are being asked to complete it." },
      fields_to_complete: {
        type: "array",
        items: { type: "string" },
        description: "Plain list of blanks/fields the person filling this out needs to provide, e.g. 'Child's full name', 'Date of excursion', 'Emergency contact phone number'.",
      },
      body_text: { type: "string", description: "Any explanatory or consent wording that should appear on the form (e.g. what is being consented to), written in plain language." },
      requires_signature: { type: "boolean", description: "Whether this form needs a signature block (true for permission slips/consent forms, often false for an informational notice)." },
      suggested_additions: {
        type: "array",
        items: { type: "string" },
        description: "Specific things the educator's description did NOT cover that a complete form of this kind would normally need to address. Be concrete, not generic.",
      },
    },
  },
};

const FORM_TEMPLATE_SYSTEM_PROMPT = `You are an assistant helping an Australian early childhood education and care service draft a BASELINE form or template - permission slips, consent forms, and other one-off notices - to be reviewed and customised by the service before use. This is a starting draft, not a finished legal document.

Write the form's purpose, the fields it needs filled in, and any consent/explanatory wording based specifically on what the educator describes - do not write generic boilerplate that ignores their input.

Separately, identify specific things the educator's description left out that a complete form of this kind would normally need to cover (e.g. an excursion permission slip normally needs transport method and a medical-emergency consent line even if the educator didn't mention them) - be concrete and specific to what's missing, not generic advice.`;

export async function generateFormTemplate(category: string, userInput: string): Promise<RawFormTemplate> {
  const userPrompt = `Form category: ${category}\n\nThe educator's description of what this form is for:\n${userInput}\n\nDraft the form using the propose_form_template tool.`;
  return callTool<RawFormTemplate>(FORM_TEMPLATE_SYSTEM_PROMPT, userPrompt, PROPOSE_FORM_TEMPLATE_TOOL);
}

// =========================================
// Child-friendly recipe generation
// =========================================
export interface RawRecipe {
  title: string;
  description?: string;
  ingredients: string[];
  steps: string[];
  prep_time_minutes?: number;
  servings?: number;
  age_range?: string;
  dietary_tags: string[];
  allergens_present: string[];
  choking_hazard_notes?: string;
}

const PROPOSE_RECIPES_TOOL: Anthropic.Tool = {
  name: "propose_recipes",
  description: "Propose child-friendly recipes for an Australian early childhood education and care service.",
  input_schema: {
    type: "object",
    required: ["recipes"],
    properties: {
      recipes: {
        type: "array",
        items: {
          type: "object",
          required: ["title", "ingredients", "steps", "dietary_tags", "allergens_present"],
          properties: {
            title: { type: "string" },
            description: { type: "string", description: "One sentence on what makes this suitable for the setting described." },
            ingredients: { type: "array", items: { type: "string" } },
            steps: { type: "array", items: { type: "string" } },
            prep_time_minutes: { type: "integer" },
            servings: { type: "integer", description: "Number of child-sized servings." },
            age_range: { type: "string", description: "e.g. '2-3 years', 'toddlers and up'." },
            dietary_tags: { type: "array", items: { type: "string" }, description: "e.g. 'vegetarian', 'dairy-free', 'no added sugar'." },
            allergens_present: {
              type: "array",
              items: { type: "string" },
              description: "Common allergens genuinely present in this recipe as written (e.g. 'egg', 'dairy', 'tree nuts', 'gluten'). Empty array if none of the common allergens apply.",
            },
            choking_hazard_notes: {
              type: "string",
              description: "Any choking-hazard modifications needed for younger children (e.g. 'quarter grapes lengthwise for under-3s; avoid for children not yet eating modified-texture foods'), or omit if not applicable.",
            },
          },
        },
      },
    },
  },
};

const RECIPE_SYSTEM_PROMPT = `You are an assistant helping an Australian early childhood education and care service plan child-friendly recipes for snacks, meals, or cooking activities with children.

Safety comes first, ahead of variety or novelty:
- Actively avoid or modify known choking hazards for young children (whole grapes, whole nuts, popcorn, hard raw vegetable chunks, large chunks of meat/cheese, etc.) - if a recipe includes something like this, explicitly note the modification needed (e.g. quartering grapes) in choking_hazard_notes, don't just silently include the hazard.
- Always list allergens genuinely present in allergens_present (egg, dairy, tree nuts, peanuts, gluten, soy, sesame, shellfish, fish - whatever genuinely applies), even if not asked. Never omit a present allergen to make a recipe seem more accommodating than it is.
- If the educator specifies allergies/dietary restrictions to avoid, the recipe must not include those allergens/ingredients at all - do not propose a recipe that violates a stated restriction and then just note it in allergens_present instead of avoiding it.
- If ingredients on hand are given, prefer using them, but you may suggest reasonable common pantry additions if the dish genuinely needs them.

This is a draft for the educator's own judgement, not a substitute for checking each child's actual enrolment/allergy record before serving - you don't know which specific children will eat this.`;

export async function generateRecipes(
  userInput: string,
  ingredientsOnHand?: string[],
  avoidAllergensOrRestrictions?: string,
  servings?: number,
  count = 5,
): Promise<RawRecipe[]> {
  const lines = [`The educator's request:\n${userInput}`];
  if (ingredientsOnHand && ingredientsOnHand.length > 0) {
    lines.push(`Ingredients/pantry items on hand: ${ingredientsOnHand.join(", ")}.`);
  }
  if (avoidAllergensOrRestrictions) {
    lines.push(`MUST avoid (allergies/dietary restrictions): ${avoidAllergensOrRestrictions}. Do not include these at all.`);
  }
  if (servings) {
    lines.push(`Number of child-sized servings needed: ${servings}.`);
  }
  lines.push(`Propose ${count} recipes using the propose_recipes tool.`);

  const maxTokens = Math.min(8192, Math.max(2048, count * 700));
  const result = await callTool<{ recipes: RawRecipe[] }>(RECIPE_SYSTEM_PROMPT, lines.join("\n\n"), PROPOSE_RECIPES_TOOL, maxTokens);
  return result.recipes ?? [];
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

// =========================================
// Poster/flier copy generation
// =========================================
export interface RawPosterCopy {
  title: string;
  subtitle?: string;
  body_text?: string;
  footer_text?: string;
  image_search_suggestion?: string;
}

const PROPOSE_POSTER_COPY_TOOL: Anthropic.Tool = {
  name: "propose_poster_copy",
  description:
    "Draft the wording for a poster or flier for an Australian early childhood education and care service.",
  input_schema: {
    type: "object",
    required: ["title"],
    properties: {
      title: { type: "string", description: "Short, punchy headline — a handful of words that read well in very large type." },
      subtitle: { type: "string", description: "One supporting line under the headline (e.g. the date/time/place for an event), if useful." },
      body_text: { type: "string", description: "The main message in a few short, warm sentences or lines. Keep it scannable — this is a poster, not a letter." },
      footer_text: { type: "string", description: "A small closing line if useful — RSVP details, a contact, or a friendly sign-off." },
      image_search_suggestion: {
        type: "string",
        description: "Two or three words the educator could type into a stock-photo search to find a fitting picture, e.g. 'children gardening'.",
      },
    },
  },
};

const POSTER_COPY_SYSTEM_PROMPT = `You write the wording for posters and fliers pinned up in an Australian early childhood education and care service — event notices for families, reminders (hats, sign-in, gate safety), celebration posters, room displays.

Poster text is read in two seconds from across a hallway: headline first, tiny amount of supporting text, nothing that needs concentration. Keep the tone warm and community-minded, use Australian English spelling, and include only details the educator actually gave you — never invent dates, times, or contact details they didn't mention. If they gave specifics (a date, a time, 'bring a plate'), those must appear.`;

export async function generatePosterCopy(userInput: string): Promise<RawPosterCopy> {
  const userPrompt = `The educator's description of the poster/flier they need:\n${userInput}\n\nDraft the wording using the propose_poster_copy tool.`;
  return callTool<RawPosterCopy>(POSTER_COPY_SYSTEM_PROMPT, userPrompt, PROPOSE_POSTER_COPY_TOOL, 1024);
}

// =========================================
// Quality Improvement Plan (QIP) generation
// =========================================
export interface RawQipItem {
  quality_area_number: number;
  standard_code?: string | null;
  item_type: "strength" | "improvement";
  description: string;
  priority?: "low" | "medium" | "high" | null;
  success_measure?: string | null;
  steps?: string[];
  timeframe?: string | null;
}

function buildQipSystemPrompt(standards: NqsStandard[]): string {
  const taxonomy = standards
    .map((s) => `${s.code} (QA${s.quality_area_number} ${s.quality_area_title} — "${s.standard_title}"): ${s.standard_text}`)
    .join("\n");

  return `You are an assistant helping an Australian early childhood education and care service write entries for their Quality Improvement Plan (QIP) under the National Quality Standard (NQS).

The current NQS has 7 Quality Areas and 15 Standards. When you reference a standard, choose ONLY from this exact list of codes — never invent one:

${taxonomy}

A QIP does not need to address every standard — focus on what the educator actually describes. For each thing they mention, produce either:
- a "strength" item (something working well, worth recording as a strength against a quality area), or
- an "improvement" item (an identified area for improvement), which should also include a concrete success_measure ("how will we know this has been achieved"), realistic steps, and a timeframe.

standard_code is optional — omit it (or set null) if an item is genuinely about a whole quality area rather than one specific standard. Do not force-fit every item to a standard code.

Be concrete and specific to what the educator describes, not generic continuous-improvement boilerplate. This is a working draft for the educator to refine, not a finished, certified self-assessment.`;
}

function buildQipUserPrompt(userInput: string, targetQualityAreas?: number[]): string {
  const lines = [`The educator's notes on current practice, strengths, and known issues:\n${userInput}`];
  if (targetQualityAreas && targetQualityAreas.length > 0) {
    lines.push(`Focus specifically on Quality Area(s): ${targetQualityAreas.join(", ")}.`);
  }
  lines.push("Propose QIP items using the propose_qip_items tool.");
  return lines.join("\n\n");
}

const PROPOSE_QIP_ITEMS_TOOL: Anthropic.Tool = {
  name: "propose_qip_items",
  description: "Propose Quality Improvement Plan (strength/improvement) entries for an Australian education and care service, based on the educator's notes.",
  input_schema: {
    type: "object",
    required: ["items"],
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          required: ["quality_area_number", "item_type", "description"],
          properties: {
            quality_area_number: { type: "integer", minimum: 1, maximum: 7, description: "Which of the 7 NQS quality areas this item relates to." },
            standard_code: { type: "string", description: "e.g. '1.1' — MUST be one of the standard codes given, or omitted entirely if the item is about a whole quality area rather than one standard." },
            item_type: { type: "string", enum: ["strength", "improvement"] },
            description: { type: "string", description: "For a strength: what's working well. For an improvement: the identified issue/area for improvement." },
            priority: { type: "string", enum: ["low", "medium", "high"], description: "Only for improvement items." },
            success_measure: { type: "string", description: "Only for improvement items: how will the service know this has been achieved." },
            steps: { type: "array", items: { type: "string" }, description: "Only for improvement items: concrete steps to get there." },
            timeframe: { type: "string", description: "Only for improvement items, e.g. 'Next 3 months', 'By end of Term 4'." },
          },
        },
      },
    },
  },
};

export async function generateQipItems(
  standards: NqsStandard[],
  userInput: string,
  targetQualityAreas?: number[],
): Promise<RawQipItem[]> {
  const result = await callTool<{ items: RawQipItem[] }>(
    buildQipSystemPrompt(standards),
    buildQipUserPrompt(userInput, targetQualityAreas),
    PROPOSE_QIP_ITEMS_TOOL,
  );
  return result.items ?? [];
}

// =========================================
// Activity personalisation
// =========================================
export interface RawPersonalisedActivity {
  title: string;
  summary: string;
  steps: string[];
  materials_used: string[];
  reflection_prompts: string[];
  adaptation_notes: string[];
  eylf_codes: string[];
}

const PERSONALISE_ACTIVITY_TOOL: Anthropic.Tool = {
  name: "personalise_activity",
  description:
    "Adapt an existing early childhood activity for a specific child, making only the targeted changes needed to accommodate their needs, interests, or context — preserving as much of the original activity as possible.",
  input_schema: {
    type: "object",
    required: ["title", "summary", "steps", "materials_used", "reflection_prompts", "adaptation_notes", "eylf_codes"],
    properties: {
      title: {
        type: "string",
        description: "Keep close to the original title, optionally noting the personalisation e.g. 'Name Tracing — adapted for individual'.",
      },
      summary: {
        type: "string",
        description: "One or two sentences — keep close to the original summary, noting any personalisation.",
      },
      steps: {
        type: "array",
        items: { type: "string" },
        description: "The adapted steps. Keep unchanged steps verbatim; only modify steps that genuinely need adapting for this child.",
      },
      materials_used: { type: "array", items: { type: "string" } },
      reflection_prompts: {
        type: "array",
        items: { type: "string" },
        description: "Personalised prompts — reference the child's interests or learning journey rather than copying the originals verbatim.",
      },
      adaptation_notes: {
        type: "array",
        items: { type: "string" },
        description: "One item per distinct change from the original — say specifically what changed and why, e.g. 'Replaced scissors with tearing (fine motor support for Luca)'. Omit if nothing changed for a step.",
      },
      eylf_codes: {
        type: "array",
        items: { type: "string" },
        description: "EYLF sub-outcome codes this adapted version supports. Must only use codes from the provided taxonomy.",
      },
    },
  },
};

const PERSONALISE_SYSTEM_PROMPT_TEMPLATE = `You are an assistant for early childhood educators in Australia. You adapt an existing activity for a specific child — making only the targeted changes needed to accommodate their needs, interests, or context, while preserving as much of the original activity as possible.

Adaptation principles:
- Change the minimum necessary. Keep unchanged steps verbatim.
- Make accommodations practical and concrete: alternative materials, seated option, simplified instruction, quieter sensory version, adjusted pacing — not vague advice.
- Frame adaptations around the child's strengths and interests, not just their limitations.
- Where additional needs are given, adapt respectfully and practically — focus on concrete accommodations without diagnosing or discussing the need itself beyond what the educator described.
- Personalise reflection prompts to this child (reference their interests, frame prompts around their specific learning journey) rather than copying the originals.
- adaptation_notes must be specific: "what changed FROM THE ORIGINAL and why" in plain language the educator can read at a glance — not generic inclusion language.

EYLF taxonomy:
{TAXONOMY}

Never use a code that isn't in the above list.`;

export async function personaliseActivity(
  activity: import("@/lib/types/domain").GeneratedActivity & { eylf_codes?: string[] },
  interests: string | null,
  additionalNeeds: string | null,
  recentObservations: ChildObservationSummary[],
  outcomes: EylfOutcome[],
): Promise<RawPersonalisedActivity> {
  const taxonomy = outcomes
    .map((o) => `${o.code} — ${o.sub_outcome_text}`)
    .join("\n");
  const system = PERSONALISE_SYSTEM_PROMPT_TEMPLATE.replace("{TAXONOMY}", taxonomy);

  const lines: string[] = [
    `Original activity: "${activity.title}"`,
    `Summary: ${activity.summary}`,
    `Steps:\n${activity.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
  ];
  if (activity.materials_used.length > 0) {
    lines.push(`Materials: ${activity.materials_used.join(", ")}`);
  }
  if (activity.reflection_prompts.length > 0) {
    lines.push(`Reflection prompts:\n${activity.reflection_prompts.map((p) => `- ${p}`).join("\n")}`);
  }
  if (activity.eylf_codes && activity.eylf_codes.length > 0) {
    lines.push(`EYLF codes: ${activity.eylf_codes.join(", ")}`);
  }

  lines.push("---");
  lines.push("Personalise for: the child");
  if (interests) lines.push(`Current interests: ${interests}`);
  if (additionalNeeds) {
    lines.push(
      `Additional needs/constraints for this child: ${additionalNeeds}. Adapt practically so the activity is genuinely accessible — without making the adaptation the activity's whole focus.`,
    );
  }
  if (recentObservations.length > 0) {
    const obs = recentObservations
      .map((o) => {
        const codes = o.eylfCodes.length > 0 ? ` (EYLF ${o.eylfCodes.join(", ")})` : "";
        return `- ${o.observedAt}: ${o.noteText}${codes}`;
      })
      .join("\n");
    lines.push(`Recent observations for this child:\n${obs}`);
  }
  if (!interests && !additionalNeeds && recentObservations.length === 0) {
    lines.push("No specific child context provided — personalise for a generic individual child (solo focus) rather than a whole group.");
  }

  lines.push("\nAdapt this activity using the personalise_activity tool.");

  return callTool<RawPersonalisedActivity>(system, lines.join("\n"), PERSONALISE_ACTIVITY_TOOL, 2048);
}

// =========================================
// Follow-up activity generation
// =========================================

export interface FollowUpInput {
  observationNote: string;
  childInterests: string | null;
  eylfCodes: string[];
  previousActivityTitle?: string | null;
}

export async function generateFollowUpActivity(
  input: FollowUpInput,
  outcomes: EylfOutcome[],
): Promise<RawActivitySuggestion> {
  const taxonomy = outcomes
    .map((o) => `${o.code} (Outcome ${o.outcome_number}) — ${o.sub_outcome_text}`)
    .join("\n");

  const system = `You are an expert early childhood educator using the Australian Early Years Learning Framework (EYLF V2.0).
Your job is to read an observation made about a child and propose ONE specific follow-up activity that extends and deepens what was observed.

EYLF V2.0 taxonomy:
${taxonomy}

Rules:
- The follow-up must directly connect to the observation — extend an interest, deepen a skill, or revisit something the child is working through
- Propose exactly ONE activity
- Only use EYLF codes from the taxonomy above — never invent codes
- Make it practical and doable in a typical early childhood setting`;

  const lines = [
    input.childInterests ? `Current interests: ${input.childInterests}` : "",
    input.previousActivityTitle ? `This observation came from activity: "${input.previousActivityTitle}"` : "",
    `Observation: "${input.observationNote}"`,
    input.eylfCodes.length > 0 ? `EYLF outcomes already linked: ${input.eylfCodes.join(", ")}` : "",
    "",
    "Propose a single follow-up activity that extends this observation. Use the propose_activities tool with exactly one activity.",
  ].filter(Boolean);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system,
    messages: [{ role: "user", content: lines.join("\n") }],
    tools: [makeActivitiesTool(1)],
    tool_choice: { type: "tool", name: "propose_activities" },
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  if (!toolUse) throw new Error("Model did not return a tool call");

  const result = toolUse.input as { activities?: RawActivitySuggestion[] };
  const activity = result.activities?.[0];
  if (!activity) throw new Error("No activity returned");
  return activity;
}

// =========================================
// Daily routine generation
// =========================================

export interface RoutineBlockRaw {
  time: string;
  title: string;
  duration_minutes: number;
  notes?: string;
  type: "routine" | "activity" | "meal" | "rest" | "outdoor" | "transition";
}

export interface DailyRoutineInput {
  date: string;
  dayName: string;
  childCount: number;
  ageRange?: string;
  roomName?: string;
  focusTopic?: string;
  plannedActivities: string[];
}

const ROUTINE_TOOL = {
  name: "set_daily_routine",
  description: "Output the complete time-blocked daily routine for an early childhood centre day",
  input_schema: {
    type: "object" as const,
    required: ["blocks"],
    properties: {
      blocks: {
        type: "array" as const,
        description: "The time blocks in chronological order",
        items: {
          type: "object" as const,
          required: ["time", "title", "duration_minutes", "type"],
          properties: {
            time: { type: "string" as const, description: "Start time in 24h HH:MM format, e.g. 08:30" },
            title: { type: "string" as const },
            duration_minutes: { type: "number" as const, minimum: 5, maximum: 180 },
            notes: { type: "string" as const, description: "Optional notes for staff, e.g. setup, transition tips" },
            type: {
              type: "string" as const,
              enum: ["routine", "activity", "meal", "rest", "outdoor", "transition"],
            },
          },
        },
      },
    },
  },
};

export async function generateDailyRoutine(
  input: DailyRoutineInput,
): Promise<RoutineBlockRaw[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const system = `You are an expert early childhood educator planning a time-blocked daily routine for an Australian early childhood centre.
Create a realistic, developmentally appropriate routine that:
- Runs from approximately 7:30–8:00 AM arrival to 5:30–6:00 PM departure
- Includes adequate transition times, meals, rest/sleep (for under-3s), and outdoor time
- Weaves in planned learning activities at appropriate times
- Leaves breathing room between transitions — don't over-schedule
PRIVACY: Never include or repeat any child's name, date of birth, or any personal identifier in your response.`;

  const activityList = input.plannedActivities.length > 0
    ? `Planned activities for today:\n${input.plannedActivities.map((a, i) => `${i + 1}. ${a}`).join("\n")}`
    : "No specific activities pre-planned for today — suggest appropriate ones.";

  const userMsg = [
    `Date: ${input.dayName} ${input.date}`,
    `Children attending: ~${input.childCount}`,
    input.ageRange ? `Age range: ${input.ageRange}` : "",
    input.roomName ? `Room: ${input.roomName}` : "",
    input.focusTopic ? `Focus topic: ${input.focusTopic}` : "",
    "",
    activityList,
    "",
    "Generate a complete, realistic daily routine using the set_daily_routine tool.",
  ].filter(Boolean).join("\n");

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system,
    messages: [{ role: "user", content: userMsg }],
    tools: [ROUTINE_TOOL],
    tool_choice: { type: "tool", name: "set_daily_routine" },
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  if (!toolUse) throw new Error("Model did not return a tool call");

  const result = toolUse.input as { blocks?: RoutineBlockRaw[] };
  return result.blocks ?? [];
}

// =========================================
// Group activity generation from follow-ups
// =========================================

export async function generateGroupActivity(
  followUpNotes: string[],
  outcomes: EylfOutcome[],
): Promise<RawActivitySuggestion> {
  const taxonomy = outcomes
    .map((o) => `${o.code} (Outcome ${o.outcome_number}) — ${o.sub_outcome_text}`)
    .join("\n");

  const system = `You are an expert early childhood educator using the Australian Early Years Learning Framework (EYLF V2.0).
You are given a list of follow-up intentions for different children — things educators want to explore next with each child.
Your job is to propose ONE group activity that addresses as many of these interests and learning threads as possible, suitable for a whole group or small group setting.

EYLF V2.0 taxonomy:
${taxonomy}

Rules:
- Propose exactly ONE group activity
- The activity must meaningfully connect to ALL or most of the listed follow-up intentions
- Choose EYLF outcomes that are genuinely covered by the activity — only from the taxonomy above
- Make it practical, inclusive, and doable in a typical early childhood centre
PRIVACY: Never include or repeat any child's name, date of birth, or any personal identifier in your response.`;

  const noteList = followUpNotes.map((n, i) => `${i + 1}. ${n}`).join("\n");
  const userMsg = `Here are the follow-up intentions for different children in the group:\n\n${noteList}\n\nPropose one group activity that addresses as many of these threads as possible. Use the propose_activities tool with exactly one activity.`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system,
    messages: [{ role: "user", content: userMsg }],
    tools: [makeActivitiesTool(1)],
    tool_choice: { type: "tool", name: "propose_activities" },
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  if (!toolUse) throw new Error("Model did not return a tool call");

  const result = toolUse.input as { activities?: RawActivitySuggestion[] };
  const activity = result.activities?.[0];
  if (!activity) throw new Error("No activity returned");
  return activity;
}

// =========================================
// Brain Breaks generation — digital/interactive mode
// Each break is designed to run on a classroom screen; no paper, no printing.
// =========================================

export interface RawBrainBreak {
  title: string;
  type: "movement" | "mindfulness" | "cognitive" | "creative" | "sensory";
  duration_minutes: number;
  energy_impact: "settles" | "energises" | "refocuses";
  /** Short tagline shown on the preview card. */
  screen_intro: string;
  /** movement: short on-screen action commands shown one at a time ("JUMP 5 TIMES! 🦘") */
  actions?: string[];
  /** cognitive: interactive multiple-choice questions displayed on screen */
  quiz_questions?: {
    question: string;
    options: string[];
    answer: string;
    /** Delightful extra fact revealed after the answer */
    fun_fact?: string;
  }[];
  /** mindfulness: parameters for the animated breathing circle */
  breathing?: {
    inhale_seconds: number;
    hold_seconds: number;
    exhale_seconds: number;
    cycles: number;
    /** Short calming phrase shown during the exercise */
    mantra?: string;
  };
  /** sensory: awareness prompts shown one at a time ("Close your eyes… name 3 sounds you can hear") */
  sensory_steps?: string[];
  /** creative: big on-screen challenge the whole group does together */
  creative_prompt?: string;
  /** Optional follow-up question shown at the end of creative/sensory breaks */
  discussion_question?: string;
  /** Exact phrase the educator says to bring the group back to work */
  transition_line: string;
  eylf_connection?: string;
}

export interface BrainBreakInput {
  ageGroup: string;
  roomEnergy: "too_high" | "too_low" | "scattered";
  durationMinutes: number;
  breakType?: string;
}

function makeBrainBreaksTool(count: number): Anthropic.Tool {
  return {
    name: "propose_brain_breaks",
    description: `Propose ${count} digital, interactive Brain Break activities that run on a classroom screen — no paper, no printing, no materials.`,
    input_schema: {
      type: "object",
      properties: {
        brain_breaks: {
          type: "array",
          minItems: 1,
          maxItems: count,
          items: {
            type: "object",
            required: ["title", "type", "duration_minutes", "energy_impact", "screen_intro", "transition_line"],
            properties: {
              title: { type: "string", description: "Short, catchy name shown on the card and on-screen header." },
              type: { type: "string", enum: ["movement", "mindfulness", "cognitive", "creative", "sensory"] },
              duration_minutes: { type: "integer", minimum: 1, maximum: 12 },
              energy_impact: {
                type: "string",
                enum: ["settles", "energises", "refocuses"],
                description: "'settles' calms a hyper room; 'energises' lifts a flat room; 'refocuses' restores attention without big energy change.",
              },
              screen_intro: {
                type: "string",
                description: "1–2 sentence tagline shown on the preview card so the educator can preview before launching.",
              },
              actions: {
                type: "array",
                description: "REQUIRED for 'movement' type. Short, punchy on-screen action commands children respond to physically — think Simon Says on a screen. Make them silly and physical. 6–10 actions. Examples: 'JUMP 5 TIMES! 🦘', 'WIGGLE YOUR WHOLE BODY! 🌊', 'ROAR LIKE A T-REX! 🦖', 'SPIN AROUND TWICE! 🌀', 'BALANCE ON ONE FOOT FOR 5 SECONDS! 🦩'.",
                items: { type: "string" },
              },
              quiz_questions: {
                type: "array",
                description: "REQUIRED for 'cognitive' type. Age-appropriate questions with big tappable options displayed on screen. Children shout out or come tap the screen. 3–5 questions.",
                items: {
                  type: "object",
                  required: ["question", "options", "answer"],
                  properties: {
                    question: { type: "string", description: "Fun, age-appropriate question — about animals, colours, counting, nature, the world." },
                    options: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4, description: "Short answer options (1–4 words each)." },
                    answer: { type: "string", description: "Must exactly match one of the options." },
                    fun_fact: { type: "string", description: "A short delightful extra fact shown after the answer is revealed — the 'wow!' moment." },
                  },
                },
              },
              breathing: {
                type: "object",
                description: "REQUIRED for 'mindfulness' type. Drives an animated breathing circle on screen that grows on inhale and shrinks on exhale. Children watch and breathe along.",
                required: ["inhale_seconds", "hold_seconds", "exhale_seconds", "cycles"],
                properties: {
                  inhale_seconds: { type: "integer", minimum: 2, maximum: 6 },
                  hold_seconds: { type: "integer", minimum: 0, maximum: 4 },
                  exhale_seconds: { type: "integer", minimum: 2, maximum: 6 },
                  cycles: { type: "integer", minimum: 3, maximum: 8, description: "How many full breath cycles." },
                  mantra: { type: "string", description: "Short calming phrase shown on screen during the exercise, e.g. 'I am calm. I am safe. I am ready.'" },
                },
              },
              sensory_steps: {
                type: "array",
                description: "REQUIRED for 'sensory' type. Sensory awareness prompts shown one at a time on screen — children close their eyes or focus attention then share. 4–7 steps. Examples: 'Close your eyes… how many sounds can you hear?', 'Press your feet flat on the floor. What does it feel like?'",
                items: { type: "string" },
              },
              creative_prompt: {
                type: "string",
                description: "REQUIRED for 'creative' type. A single big, playful creative challenge displayed large on screen — the whole group does it together. Examples: 'Use your body to make the shape of a letter — hold it while we guess!', 'Make the funniest face you can and freeze for 5 seconds!', 'Act like a slow-motion robot — move EVERY part of your body in slow motion.'",
              },
              discussion_question: {
                type: "string",
                description: "Optional. For creative/sensory types: a fun follow-up question shown on screen after the main activity, e.g. 'What was the trickiest part?' or 'If you were an animal, which one felt like you today?'",
              },
              transition_line: {
                type: "string",
                description: "The exact phrase the educator says to bring the group back to learning — warm, brief, ready. E.g. 'Shake it out — great work! Now let's bring those fresh brains back to the table.'",
              },
              eylf_connection: {
                type: "string",
                description: "One sentence naming the EYLF outcome this supports, e.g. 'EYLF 3.2 — children take increasing responsibility for their own health and physical wellbeing.'",
              },
            },
          },
        },
      },
      required: ["brain_breaks"],
    },
  };
}

export async function generateBrainBreaks(input: BrainBreakInput, count = 3): Promise<RawBrainBreak[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const client = new Anthropic({ apiKey });

  const AGE_LABELS: Record<string, string> = {
    toddlers_1_2: "toddlers aged 1–2 years",
    toddlers_2_3: "toddlers aged 2–3 years",
    preschool_3_4: "preschool children aged 3–4 years",
    preschool_4_5: "preschool children aged 4–5 years",
    kindy_5_plus: "kindergarten/school-age children aged 5+",
    mixed: "a mixed-age group",
  };
  const ENERGY_LABELS: Record<string, string> = {
    too_high: "too high — the room is loud, excited, or chaotic; children need to settle and refocus",
    too_low: "too low — children are disengaged, flat, or tired; they need energising to re-engage",
    scattered: "scattered/unfocused — attention is fragmented; children need a gentle reset without a big energy spike",
  };

  const ageLabel = AGE_LABELS[input.ageGroup] ?? input.ageGroup;
  const energyLabel = ENERGY_LABELS[input.roomEnergy] ?? input.roomEnergy;
  const typeInstruction =
    input.breakType && input.breakType !== "any"
      ? `Preferred type: ${input.breakType} — use this type for all ${count} suggestions.`
      : `Vary the types across the ${count} suggestions for variety.`;

  const systemPrompt = `You are an assistant for early childhood educators in Australia. You generate digital, on-screen "Brain Break" activities — interactive experiences that run on a classroom screen or device and that children engage with directly on the spot. These are NOT paper-based.

Critical context: children have been doing hands-on paper activities all day. Brain Breaks are a screen-based reward and energy reset — something fun to look forward to, and something that inadvertently keeps learning active without it feeling like work.

Design principle: EVERYTHING happens on the screen. No printing, no paper, no materials needed.
- movement: action commands appear on screen one at a time; children respond with their bodies (like Simon Says but on screen)
- mindfulness: an animated breathing circle on screen guides children through breath cycles
- cognitive: big, colourful multiple-choice questions appear on screen; children shout out or tap the answer; a fun fact is revealed after each answer
- creative: one big creative challenge fills the screen — the whole group does it together and laughs
- sensory: short awareness prompts appear on screen one at a time; children close their eyes or focus inward then share

Make the content exciting, silly, surprising, and age-appropriate. Cognitive questions should be genuinely fun (animal facts, surprising nature trivia, counting challenges). Movement actions should be delightfully silly. Creative prompts should make children laugh.

PRIVACY: Never include any child's name, date of birth, or personal identifier. Refer to children as "children" or "the group". This is a child safety requirement.`;

  const userPrompt = `Age group: ${ageLabel}
Current room energy: ${energyLabel}
Time available: approximately ${input.durationMinutes} minutes
${typeInstruction}

Propose ${count} digital Brain Break ideas using the propose_brain_breaks tool.`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    tools: [makeBrainBreaksTool(count)],
    tool_choice: { type: "tool", name: "propose_brain_breaks" },
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  if (!toolUse) throw new Error("Model did not return a tool call");

  const result = toolUse.input as { brain_breaks?: RawBrainBreak[] };
  return result.brain_breaks ?? [];
}
