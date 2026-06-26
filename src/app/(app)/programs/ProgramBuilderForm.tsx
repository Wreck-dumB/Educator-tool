"use client";

import { useState } from "react";
import type { ProgramSuggestion } from "@/lib/types/domain";
import { inputClass, primaryButtonClass, secondaryButtonClass, errorBannerClass } from "@/lib/ui";
import { saveProgram } from "./actions";

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function ProgramBuilderForm() {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(todayPlus(0));
  const [endDate, setEndDate] = useState(todayPlus(6));
  const [educatorNotes, setEducatorNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProgramSuggestion | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setDraft(null);
    setSavedId(null);
    try {
      const res = await fetch("/api/program", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate, educatorNotes: educatorNotes || undefined }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Something went wrong");
      else setDraft(data);
    } catch {
      setError("Could not reach the server");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    const result = await saveProgram(
      title.trim() || `Program ${startDate} to ${endDate}`,
      startDate,
      endDate,
      draft.culturalDays,
      draft.entries,
    );
    if ("error" in result) {
      setError(result.error);
    } else {
      setSavedId(result.id);
      setDraft(null);
    }
    setSaving(false);
  }

  const entriesByDay = draft
    ? draft.entries.reduce<Record<string, typeof draft.entries>>((acc, e) => {
        (acc[e.dayDate] ??= []).push(e);
        return acc;
      }, {})
    : {};

  return (
    <div className="rounded-2xl border border-coral-light bg-white p-5 shadow-sm">
      <div>
        <label htmlFor="program_title" className="block text-sm font-medium text-ink/70">
          Program title (optional)
        </label>
        <input
          id="program_title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Week of June 30"
          className={inputClass}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="start_date" className="block text-sm font-medium text-ink/70">
            Start date
          </label>
          <input
            id="start_date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="end_date" className="block text-sm font-medium text-ink/70">
            End date
          </label>
          <input
            id="end_date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="mt-3">
        <label htmlFor="educator_notes" className="block text-sm font-medium text-ink/70">
          Anything specific to guide this program? (optional)
        </label>
        <textarea
          id="educator_notes"
          rows={2}
          value={educatorNotes}
          onChange={(e) => setEducatorNotes(e.target.value)}
          placeholder="e.g. focus on outdoor play this week, we have a new enrolment settling in"
          className={inputClass}
        />
      </div>

      {error && <p className={errorBannerClass}>{error}</p>}
      {savedId && <p className="mt-3 text-sm font-medium text-sage-dark">Saved — view it in the list below.</p>}

      {!draft && (
        <button type="button" onClick={handleGenerate} disabled={loading} className={`mt-4 ${primaryButtonClass}`}>
          {loading ? "Drafting…" : "Draft program"}
        </button>
      )}

      {draft && (
        <div className="mt-4">
          {draft.culturalDays.length > 0 && (
            <div className="mb-4 rounded-xl bg-amber-light p-3">
              <p className="text-sm font-medium text-amber-dark">Cultural &amp; national days in range</p>
              <ul className="mt-1 space-y-1 text-sm text-amber-dark/90">
                {draft.culturalDays.map((d, idx) => (
                  <li key={idx}>
                    <span className="font-medium">{d.date}:</span> {d.name} ({d.origin})
                    {d.confidence === "approximate" && (
                      <span className="ml-1 text-xs italic">— verify exact date, this shifts yearly</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-3">
            {Object.entries(entriesByDay).map(([day, entries]) => (
              <div key={day} className="rounded-xl bg-cream-dark/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                  {new Date(day).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                </p>
                {entries.map((e, idx) => (
                  <div key={idx} className="mt-2">
                    <p className="text-sm font-medium text-ink">
                      {e.title}
                      {e.activityId && (
                        <span className="ml-2 rounded-full bg-sage-light px-2 py-0.5 text-xs font-medium text-sage-dark">
                          📌 From your library
                        </span>
                      )}
                    </p>
                    {e.notes && <p className="mt-0.5 text-sm text-ink/70">{e.notes}</p>}
                    {e.eylfCodes.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {e.eylfCodes.map((code) => (
                          <span key={code} className="rounded-full bg-sage-light px-2 py-0.5 text-xs font-medium text-sage-dark">
                            {code}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-3">
            <button type="button" onClick={handleSave} disabled={saving} className={primaryButtonClass}>
              {saving ? "Saving…" : "Save program"}
            </button>
            <button type="button" onClick={() => setDraft(null)} className={secondaryButtonClass}>
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
