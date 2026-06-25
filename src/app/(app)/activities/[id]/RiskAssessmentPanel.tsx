"use client";

import { useState } from "react";
import Link from "next/link";
import type { RiskAssessmentSuggestion } from "@/lib/types/domain";
import { primaryButtonClass, secondaryButtonClass, errorBannerClass } from "@/lib/ui";
import { saveRiskAssessment, markRiskAssessmentReviewed } from "./saveRiskAssessment";
import HazardTable from "@/components/HazardTable";

interface SavedAssessment {
  id: string;
  context_notes: string | null;
  hazards: RiskAssessmentSuggestion["hazards"];
  involves_excursion: boolean;
  involves_sleep_rest: boolean;
  involves_water: boolean;
  reviewed_at: string | null;
}

export default function RiskAssessmentPanel({
  activityId,
  activityTitle,
  savedAssessments,
}: {
  activityId: string;
  activityTitle: string;
  savedAssessments: SavedAssessment[];
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<RiskAssessmentSuggestion | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setDraft(null);
    setSaved(false);
    try {
      const res = await fetch("/api/risk-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
      } else {
        setDraft(data);
      }
    } catch {
      setError("Could not reach the server");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    const result = await saveRiskAssessment(activityId, activityTitle, draft);
    if ("error" in result) {
      setError(result.error);
    } else {
      setSaved(true);
      setDraft(null);
    }
    setSaving(false);
  }

  return (
    <div className="mt-6 rounded-2xl border border-coral-light bg-white p-5 shadow-sm">
      <h2 className="font-display text-sm font-semibold text-ink">Baseline risk assessment</h2>
      <p className="mt-1 text-xs text-ink/50">
        Drafted from this activity&apos;s materials and steps using standard Australian WHS
        risk-management practice. This is a <strong>starting point</strong> — review it, adjust for
        your own service/environment, and have it checked by your nominated supervisor or
        educational leader before relying on it. It does not replace the separate risk assessments
        the National Regulations require for excursions, sleep &amp; rest, or emergencies.
      </p>

      {error && <p className={errorBannerClass}>{error}</p>}

      {!draft && (
        <button type="button" onClick={handleGenerate} disabled={loading} className={`mt-4 ${primaryButtonClass}`}>
          {loading ? "Generating…" : "Generate baseline risk assessment"}
        </button>
      )}

      {draft && (
        <div className="mt-4">
          <RegulatoryFlags draft={draft} />
          <HazardTable hazards={draft.hazards} />
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={handleSave} disabled={saving} className={primaryButtonClass}>
              {saving ? "Saving…" : "Save risk assessment"}
            </button>
            <button type="button" onClick={() => setDraft(null)} className={secondaryButtonClass}>
              Discard
            </button>
          </div>
        </div>
      )}

      {saved && <p className="mt-3 text-sm font-medium text-sage-dark">Saved below.</p>}

      {savedAssessments.length > 0 && (
        <div className="mt-6 space-y-4 border-t border-coral-light pt-4">
          {savedAssessments.map((a) => (
            <div key={a.id} className="rounded-xl border border-coral-light/60 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-ink">
                  {a.reviewed_at ? (
                    <span className="text-sage-dark">✓ Reviewed {new Date(a.reviewed_at).toLocaleDateString()}</span>
                  ) : (
                    <span className="text-amber-dark">Unreviewed draft</span>
                  )}
                </p>
                <div className="flex items-center gap-3">
                  <Link href={`/risk-assessments/${a.id}`} className="text-xs font-medium text-coral-dark hover:underline">
                    View / Print
                  </Link>
                  {!a.reviewed_at && (
                    <button
                      type="button"
                      onClick={() => markRiskAssessmentReviewed(a.id, activityId)}
                      className="text-xs font-medium text-sage-dark hover:underline"
                    >
                      Mark as reviewed
                    </button>
                  )}
                </div>
              </div>
              <RegulatoryFlags
                draft={{
                  involvesExcursion: a.involves_excursion,
                  involvesSleepRest: a.involves_sleep_rest,
                  involvesWater: a.involves_water,
                  contextNotes: a.context_notes,
                  hazards: a.hazards,
                }}
              />
              <HazardTable hazards={a.hazards} />
            </div>
          ))}
        </div>
      )}

      {savedAssessments.length === 0 && (
        <p className="mt-2 text-xs text-ink/40">
          View all saved risk assessments in the <Link href="/risk-assessments" className="underline">risk assessment library</Link>.
        </p>
      )}
    </div>
  );
}

function RegulatoryFlags({ draft }: { draft: RiskAssessmentSuggestion }) {
  const flags: string[] = [];
  if (draft.involvesExcursion) flags.push("Leaves the premises — needs its own excursion risk assessment (Regs 100-103)");
  if (draft.involvesSleepRest) flags.push("Involves sleep/rest — needs the separate sleep & rest risk assessment");
  if (draft.involvesWater) flags.push("Involves water — review water-safety supervision separately");
  if (flags.length === 0) return null;
  return (
    <div className="mb-3 rounded-xl bg-amber-light p-3 text-xs text-amber-dark">
      <ul className="list-disc space-y-0.5 pl-4">
        {flags.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
    </div>
  );
}
