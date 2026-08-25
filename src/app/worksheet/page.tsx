import type { Metadata } from "next";
import WorksheetClient from "./WorksheetClient";
import { CLIPART_ITEMS } from "@/lib/clipart";
import { DOT_TO_DOT_SHAPES } from "@/lib/dotToDot";

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
    clipart_id?: string;
    letter_text?: string;
    duration?: string;
    age?: string;
    group?: string;
    ml?: string | string[];
    mr?: string | string[];
    cg?: string | string[];
    maze_start?: string;
    maze_end?: string;
    shape?: string;
    same?: string | string[];
    different?: string;
    sort?: string | string[];
  }>;
}

const VALID_TYPES = new Set(["name_trace", "name_colouring", "name_label", "letter_colouring", "drawing_frame", "writing_lines", "activity_sheet", "card_set", "instructions", "matching_pairs", "counting_groups", "letter_trace", "trace_maze", "dot_to_dot", "odd_one_out", "feelings_checkin", "cut_and_sort"]);

function toArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function WorksheetPage({ searchParams }: Props) {
  const { type, name, title, summary, material, step, eylf, card, card_pairs, image_subject, clipart_id, letter_text, duration, age, group, ml, mr, cg, maze_start, maze_end, shape, same, different, sort } = await searchParams;

  const resolvedType =
    type && VALID_TYPES.has(type)
      ? (type as "name_trace" | "name_colouring" | "name_label" | "letter_colouring" | "drawing_frame" | "writing_lines" | "activity_sheet" | "card_set" | "instructions" | "matching_pairs" | "counting_groups" | "letter_trace" | "trace_maze" | "dot_to_dot" | "odd_one_out" | "feelings_checkin" | "cut_and_sort")
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
  const resolvedClipartId =
    typeof clipart_id === "string" && CLIPART_ITEMS.some((i) => i.id === clipart_id) ? clipart_id : "";
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
  const resolvedMatchingLeft = toArray(ml).map((v) => v.trim().slice(0, 20)).filter(Boolean).slice(0, 6);
  const resolvedMatchingRight = toArray(mr).map((v) => v.trim().slice(0, 20)).filter(Boolean).slice(0, 6);
  const resolvedCountingGroups = toArray(cg).flatMap((v) => {
    const parts = v.split("|");
    if (parts.length !== 3) return [];
    const count = parseInt(parts[2], 10);
    if (!Number.isInteger(count) || count < 1 || count > 10) return [];
    return [{ emoji: parts[0].slice(0, 10), label: parts[1].trim().slice(0, 20), count }];
  }).slice(0, 5);
  const resolvedMazeStart = typeof maze_start === "string" ? maze_start.trim().slice(0, 10) : "";
  const resolvedMazeEnd = typeof maze_end === "string" ? maze_end.trim().slice(0, 10) : "";
  const resolvedShape =
    typeof shape === "string" && DOT_TO_DOT_SHAPES.some((s) => s.id === shape) ? shape : "";
  const resolvedSame = toArray(same)
    .filter((id) => CLIPART_ITEMS.some((i) => i.id === id))
    .slice(0, 5);
  const resolvedDifferent =
    typeof different === "string" && CLIPART_ITEMS.some((i) => i.id === different) ? different : "";
  const resolvedSortGroups = toArray(sort).flatMap((v) => {
    const [label, itemsStr] = v.split("|");
    if (!label || !itemsStr) return [];
    const items = itemsStr.split(",").filter((id) => CLIPART_ITEMS.some((i) => i.id === id));
    if (items.length === 0) return [];
    return [{ label: label.trim().slice(0, 30), items }];
  }).slice(0, 3);

  return (
    <WorksheetClient
      type={resolvedType}
      initialNames={resolvedNames}
      cardItems={resolvedCards}
      cardPairs={resolvedCardPairs}
      imageSubject={resolvedImageSubject}
      clipartId={resolvedClipartId}
      letterText={resolvedLetterText}
      title={resolvedTitle}
      summary={resolvedSummary}
      materials={resolvedMaterials}
      steps={resolvedSteps}
      eylfCodes={resolvedEylf}
      duration={resolvedDuration}
      age={resolvedAge}
      group={resolvedGroup}
      matchingLeft={resolvedMatchingLeft}
      matchingRight={resolvedMatchingRight}
      countingGroups={resolvedCountingGroups}
      mazeStartEmoji={resolvedMazeStart}
      mazeEndEmoji={resolvedMazeEnd}
      dotToDotShape={resolvedShape}
      oddOneOutSame={resolvedSame}
      oddOneOutDifferent={resolvedDifferent}
      cutAndSortGroups={resolvedSortGroups}
    />
  );
}
