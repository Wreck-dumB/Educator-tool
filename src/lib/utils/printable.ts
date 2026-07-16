export type PrintTemplateType =
  | "activity_sheet"
  | "drawing_frame"
  | "writing_lines"
  | "name_trace"
  | "instructions";

export const TEMPLATE_LABELS: Record<PrintTemplateType, string> = {
  activity_sheet: "Activity sheet",
  drawing_frame: "Drawing frame",
  writing_lines: "Writing lines",
  name_trace: "Name tracing",
  instructions: "Instruction card",
};

export const TEMPLATE_DESCRIPTIONS: Record<PrintTemplateType, string> = {
  activity_sheet: "Materials checklist + workspace (craft, art, collage, cooking, building)",
  drawing_frame: "Large blank frame (drawing, sketching, design)",
  writing_lines: "Lined paper (writing, journalling, language activities)",
  name_trace: "Guided name-tracing lines (name writing practice only)",
  instructions: "Steps + EYLF codes + time/group info (outdoor, physical, discussion, music)",
};

export const TEMPLATE_COLOURS: Record<PrintTemplateType, string> = {
  activity_sheet: "bg-coral-light text-coral-dark",
  drawing_frame: "bg-sage-light text-sage-dark",
  writing_lines: "bg-blue-50 text-blue-700",
  name_trace: "bg-amber-50 text-amber-700",
  instructions: "bg-cream-dark text-ink/70",
};

// ─── Keyword sets ──────────────────────────────────────────────────────────────

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

  // Name tracing is very specific — only if the activity is literally about tracing names
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

  // Unknown — default to instruction card (not name_trace)
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
  },
  childName?: string,
): string {
  const params = new URLSearchParams({ type: templateType, title: activity.title });

  if (childName?.trim()) params.set("name", childName.trim());

  // Activity sheet: materials + image generation (no steps in URL — the sheet is a workspace)
  if (templateType === "activity_sheet") {
    activity.materials_used?.forEach((m) => params.append("material", m));
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
