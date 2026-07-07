"use client";

import { useState } from "react";
import Link from "next/link";
import type { ChildProfile } from "@/lib/types/domain";
import type { ActivitySuggestion } from "@/lib/types/domain";
import { getMaterialIcon, getEnergyIcon, getGroupIcon, getEnergyBadgeClass } from "@/lib/icons";
import { saveActivity } from "@/app/(app)/generate/save";

interface PersonalisedResult extends ActivitySuggestion {
  adaptationNotes: string[];
  childName: string | null;
}

interface Props {
  activityId: string;
  children: ChildProfile[];
}

export default function PersonalisePanel({ activityId, children }: Props) {
  const [open, setOpen] = useState(false);

  // Form state
  const [childId, setChildId] = useState("");
  const [childName, setChildName] = useState("");
  const [additionalNeeds, setAdditionalNeeds] = useState("");
  const [interests, setInterests] = useState("");

  // Result state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PersonalisedResult | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedId, setSavedId] = useState<string | null>(null);

  function selectChild(id: string) {
    setChildId(id);
    const child = children.find((c) => c.id === id);
    if (child) {
      setChildName(child.first_name);
      setAdditionalNeeds(child.additional_needs ?? "");
      setInterests(child.current_interests ?? "");
    }
  }

  function reset() {
    setResult(null);
    setSaveState("idle");
    setSavedId(null);
    setError(null);
  }

  async function handlePersonalise() {
    setLoading(true);
    setError(null);
    setResult(null);
    setSaveState("idle");

    try {
      const res = await fetch("/api/personalise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityId,
          childId: childId || undefined,
          childName: childName.trim() || undefined,
          additionalNeeds: additionalNeeds.trim() || undefined,
          interests: interests.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
      } else {
        setResult(data);
      }
    } catch {
      setError("Could not reach the server");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!result) return;
    setSaveState("saving");
    const saved = await saveActivity(result, "interest");
    if ("error" in saved) {
      setSaveState("error");
    } else {
      setSaveState("saved");
      setSavedId(saved.id);
    }
  }

  const inputClass =
    "mt-1 block w-full rounded-xl border border-coral-light bg-white px-3 py-2 text-sm shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 flex items-center gap-2 rounded-full border border-coral-light px-4 py-2 text-sm font-medium text-coral-dark transition-colors hover:bg-coral-light"
      >
        🎯 Personalise for a child
      </button>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-coral-light bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-coral-light px-5 py-3">
        <h2 className="font-display text-base font-semibold text-coral-dark">
          🎯 Personalise for a child
        </h2>
        <button
          type="button"
          onClick={() => { setOpen(false); reset(); }}
          className="text-sm text-ink/40 hover:text-ink"
        >
          Close
        </button>
      </div>

      <div className="p-5">
        {!result ? (
          /* ── Input form ─────────────────────────────────────────── */
          <div className="space-y-4">
            {children.length > 0 && (
              <div>
                <label htmlFor="ps-child" className="block text-sm font-medium text-ink/70">
                  Focus child <span className="text-ink/40">(optional — fills in name & context below)</span>
                </label>
                <select
                  id="ps-child"
                  value={childId}
                  onChange={(e) => selectChild(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select a child…</option>
                  {children.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="ps-name" className="block text-sm font-medium text-ink/70">
                Child&apos;s name
              </label>
              <input
                id="ps-name"
                type="text"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                placeholder="e.g. Mia"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="ps-needs" className="block text-sm font-medium text-ink/70">
                Needs / context to accommodate
              </label>
              <textarea
                id="ps-needs"
                rows={3}
                value={additionalNeeds}
                onChange={(e) => setAdditionalNeeds(e.target.value)}
                placeholder="e.g. uses a wheelchair, sensory sensitivity to loud noise, still developing pincer grasp, English as a second language"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-ink/40">
                Any physical, sensory, developmental, language, or family context that should shape how the steps are adapted.
              </p>
            </div>

            <div>
              <label htmlFor="ps-interests" className="block text-sm font-medium text-ink/70">
                Current interests <span className="text-ink/40">(optional)</span>
              </label>
              <input
                id="ps-interests"
                type="text"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder="e.g. dinosaurs, superheroes, trains"
                className={inputClass}
              />
            </div>

            {error && (
              <p className="rounded-xl bg-coral-light px-3 py-2 text-sm text-coral-dark">{error}</p>
            )}

            <button
              type="button"
              onClick={handlePersonalise}
              disabled={loading || (!childId && !childName.trim() && !additionalNeeds.trim())}
              className="w-full rounded-full bg-coral py-2.5 text-sm font-semibold text-white transition-colors hover:bg-coral-dark disabled:opacity-50"
            >
              {loading ? "Personalising…" : "Personalise this activity →"}
            </button>
            <p className="text-center text-xs text-ink/40">
              Enter a name, needs, or select a child profile above to enable.
            </p>
          </div>
        ) : (
          /* ── Result ─────────────────────────────────────────────── */
          <div>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold text-ink">{result.title}</h3>
                {result.childName && (
                  <p className="text-sm text-ink/50">Adapted for {result.childName}</p>
                )}
              </div>
              <button
                type="button"
                onClick={reset}
                className="shrink-0 rounded-full border border-coral-light px-3 py-1 text-xs font-medium text-coral-dark hover:bg-coral-light"
              >
                Try again
              </button>
            </div>

            {/* Adaptation notes — most important part */}
            {result.adaptationNotes.length > 0 && (
              <div className="mb-4 rounded-xl bg-sage-light p-4">
                <p className="text-sm font-semibold text-sage-dark">What was adapted</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-sage-dark/90">
                  {result.adaptationNotes.map((note, i) => (
                    <li key={i}>{note}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-sm text-ink/70">{result.summary}</p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {result.energyLevel && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${getEnergyBadgeClass(result.energyLevel)}`}>
                  {getEnergyIcon(result.energyLevel)} {result.energyLevel} energy
                </span>
              )}
              {result.groupSizeFit && (
                <span className="inline-flex items-center gap-1 rounded-full bg-cream-dark px-2.5 py-1 text-xs font-medium text-ink/70">
                  {getGroupIcon(result.groupSizeFit)} {result.groupSizeFit.replace("_", " ")}
                </span>
              )}
              {result.durationMinutes && <span className="text-xs text-ink/50">{result.durationMinutes} min</span>}
            </div>

            {result.steps.length > 0 && (
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-ink/80">
                {result.steps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            )}

            {result.materialsUsed.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink/70">
                <span className="font-medium">Materials:</span>
                {result.materialsUsed.map((m, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1">
                    <span aria-hidden>{getMaterialIcon(m)}</span>
                    {m}
                  </span>
                ))}
              </div>
            )}

            {result.reflectionPrompts.length > 0 && (
              <div className="mt-3 rounded-xl bg-amber-light p-3">
                <p className="text-sm font-medium text-amber-dark">Reflection prompts</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-amber-dark/90">
                  {result.reflectionPrompts.map((p, idx) => (
                    <li key={idx}>{p}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.eylfCodes.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {result.eylfCodes.map((code) => (
                  <span key={code} className="rounded-full bg-sage-light px-2 py-0.5 text-xs font-medium text-sage-dark">
                    EYLF {code}
                  </span>
                ))}
              </div>
            )}

            {/* Print activity sheet — always available */}
            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams({ title: result.title });
                if (result.childName) params.set("name", result.childName);
                if (result.suggestedTemplate === "name_trace") {
                  params.set("type", "name_trace");
                } else {
                  params.set("type", "activity_sheet");
                  result.materialsUsed.slice(0, 8).forEach((m) => params.append("material", m));
                }
                window.open(`/worksheet?${params.toString()}`, "_blank");
              }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-coral-light px-4 py-2 text-sm font-medium text-coral-dark hover:bg-coral-light"
            >
              🖨 Print activity sheet{result.childName ? ` for ${result.childName}` : ""}
            </button>

            {/* Save */}
            <div className="mt-4 border-t border-coral-light pt-4">
              {saveState === "saved" && savedId ? (
                <Link href={`/activities/${savedId}`} className="text-sm font-medium text-sage-dark hover:underline">
                  Saved — view personalised activity
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saveState === "saving"}
                  className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink/80 disabled:opacity-50"
                >
                  {saveState === "saving" ? "Saving…" : "Save as new activity"}
                </button>
              )}
              {saveState === "error" && (
                <span className="ml-2 text-sm text-coral-dark">Could not save — try again.</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
