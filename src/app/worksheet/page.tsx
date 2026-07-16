import type { Metadata } from "next";
import WorksheetClient from "./WorksheetClient";

export const metadata: Metadata = {
  title: "Worksheet · DR. SparkPlay",
};

interface Props {
  searchParams: Promise<{
    type?: string;
    name?: string;
    title?: string;
    summary?: string;
    material?: string | string[];
    step?: string | string[];
    eylf?: string | string[];
    duration?: string;
    age?: string;
    group?: string;
  }>;
}

const VALID_TYPES = new Set(["name_trace", "drawing_frame", "writing_lines", "activity_sheet", "instructions"]);

function toArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function WorksheetPage({ searchParams }: Props) {
  const { type, name, title, summary, material, step, eylf, duration, age, group } = await searchParams;

  const resolvedType =
    type && VALID_TYPES.has(type)
      ? (type as "name_trace" | "drawing_frame" | "writing_lines" | "activity_sheet" | "instructions")
      : "name_trace";
  const resolvedName = typeof name === "string" ? name.trim().slice(0, 60) : "";
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
      initialName={resolvedName}
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
