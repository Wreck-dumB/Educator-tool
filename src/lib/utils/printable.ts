export type PrintTemplateType =
  | "activity_sheet"
  | "drawing_frame"
  | "writing_lines"
  | "name_trace"
  | "name_colouring"
  | "letter_colouring"
  | "card_set"
  | "instructions";

export const TEMPLATE_LABELS: Record<PrintTemplateType, string> = {
  activity_sheet: "Activity sheet",
  drawing_frame: "Drawing frame",
  writing_lines: "Writing lines",
  name_trace: "Name tracing",
  name_colouring: "Name colouring",
  letter_colouring: "Letter/number colouring",
  card_set: "Card set",
  instructions: "Instruction card",
};

export const TEMPLATE_DESCRIPTIONS: Record<PrintTemplateType, string> = {
  activity_sheet: "Materials checklist + workspace (craft, art, collage, cooking, building)",
  drawing_frame: "Large blank frame (drawing, sketching, design)",
  writing_lines: "Lined paper (writing, journalling, language activities)",
  name_trace: "Guided name-tracing lines (name writing practice only)",
  name_colouring: "Child's name in big hollow letters to colour in or glue collage onto (name recognition, not handwriting)",
  letter_colouring: "One letter, number, or short word in big hollow text to colour in (alphabet/number recognition, not the child's own name)",
  card_set: "Printable cut-out cards, one picture + label per card (flashcards, memory/matching, snap, go fish)",
  instructions: "Steps + EYLF codes + time/group info (outdoor, physical, discussion, music)",
};

export const TEMPLATE_COLOURS: Record<PrintTemplateType, string> = {
  activity_sheet: "bg-coral-light text-coral-dark",
  drawing_frame: "bg-sage-light text-sage-dark",
  writing_lines: "bg-blue-50 text-blue-700",
  name_trace: "bg-amber-50 text-amber-700",
  name_colouring: "bg-purple-50 text-purple-700",
  letter_colouring: "bg-indigo-50 text-indigo-700",
  card_set: "bg-teal-50 text-teal-700",
  instructions: "bg-cream-dark text-ink/70",
};

// ─── Keyword sets ──────────────────────────────────────────────────────────────

// Colouring/decorating the child's own name — distinct from tracing it for
// handwriting practice. Checked before NAME_TRACE_KW.
const NAME_COLOURING_KW =
  /\b(colour\s*(?:ing)?\s+(?:in\s+)?(?:my|your|their|his|her)?\s*name|name\s+colour|decorat\w*\s+(?:my|your|their)?\s*name)\b/i;

const NAME_TRACE_KW =
  /\b(trace\s+name|name\s+trac|write\s+(your|my|their)\s+name|name\s+practic|name\s+writ|practis\w*\s+name)\b/i;

const CRAFT_KW =
  /\b(paste|glue|gluing|collage|craft|stamp|mould|moulding|sculpt|sculpting|fold|weave|bake|baking|cook|cooking|clay|dough|construct|assemble|stick|sticking|tear|tearing|pour|mixing|knit|sew|lace)\b/i;

const DRAW_KW =
  /\b(draw|drawing|sketch|sketching|illustrat|doodle|trace\s+(the|a|an|this|picture|image|outline))\b/i;

const WRITE_KW =
  /\b(write|writing|journal|journalling|sentence|story|stories|handwriting|copy\s+the|letter\s+formation|alphabet)\b/i;

const PHYSICAL_KW =
  /\b(outdoor|outside|garden|playground|run|running|jump|jumping|dance|dancing|yoga|stretch|stretching|walk|walking|obstacle|sport|game|ball|physical|movement|exercise|music|singing|sing|listen|listening|discuss|discussion|mindful|breath|breathing|story\s+time|storytime|reading\s+aloud|read\s+aloud|circle\s+time|mat\s+time)\b/i;

type ActivityShape = {
  generation_mode?: string | null;
  materials_used?: string[];
  title: string;
  steps?: string[];
};

