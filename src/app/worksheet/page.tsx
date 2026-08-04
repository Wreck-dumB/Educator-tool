import type { Metadata } from "next";
import WorksheetClient from "./WorksheetClient";

export const metadata: Metadata = {
  title: "Worksheet · DR. SparkPlay",
};

interface Props {
  searchParams: Promise<{
    type?: string;
    name?: string | string[];
    title?: string;
    summary?: string;
    material?: string | string[];
    step?: string | string[];
    eylf?: string | string[];
    card?: string | string[];
    card_pairs?: string;
    image_subject?: string;
    letter_text?: string;
    duration?: string;
    age?: string;
    group?: string;
  }>;
}

const VALID_TYPES = new Set(["name_trace", "name_colouring", "letter_colouring", "drawing_frame", "writing_lines", "activity_sheet", "card_set", "instructions"]);

function toArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function WorksheetPage({ searchParams }: Props) {
  const { type, name, title, summary, material, step, eylf, card, card_pairs, image_subject, letter_text, duration, age, group } = await searchParams;

  const resolvedType =
    type && VALID_TYPES.has(type)
      ? (type as "name_trace" | "name_colouring" | "letter_colouring" | "drawing_frame" | "writing_lines" | "activity_sheet" | "card_set" | "instructions")
      : "name_trace";
  const resolvedNames = toArray(name)
    .flatMap((n) => n.split(","))
    .map((n) => n.trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, 100);
  const resolvedCards = toArray(card)
    .map((c) => c.trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, 16);
  const resolvedCardPairs = card_pairs !== "false";
  const resolvedImageSubject = typeof image_subject === "string" ? image_subject.trim().slice(0, 150) : "";
  const resolvedLetterText = typeof letter_text === "string" ? letter_text.trim().slice(0, 20) : "";
  const resolvedTitle =
    typeof title === "string" && title.trim()
      ? title.trim().slice(0, 120)
      : resolvedType === "name_trace"
        ? "Name Tracing Practice"
        : "Activity";
  const resolvedSummary = typeof summary === "string" ? summary.trim().slice(0, 400) : "";
  const resolvedMaterials = toArray(material).map((m) => m.slice(0, 80));
  const resolvedSteps = toArray(step).map((s) => s.slice(0, 300));
  const resolvedEylf = toArray(eylf).map((e) => e.slice(0, 10));
  const resolvedDuration = typeof duration === "string" ? duration.slice(0, 20) : "";
  const resolvedAge = typeof age === "string" ? age.slice(0, 40) : "";
  const resolvedGroup = typeof group === "string" ? group.slice(0, 40) : "";

  return (
    <WorksheetClient
      type={resolvedType}
      initialNames={resolvedNames}
      cardItems={resolvedCards}
      cardPairs={resolvedCardPairs}
      imageSubject={resolvedImageSubject}
      letterText={resolvedLetterText}
      title={resolvedTitle}
      summary={resolvedSummary}
      materials={resolvedMaterials}
      steps={resolvedSteps}
      eylfCodes={resolvedEylf}
      duration={resolvedDuration}
      age={resolvedAge}
      group={resolvedGroup}
    />
  );
}
