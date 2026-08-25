export type PrintTemplateType =
  | "activity_sheet"
  | "drawing_frame"
  | "writing_lines"
  | "name_trace"
  | "name_colouring"
  | "name_label"
  | "letter_colouring"
  | "card_set"
  | "instructions"
  | "matching_pairs"
  | "counting_groups"
  | "letter_trace"
  | "trace_maze"
  | "dot_to_dot"
  | "odd_one_out"
  | "feelings_checkin"
  | "cut_and_sort";

export const TEMPLATE_LABELS: Record<PrintTemplateType, string> = {
  activity_sheet: "Activity sheet",
  drawing_frame: "Drawing frame",
  writing_lines: "Writing lines",
  name_trace: "Name tracing",
  name_colouring: "Name colouring",
  name_label: "Name label",
  letter_colouring: "Letter/number colouring",
  card_set: "Card set",
  instructions: "Instruction card",
  matching_pairs: "Matching pairs",
  counting_groups: "Counting worksheet",
  letter_trace: "Letter tracing",
  trace_maze: "Trace-the-path maze",
  dot_to_dot: "Dot-to-dot",
  odd_one_out: "Odd one out",
  feelings_checkin: "Feelings check-in",
  cut_and_sort: "Cut and sort",
};

export const TEMPLATE_DESCRIPTIONS: Record<PrintTemplateType, string> = {
  activity_sheet: "Materials checklist + workspace (craft, art, collage, cooking, building)",
  drawing_frame: "Large blank frame (drawing, sketching, design)",
  writing_lines: "Lined paper (writing, journalling, language activities)",
  name_trace: "Guided name-tracing lines (name writing practice only)",
  name_colouring: "Child's name in big hollow letters to colour in or glue collage onto (name recognition, not handwriting)",
  name_label: "Child's name in solid bold text, ready to cut out — for place markers, cubby labels, name tags, table settings (not for tracing or colouring)",
  letter_colouring: "One letter, number, or short word in big hollow text to colour in (alphabet/number recognition, not the child's own name)",
  card_set: "Printable cut-out cards, one picture + label per card (flashcards, memory/matching, snap, go fish)",
  instructions: "Steps + EYLF codes + time/group info (outdoor, physical, discussion, music)",
  matching_pairs: "Two-column draw-the-line worksheet — children draw lines connecting each item to its matching pair",
  counting_groups: "Groups of objects — children count each group and write the number in the blank",
  letter_trace: "Dotted single-line tracing practice for one letter, number, or short word (motor-skill formation practice, not name work)",
  trace_maze: "A winding path from a start picture to an end picture for children to trace with a pencil",
  dot_to_dot: "Numbered dots that reveal a picture when connected in order",
  odd_one_out: "A row of pictures where children circle the one that's different from the rest",
  feelings_checkin: "A grid of feeling faces — children circle how they feel right now",
  cut_and_sort: "Small pictures to cut out and glue into labelled columns (sorting/categorising)",
};

export const TEMPLATE_COLOURS: Record<PrintTemplateType, string> = {
  activity_sheet: "bg-coral-light text-coral-dark",
  drawing_frame: "bg-sage-light text-sage-dark",
  writing_lines: "bg-blue-50 text-blue-700",
  name_trace: "bg-amber-50 text-amber-700",
  name_colouring: "bg-purple-50 text-purple-700",
  name_label: "bg-rose-50 text-rose-700",
  letter_colouring: "bg-indigo-50 text-indigo-700",
  card_set: "bg-teal-50 text-teal-700",
  instructions: "bg-cream-dark text-ink/70",
  matching_pairs: "bg-violet-50 text-violet-700",
  counting_groups: "bg-orange-50 text-orange-700",
  letter_trace: "bg-yellow-50 text-yellow-700",
  trace_maze: "bg-lime-50 text-lime-700",
  dot_to_dot: "bg-cyan-50 text-cyan-700",
  odd_one_out: "bg-pink-50 text-pink-700",
  feelings_checkin: "bg-fuchsia-50 text-fuchsia-700",
  cut_and_sort: "bg-emerald-50 text-emerald-700",
};

// ─── Keyword sets ──────────────────────────────────────────────────────────────

// A plain solid-text name for cutting out — place markers, cubby/desk labels,
// name tags, table settings. Distinct from both colouring (hollow) and
// tracing (dotted). Checked before NAME_COLOURING_KW/NAME_TRACE_KW.
const NAME_LABEL_KW =
  /\b(name\s+(?:labels?|tags?|plates?|placemarkers?|cards?)|place\s*(?:\s|-)?markers?|place\s*cards?|cubby\s+labels?|desk\s+labels?|table\s+settings?)\b/i;

// Colouring/decorating the child's own name — distinct from tracing it for
// handwriting practice. Checked before NAME_TRACE_KW.
const NAME_COLOURING_KW =
  /\b(colour\s*(?:ing)?\s+(?:in\s+)?(?:my|your|their|his|her)?\s*name|name\s+colour|decorat\w*\s+(?:my|your|their)?\s*name)\b/i;

const NAME_TRACE_KW =
  /\b(trace\s+name|name\s+trac|writ\w*\s+(your|my|their|his|her)\s+(own\s+)?name|name\s+practic|name\s+writ|practis\w*\s+(writ\w*\s+)?(your|my|their|his|her)?\s*(own\s+)?name)\b/i;

