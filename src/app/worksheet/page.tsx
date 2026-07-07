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
  }>;
}

const VALID_TYPES = new Set(["name_trace", "drawing_frame"]);

export default async function WorksheetPage({ searchParams }: Props) {
  const { type, name, title } = await searchParams;

  const resolvedType =
    type && VALID_TYPES.has(type) ? (type as "name_trace" | "drawing_frame") : "drawing_frame";
  const resolvedName = typeof name === "string" ? name.trim().slice(0, 60) : "";
  const resolvedTitle =
    typeof title === "string" && title.trim()
      ? title.trim().slice(0, 100)
      : resolvedType === "name_trace"
        ? "Name Tracing Practice"
        : "Drawing Activity";

  return (
    <WorksheetClient
      type={resolvedType}
      initialName={resolvedName}
      title={resolvedTitle}
    />
  );
}
