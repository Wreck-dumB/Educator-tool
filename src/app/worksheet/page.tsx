import type { Metadata } from "next";
import WorksheetClient from "./WorksheetClient";

export const metadata: Metadata = {
  title: "Worksheet · SparkPlay",
};

interface Props {
  searchParams: Promise<{
    type?: string;
    name?: string;
    title?: string;
    material?: string | string[];
  }>;
}

const VALID_TYPES = new Set(["name_trace", "drawing_frame", "writing_lines", "activity_sheet"]);

function toArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function WorksheetPage({ searchParams }: Props) {
  const { type, name, title, material } = await searchParams;

  const resolvedType =
    type && VALID_TYPES.has(type)
      ? (type as "name_trace" | "drawing_frame" | "writing_lines" | "activity_sheet")
      : "name_trace";
  const resolvedName = typeof name === "string" ? name.trim().slice(0, 60) : "";
  const resolvedTitle =
    typeof title === "string" && title.trim()
      ? title.trim().slice(0, 120)
      : resolvedType === "name_trace"
        ? "Name Tracing Practice"
        : "Activity";
  const resolvedMaterials = toArray(material).map((m) => m.slice(0, 80));

  return (
    <WorksheetClient
      type={resolvedType}
      initialName={resolvedName}
      title={resolvedTitle}
      materials={resolvedMaterials}
    />
  );
}
