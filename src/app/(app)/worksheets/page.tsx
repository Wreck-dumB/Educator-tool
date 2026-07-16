import { getActivities } from "@/lib/supabase/activities";
import WorksheetGenerator from "./WorksheetGenerator";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Printable Sheets · DR. SparkPlay" };

export default async function WorksheetsPage() {
  const all = await getActivities();
  const activities = all.filter((a) => !a.is_archived);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Printable Sheets</h1>
      <p className="mt-1 text-sm text-ink/60">
        Choose an activity to generate the right printable — activity worksheets, drawing frames,
        writing lines, name-tracing sheets, or educator instruction cards. The template type is
        auto-detected from the activity; change it if needed.
      </p>
      <WorksheetGenerator activities={activities} />
    </div>
  );
}