export function detectPrintTemplate(activity: ActivityShape): PrintTemplateType {
  const text = [activity.title, ...(activity.steps ?? [])].join(" ");

  // Both are very specific — only if the activity is literally about the child's own name
  if (NAME_COLOURING_KW.test(text)) return "name_colouring";
  if (NAME_TRACE_KW.test(text)) return "name_trace";

  // Materials-based generation is by definition hands-on
  if (activity.generation_mode === "materials") return "activity_sheet";

  // Has materials AND craft/physical verbs → activity sheet
  if ((activity.materials_used?.length ?? 0) > 0 && CRAFT_KW.test(text)) return "activity_sheet";

  // Has materials generally → activity sheet (if you need stuff, it's probably hands-on)
  if ((activity.materials_used?.length ?? 0) > 0) return "activity_sheet";

  // No materials — check by activity type
  if (DRAW_KW.test(text)) return "drawing_frame";
  if (WRITE_KW.test(text)) return "writing_lines";

  // Outdoor / physical / discussion / music → instruction card
  if (PHYSICAL_KW.test(text)) return "instructions";

  // Unknown — default to instruction card (not name_trace). Note: "card_set"
  // and "letter_colouring" are deliberately never fallback guesses here —
  // they each need structured data (card_items / letter_text) that only the
  // AI's explicit suggested_template call can provide; there's nothing
  // reliable to parse out of free text for either.
  return "instructions";
}

// ─── URL builder ──────────────────────────────────────────────────────────────

export function buildWorksheetUrl(
  templateType: PrintTemplateType,
  activity: {
    title: string;
    summary?: string | null;
    materials_used?: string[];
    steps?: string[];
    eylf_codes?: string[];
    duration_minutes?: number | null;
    age_range?: string | null;
    group_size_fit?: string | null;
    card_items?: string[];
    card_pairs?: boolean;
    image_subject?: string | null;
    letter_text?: string | null;
  },
  childName?: string,
): string {
  const params = new URLSearchParams({ type: templateType, title: activity.title });

  // Concrete drawable subject for auto-generated illustrations — absent on
  // purpose means "leave the page blank", never falls back to the title.
  if ((templateType === "activity_sheet" || templateType === "drawing_frame") && activity.image_subject) {
    params.set("image_subject", activity.image_subject);
  }

  // Accepts a comma-separated list — one worksheet name per entry
  childName
    ?.split(",")
    .map((n) => n.trim())
    .filter(Boolean)
    .forEach((n) => params.append("name", n));

  // Activity sheet: materials + image generation (no steps in URL — the sheet is a workspace)
  if (templateType === "activity_sheet") {
    activity.materials_used?.forEach((m) => params.append("material", m));
  }

  // Card set: one label per card face — duplicated into a pair unless card_pairs is false
  if (templateType === "card_set") {
    activity.card_items?.forEach((c) => params.append("card", c));
    if (activity.card_pairs === false) params.set("card_pairs", "false");
  }

  // Letter colouring: the exact letter/number/word to render
  if (templateType === "letter_colouring" && activity.letter_text) {
    params.set("letter_text", activity.letter_text);
  }

  // Drawing frame / writing lines: child name already set above, no extra params needed

  // Instructions: full educator card — steps, EYLF, duration, age, group
  if (templateType === "instructions") {
    if (activity.summary) params.set("summary", activity.summary);
    if (activity.duration_minutes) params.set("duration", String(activity.duration_minutes));
    if (activity.age_range) params.set("age", activity.age_range);
    if (activity.group_size_fit) params.set("group", activity.group_size_fit);
    activity.materials_used?.forEach((m) => params.append("material", m));
    activity.steps?.forEach((s) => params.append("step", s));
    activity.eylf_codes?.forEach((e) => params.append("eylf", e));
  }

  return `/worksheet?${params.toString()}`;
}