const CRAFT_KW =
  /\b(paste|glue|gluing|collage|craft|stamp|mould|moulding|sculpt|sculpting|fold|weave|bake|baking|cook|cooking|clay|dough|construct|assemble|stick|sticking|tear|tearing|pour|mixing|knit|sew|lace)\b/i;

const DRAW_KW =
  /\b(draw|drawing|sketch|sketching|illustrat|doodle|trace\s+(the|a|an|this|picture|image|outline))\b/i;

// Colouring in a picture of some subject (a character, animal, object) — not
// the child's own name (NAME_COLOURING_KW, checked first) and not a specific
// letter/number (letter_colouring needs letter_text, which nothing here can
// supply — see the fallback note below). This is the "give me a picture to
// colour in" case; it needs the outline/line-art template, same as free
// drawing, even when craft materials like crayons are also listed — checked
// before the materials-based activity_sheet branch for that reason.
const COLOUR_PICTURE_KW = /\b(colour\s*(?:ing)?\s*[- ]?\s*in|colouring[- ]book|colour[- ]in)\b/i;

const WRITE_KW =
  /\b(write|writing|journal|journalling|sentence|story|stories|handwriting|copy\s+the|letter\s+formation|alphabet)\b/i;

// Needs no structured companion data (unlike letter_trace/trace_maze/dot_to_dot/
// odd_one_out/cut_and_sort, which all need an AI-supplied letter/emoji/shape id/
// clipart id that free text can't reliably supply — those are classify-only,
// same reasoning as card_set/letter_colouring/matching_pairs/counting_groups below).
const FEELINGS_KW = /\b(feelings?\s*check[- ]?in|how\s+(are\s+you|do\s+you)\s+feel|emotion\w*\s+(check|circle)|feelings?\s+circle)\b/i;

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

  // All three are very specific — only if the activity is literally about the child's own name
  if (NAME_LABEL_KW.test(text)) return "name_label";
  if (NAME_COLOURING_KW.test(text)) return "name_colouring";
  if (NAME_TRACE_KW.test(text)) return "name_trace";

  if (FEELINGS_KW.test(text)) return "feelings_checkin";

  // A picture to colour in needs the outline/line-art template even if
  // crayons or colouring pencils are also listed as materials — check this
  // before the materials-based activity_sheet branches below.
  if (COLOUR_PICTURE_KW.test(text)) return "drawing_frame";

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

  // Unknown — default to instruction card (not name_trace). Note: "card_set",
  // "letter_colouring", "letter_trace", "trace_maze", "dot_to_dot",
  // "odd_one_out", and "cut_and_sort" are deliberately never fallback guesses
  // here — they each need structured data (card_items / letter_text /
  // maze emoji / dot_to_dot_shape / clipart ids) that only the AI's explicit
  // suggested_template call can provide; there's nothing reliable to parse
  // out of free text for any of them.
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
    clipart_id?: string | null;
    letter_text?: string | null;
    matching_left?: string[];
    matching_right?: string[];
    counting_groups?: { emoji: string; label: string; count: number }[];
    maze_start_emoji?: string | null;
    maze_end_emoji?: string | null;
    dot_to_dot_shape?: string | null;
    odd_one_out_same?: string[];
    odd_one_out_different?: string | null;
    cut_and_sort_groups?: { label: string; items: string[] }[];
  },
  childName?: string,
): string {
  const params = new URLSearchParams({ type: templateType, title: activity.title });

  // Concrete drawable subject for auto-generated illustrations — absent on
  // purpose means "leave the page blank", never falls back to the title.
  if (
    (templateType === "activity_sheet" || templateType === "drawing_frame" || templateType === "name_colouring" || templateType === "name_label") &&
    activity.image_subject
  ) {
    params.set("image_subject", activity.image_subject);
    if (activity.clipart_id) params.set("clipart_id", activity.clipart_id);
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

  // Matching pairs: left + right columns (worksheet shuffles right before display)
  if (templateType === "matching_pairs") {
    activity.matching_left?.forEach((v) => params.append("ml", v));
    activity.matching_right?.forEach((v) => params.append("mr", v));
  }

  // Counting groups: emoji|label|count per group
  if (templateType === "counting_groups") {
    activity.counting_groups?.forEach((g) => params.append("cg", `${g.emoji}|${g.label}|${g.count}`));
  }

  // Letter trace: same letter_text param as letter_colouring
  if (templateType === "letter_trace" && activity.letter_text) {
    params.set("letter_text", activity.letter_text);
  }

  // Trace maze: start/end emoji (falls back to a default pair if absent)
  if (templateType === "trace_maze") {
    params.set("maze_start", activity.maze_start_emoji || "🐭");
    params.set("maze_end", activity.maze_end_emoji || "🧀");
  }

  // Dot to dot: which curated shape to render
  if (templateType === "dot_to_dot" && activity.dot_to_dot_shape) {
    params.set("shape", activity.dot_to_dot_shape);
  }

  // Odd one out: 3+ matching clipart ids, then the one that's different
  if (templateType === "odd_one_out") {
    activity.odd_one_out_same?.forEach((id) => params.append("same", id));
    if (activity.odd_one_out_different) params.set("different", activity.odd_one_out_different);
  }

  // Cut and sort: label|item,item,item per column
  if (templateType === "cut_and_sort") {
    activity.cut_and_sort_groups?.forEach((g) => params.append("sort", `${g.label}|${g.items.join(",")}`));
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
