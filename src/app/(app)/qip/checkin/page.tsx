import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { cardClass, successBannerClass } from "@/lib/ui";
import { saveQipCheckin } from "../actions";
import type { QipCheckinResponse } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "QIP Daily Check-in · SparkPlay" };

const QA_QUESTIONS: { qa: number; area: string; question: string }[] = [
  {
    qa: 1,
    area: "Educational program and practice",
    question:
      "Were observations and documentation recorded to reflect each child's learning and development today?",
  },
  {
    qa: 2,
    area: "Children's health and safety",
    question:
      "Were all health and safety requirements met — supervision, hygiene, and incident response?",
  },
  {
    qa: 3,
    area: "Physical environment",
    question:
      "Was the physical environment set up safely, inclusively, and with appropriate learning opportunities?",
  },
  {
    qa: 4,
    area: "Staffing arrangements",
    question:
      "Were staff-to-child ratios maintained and were all planned learning activities supported?",
  },
  {
    qa: 5,
    area: "Relationships with children",
    question:
      "Did educators foster warm, respectful, and responsive relationships with every child today?",
  },
  {
    qa: 6,
    area: "Collaborative partnerships with families and communities",
    question:
      "Were families greeted, informed, and any messages or concerns acted on today?",
  },
  {
    qa: 7,
    area: "Governance and leadership",
    question:
      "Were all records, policies, and regulatory compliance requirements met today?",
  },
];

const ANSWER_STYLES = {
  yes: "border-sage bg-sage-light text-sage-dark",
  mostly: "border-amber-400 bg-amber-50 text-amber-800",
  no: "border-coral bg-coral-light text-coral-dark",
};

function todayLocal() {
  return new Date().toISOString().slice(0, 10);
}

