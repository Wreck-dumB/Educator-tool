// Lightweight visual-aid icons (emoji) for activity cards — no external API,
// no cost. Helps quick visual scanning regardless of reading ability.

const MATERIAL_KEYWORDS: Array<[RegExp, string]> = [
  [/paint/i, "🎨"],
  [/(crayon|marker|pencil|chalk)/i, "✏️"],
  [/paper/i, "📄"],
  [/cardboard|box/i, "📦"],
  [/block/i, "🧱"],
  [/sand/i, "🏖️"],
  [/water/i, "💧"],
  [/fabric|cloth|scrap/i, "🧵"],
  [/music|instrument|drum|bell/i, "🎵"],
  [/ball/i, "⚽"],
  [/book/i, "📖"],
  [/leaf|stick|pinecone|nature|rock|shell/i, "🍂"],
  [/string|rope|yarn/i, "🧶"],
  [/clay|dough|playdough/i, "🟤"],
  [/scissors/i, "✂️"],
  [/glue|tape/i, "🧴"],
  [/bubble/i, "🫧"],
  [/animal|toy/i, "🧸"],
  [/mirror/i, "🪞"],
  [/cup|container|bottle/i, "🥤"],
];

export function getMaterialIcon(name: string): string {
  for (const [pattern, icon] of MATERIAL_KEYWORDS) {
    if (pattern.test(name)) return icon;
  }
  return "🔹";
}

export function getEnergyIcon(level: string | null): string {
  switch (level) {
    case "calm":
      return "🧘";
    case "moderate":
      return "🙂";
    case "high":
      return "🏃";
    default:
      return "";
  }
}

export function getGroupIcon(size: string | null): string {
  switch (size) {
    case "solo":
      return "🧍";
    case "small_group":
      return "🧑‍🤝‍🧑";
    case "whole_group":
      return "👥";
    default:
      return "";
  }
}

/** Tailwind classes for an energy-level pill, matching the warm palette. */
export function getEnergyBadgeClass(level: string | null): string {
  switch (level) {
    case "calm":
      return "bg-sage-light text-sage-dark";
    case "moderate":
      return "bg-amber-light text-amber-dark";
    case "high":
      return "bg-coral-light text-coral-dark";
    default:
      return "bg-cream-dark text-ink/60";
  }
}

/**
 * Tailwind classes for a risk-rating badge. "Extreme" intentionally breaks from
 * the warm palette into a plain alarming red — safety signalling should stay
 * legible even where it clashes with the brand colors.
 */
export function getRiskRatingBadgeClass(rating: string): string {
  switch (rating) {
    case "low":
      return "bg-sage-light text-sage-dark";
    case "medium":
      return "bg-amber-light text-amber-dark";
    case "high":
      return "bg-coral-light text-coral-dark";
    case "extreme":
      return "bg-red-600 text-white";
    default:
      return "bg-cream-dark text-ink/60";
  }
}

const MILESTONE_DOMAIN_LABELS: Record<string, string> = {
  gross_motor: "Gross motor",
  fine_motor: "Fine motor",
  language: "Language",
  social_emotional: "Social-emotional",
  cognitive: "Cognitive",
  physical: "Physical development",
};

const MILESTONE_DOMAIN_ICONS: Record<string, string> = {
  gross_motor: "🏃",
  fine_motor: "✋",
  language: "💬",
  social_emotional: "🤝",
  cognitive: "🧠",
  physical: "🌱",
};

export function getMilestoneDomainLabel(domain: string): string {
  return MILESTONE_DOMAIN_LABELS[domain] ?? domain;
}

export function getMilestoneDomainIcon(domain: string): string {
  return MILESTONE_DOMAIN_ICONS[domain] ?? "📌";
}
