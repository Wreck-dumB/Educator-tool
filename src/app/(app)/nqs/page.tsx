import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMyStaffRole } from "@/lib/supabase/staff";
import { getOrCreateNqsAssessment, getNqsStandardRatings } from "@/lib/supabase/nqsAssessments";
import { getNqsStandards } from "@/lib/supabase/qip";
import { cardClass, inputClass } from "@/lib/ui";
import NqsStandardCard from "./NqsStandardCard";
import { updateAssessmentNotes } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "NQS Self-Assessment · SparkPlay" };

const QA_DESCRIPTIONS: Record<number, string> = {
  1: "Educational program and practice",
  2: "Children's health and safety",
  3: "Physical environment",
  4: "Staffing arrangements",
  5: "Relationships with children",
  6: "Collaborative partnerships with families and communities",
  7: "Governance and leadership",
};

export default async function NqsSelfAssessmentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const myRole = await getMyStaffRole();
  const canEdit = myRole === "director" || myRole === "2ic";

  const [assessment, standards] = await Promise.all([
    getOrCreateNqsAssessment(),
    getNqsStandards(),
  ]);

  if (!assessment) redirect("/dashboard");

  const ratings = await getNqsStandardRatings(assessment.id);
  const ratingByCode = Object.fromEntries(ratings.map((r) => [r.standard_code, r]));

  const byQA = standards.reduce<Record<number, typeof standards>>(
    (acc, s) => { (acc[s.quality_area_number] ??= []).push(s); return acc; },
    {},
  );

  const ratingCounts = { working_towards: 0, meeting: 0, exceeding: 0, unrated: 0 };
  for (const s of standards) {
    const r = ratingByCode[s.code]?.rating;
    if (r) ratingCounts[r]++;
    else ratingCounts.unrated++;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">NQS Self-Assessment</h1>
        <p className="mt-1 text-sm text-ink/50">
          Rate your service against each NQS Standard. Ratings are saved automatically.
          {" "}
          <Link href="/qip" className="text-coral-dark hover:underline">
            View your QIP →
          </Link>
        </p>
        {!canEdit && (
          <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            You have view access only. Only Directors and 2ICs can rate standards.
          </p>
        )}
      </div>

      {/* Summary counts */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Unrated", count: ratingCounts.unrated, cls: "bg-ink/5 text-ink/50" },
          { label: "Working Towards", count: ratingCounts.working_towards, cls: "bg-amber-50 text-amber-700" },
          { label: "Meeting", count: ratingCounts.meeting, cls: "bg-blue-50 text-blue-700" },
          { label: "Exceeding", count: ratingCounts.exceeding, cls: "bg-sage-light text-sage-dark" },
        ].map((item) => (
          <div key={item.label} className={`rounded-xl p-3 text-center ${item.cls}`}>
            <p className="text-2xl font-bold">{item.count}</p>
            <p className="text-xs font-medium">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Overall notes */}
      <div className={cardClass + " p-5"}>
        <h2 className="font-display text-base font-semibold text-ink mb-3">
          Assessment notes — {assessment.period_label}
        </h2>
        <form action={updateAssessmentNotes}>
          <input type="hidden" name="assessment_id" value={assessment.id} />
          <textarea
            name="notes"
            rows={3}
            defaultValue={assessment.notes ?? ""}
            placeholder="Overall notes, context, or improvement priorities for this assessment period…"
            className={inputClass + " resize-none text-sm"}
            readOnly={!canEdit}
          />
          {canEdit && (
            <button
              type="submit"
              className="mt-2 text-sm font-medium text-coral-dark hover:underline"
            >
              Save notes
            </button>
          )}
        </form>
      </div>

      {/* Standards by quality area */}
      {Object.entries(byQA).map(([qaNum, qaStandards]) => {
        const qa = parseInt(qaNum);
        const qaRated = qaStandards.filter((s) => ratingByCode[s.code]).length;
        return (
          <div key={qa} className={cardClass + " p-5"}>
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="font-display text-base font-semibold text-ink">
                Quality Area {qa}: {QA_DESCRIPTIONS[qa] ?? ""}
              </h2>
              <span className="text-xs text-ink/40">
                {qaRated}/{qaStandards.length} rated
              </span>
            </div>
            <div className="space-y-3">
              {qaStandards.map((s) => {
                const existing = ratingByCode[s.code];
                return (
                  <NqsStandardCard
                    key={s.code}
                    assessmentId={assessment.id}
                    code={s.code}
                    title={s.standard_title}
                    text={s.standard_text}
                    currentRating={existing?.rating ?? null}
                    evidenceNotes={existing?.evidence_notes ?? null}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      <p className="text-xs text-ink/30 pb-4">
        NQS structure: 7 Quality Areas, 15 Standards (current NQS, effective 1 Feb 2018 revision).
        Ratings are not submitted to ACECQA — this is a working document to support your QIP.
      </p>
    </div>
  );
}