export default async function QipCheckinPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; saved?: string; flagged?: string }>;
}) {
  const { date: dateParam, saved, flagged } = await searchParams;
  const date = dateParam ?? todayLocal();
  const isToday = date === todayLocal();
  const displayDate = new Date(date + "T12:00:00").toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const flaggedQAs = flagged ? flagged.split(",").map(Number) : [];

  const supabase = await createClient();
  const ownerUserId = await getMyServiceOwnerId();

  // Fetch today's check-in and last 30 days of history
  const [{ data: existing }, { data: history }] = await Promise.all([
    supabase
      .from("qip_daily_checkins")
      .select("*")
      .eq("owner_user_id", ownerUserId ?? "")
      .eq("checkin_date", date)
      .maybeSingle(),
    supabase
      .from("qip_daily_checkins")
      .select("checkin_date, flagged_areas, responses, submitted_by, overall_notes")
      .eq("owner_user_id", ownerUserId ?? "")
      .order("checkin_date", { ascending: false })
      .limit(30),
  ]);

  const existingResponses: QipCheckinResponse[] =
    (existing?.responses as QipCheckinResponse[] | null) ?? [];
  const existingResponseMap = new Map(existingResponses.map((r) => [r.qa, r]));

  const alreadySubmitted = !!existing && !saved;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-coral-dark">QIP Daily Check-in</h1>
          <p className="mt-1 text-sm text-ink/60">
            End-of-day review across all 7 National Quality Standard areas.
            Each check-in is dated and saved — producible within 24&nbsp;hours if spot-checked.
          </p>
        </div>
        <Link
          href="/qip"
          className="shrink-0 rounded-full border border-coral-light px-3 py-1.5 text-xs font-semibold text-coral-dark hover:bg-coral-light"
        >
          ← Full QIP
        </Link>
      </div>

      {/* Date selector */}
      <div className="mt-4 flex items-center gap-3">
        <span className="text-sm font-medium text-ink/70">Date:</span>
        <input
          type="date"
          defaultValue={date}
          max={todayLocal()}
          onChange={(e) => {
            if (e.target.value) window.location.href = `/qip/checkin?date=${e.target.value}`;
          }}
          className="rounded-xl border border-coral-light px-3 py-1.5 text-sm text-ink focus:border-coral focus:outline-none"
        />
        {!isToday && (
          <Link href="/qip/checkin" className="text-xs text-coral-dark hover:underline">
            Jump to today →
          </Link>
        )}
      </div>

      {saved && (
        <div className={`mt-4 ${successBannerClass}`}>
          <p className="font-semibold">Check-in recorded for {displayDate}.</p>
          {flaggedQAs.length > 0 && (
            <p className="mt-1 text-sm">
              Quality Areas {flaggedQAs.join(", ")} flagged — consider adding improvement items to your{" "}
              <Link href="/qip" className="underline">
                QIP
              </Link>
              .
            </p>
          )}
        </div>
      )}

      {/* Check-in form */}
      <form action={saveQipCheckin} className="mt-6 space-y-4">
        <input type="hidden" name="checkin_date" value={date} />

        {QA_QUESTIONS.map(({ qa, area, question }) => {
          const existing = existingResponseMap.get(qa);
          return (
            <div key={qa} className={cardClass}>
              <div className="px-4 pt-4 pb-2">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-coral-light text-xs font-bold text-coral-dark">
                    {qa}
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/40">
                      QA{qa} — {area}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-ink">{question}</p>
                  </div>
                </div>

                {/* Answer buttons */}
                <div className="mt-3 flex gap-2">
                  {(["yes", "mostly", "no"] as const).map((ans) => {
                    const labels = { yes: "Yes", mostly: "Mostly", no: "No — needs attention" };
                    const isSelected = existing?.answer === ans;
                    return (
                      <label
                        key={ans}
                        className={`flex flex-1 cursor-pointer items-center justify-center rounded-xl border-2 px-2 py-2 text-xs font-semibold transition-colors ${
                          isSelected
                            ? ANSWER_STYLES[ans]
                            : "border-coral-light text-ink/40 hover:border-coral-light hover:bg-coral-light/30"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`qa_${qa}_answer`}
                          value={ans}
                          defaultChecked={isSelected}
                          className="sr-only"
                        />
                        {labels[ans]}
                      </label>
                    );
                  })}
                </div>

                {/* Notes */}
                <textarea
                  name={`qa_${qa}_notes`}
                  rows={1}
                  defaultValue={existing?.notes ?? ""}
                  placeholder="Notes (optional) — what happened, what you observed, what was done…"
                  className="mt-2 w-full resize-none rounded-xl border border-coral-light/60 bg-white/60 px-3 py-1.5 text-xs text-ink placeholder-ink/25 focus:border-coral focus:outline-none focus:bg-white"
                />
              </div>
            </div>
          );
        })}

        {/* Overall notes */}
        <div className={`p-4 ${cardClass}`}>
          <label className="block text-sm font-medium text-ink/70">
            Overall notes for {displayDate} (optional)
          </label>
          <textarea
            name="overall_notes"
            rows={2}
            defaultValue={existing?.overall_notes ?? ""}
            placeholder="Anything else worth noting for the day — staffing changes, visitor, maintenance, special event…"
            className="mt-1 w-full resize-none rounded-xl border border-coral-light bg-white px-3 py-2 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-full bg-coral px-6 py-3 font-semibold text-white hover:bg-coral-dark"
        >
          {alreadySubmitted ? "Update check-in" : "Save check-in"}
        </button>
      </form>

      {/* History */}
      {history && history.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer text-sm font-semibold text-ink/60 hover:text-ink">
            Check-in history ({history.length} days)
          </summary>
          <div className="mt-3 overflow-hidden rounded-2xl border border-coral-light">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-coral-light bg-coral-light/30">
                  <th className="px-3 py-2 text-left font-semibold text-ink/60">Date</th>
                  <th className="px-3 py-2 text-center font-semibold text-ink/60">QA1</th>
                  <th className="px-3 py-2 text-center font-semibold text-ink/60">QA2</th>
                  <th className="px-3 py-2 text-center font-semibold text-ink/60">QA3</th>
                  <th className="px-3 py-2 text-center font-semibold text-ink/60">QA4</th>
                  <th className="px-3 py-2 text-center font-semibold text-ink/60">QA5</th>
                  <th className="px-3 py-2 text-center font-semibold text-ink/60">QA6</th>
                  <th className="px-3 py-2 text-center font-semibold text-ink/60">QA7</th>
                  <th className="px-3 py-2 text-left font-semibold text-ink/60">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coral-light">
                {history.map((row) => {
                  const responses = row.responses as QipCheckinResponse[];
                  const byQa = new Map(responses.map((r) => [r.qa, r]));
                  const flagged = row.flagged_areas as number[];
                  const isCurrentDate = row.checkin_date === date;
                  return (
                    <tr
                      key={row.checkin_date}
                      className={`transition-colors hover:bg-coral-light/20 ${isCurrentDate ? "bg-coral-light/30" : ""}`}
                    >
                      <td className="px-3 py-2 font-medium text-ink">
                        <Link
                          href={`/qip/checkin?date=${row.checkin_date}`}
                          className="hover:underline"
                        >
                          {new Date(row.checkin_date + "T12:00:00").toLocaleDateString("en-AU", {
                            day: "numeric",
                            month: "short",
                          })}
                        </Link>
                      </td>
                      {[1, 2, 3, 4, 5, 6, 7].map((qa) => {
                        const r = byQa.get(qa);
                        const dot =
                          r?.answer === "yes"
                            ? "bg-sage"
                            : r?.answer === "mostly"
                              ? "bg-amber-400"
                              : r?.answer === "no"
                                ? "bg-coral"
                                : "bg-ink/10";
                        const title =
                          r?.answer === "yes"
                            ? "Yes"
                            : r?.answer === "mostly"
                              ? `Mostly${r.notes ? ": " + r.notes : ""}`
                              : r?.answer === "no"
                                ? `Needs attention${r?.notes ? ": " + r.notes : ""}`
                                : "Not answered";
                        return (
                          <td key={qa} className="px-3 py-2 text-center">
                            <span
                              className={`inline-block h-2.5 w-2.5 rounded-full ${dot}`}
                              title={title}
                            />
                          </td>
                        );
                      })}
                      <td className="max-w-[160px] truncate px-3 py-2 text-ink/50">
                        {flagged.length > 0 && (
                          <span className="mr-1 font-semibold text-coral-dark">
                            ⚑ QA{flagged.join(",")}
                          </span>
                        )}
                        {row.overall_notes ?? ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-ink/40">
            Green = Yes · Amber = Mostly · Red = Needs attention. Click a date to view or edit.
          </p>
        </details>
      )}
    </div>
  );
}
