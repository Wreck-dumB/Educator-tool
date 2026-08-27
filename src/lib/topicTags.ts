// Domain/skill taxonomy used by AU early-childhood educators to categorise
// activities (Aussie Childcare Network, Butler Diaries, Twinkl AU) — the
// missing axis alongside the app's existing EYLF-outcome and print-template
// (suggested_template) tagging. Lets the template library be searched by
// "what kind of activity" independent of "which printable it produces."
export interface TopicTag {
  id: string;
  label: string;
}

export const TOPIC_TAGS: TopicTag[] = [
  { id: "art_craft", label: "Art & Craft" },
  { id: "sensory", label: "Sensory" },
  { id: "fine_motor", label: "Fine Motor" },
  { id: "gross_motor", label: "Gross Motor" },
  { id: "cooking", label: "Cooking" },
  { id: "music_rhymes", label: "Music & Rhymes" },
  { id: "science_discovery", label: "Science & Discovery" },
  { id: "literacy", label: "Literacy" },
  { id: "numeracy", label: "Numeracy" },
  { id: "dramatic_play", label: "Dramatic Play" },
  { id: "construction", label: "Construction & Blocks" },
  { id: "outdoor_nature", label: "Outdoor & Nature" },
];

export const TOPIC_TAG_IDS = TOPIC_TAGS.map((t) => t.id);

export function topicTagLabel(id: string): string {
  return TOPIC_TAGS.find((t) => t.id === id)?.label ?? id;
}
