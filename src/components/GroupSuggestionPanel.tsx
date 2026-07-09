"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveActivity } from "@/app/(app)/generate/save";
import type { RawActivitySuggestion } from "@/lib/anthropic";
import { markFollowUpDone } from "@/app/(app)/follow-ups/actions";

export interface FollowUpForGroup {
  id: string;
  childName: string;
  note: string;
}

interface Props {
  followUps: FollowUpForGroup[];
}

type State = "idle" | "loading" | "done" | "saving" | "saved";

export default function GroupSuggestionPanel({ followUps }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [state, setState] = useState<State>("idle");
  const [suggestion, setSuggestion] = useState<RawActivitySuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSuggest() {
    const notes = followUps
      .filter((f) => selected.has(f.id))
      .map((f) => f.note);

    if (notes.length < 2) {
      setError("Select at least 2 follow-ups to suggest a group activity.");
      return;
    }

    setState("loading");
    setError(null);

    try {
      const res = await fetch("/api/group-activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followUpNotes: notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setSuggestion(data as RawActivitySuggestion);
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setState("idle");
    }
  }

  function handleSave() {
    if (!suggestion) return;
    setState("saving");
    startTransition(async () => {
      const result = await saveActivity(
        {
          title: suggestion.title,
          summary: suggestion.summary,
          steps: suggestion.steps,
          materialsUsed: suggestion.materials_used,
          reflectionPrompts: suggestion.reflection_prompts,
          ageRange: suggestion.age_range ?? null,
          durationMinutes: suggestion.duration_minutes ?? null,
          energyLevel: suggestion.energy_level ?? null,
          groupSizeFit: suggestion.group_size_fit ?? null,
          eylfCodes: suggestion.eylf_codes ?? [],
          suggestedTemplate: suggestion.suggested_template ?? null,
        },
        "interest",
      );
      if ("error" in result) {
        setError(result.error);
        setState("done");
      } else {
        setSavedId(result.id);
        setState("saved");
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-3xl border border-coral-light bg-white p-5 shadow-sm">
      <h2 className="font-display text-base font-semibold text-ink">Suggest a group activity</h2>
      <p className="mt-0.5 text-sm text-ink/60">
        Select follow-ups from different children — the AI will suggest one activity that covers them all.
      </p>

      {/* Follow-up selector */}
      {(state === "idle" || state === "loading") && (
        <div className="mt-4 space-y-2">
          {followUps.map((f) => (
            <label
              key={f.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                selected.has(f.id)
                  ? "border-coral bg-coral-light/30"
                  : "border-coral-light hover:border-coral/40"
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(f.id)}
                onChange={() => toggle(f.id)}
                className="mt-0.5 h-4 w-4 rounded accent-coral"
              />
              <div className="min-w-0">
                <span className="text-xs font-semibold text-coral-dark">{f.childName}</span>
                <p className="mt-0.5 text-sm text-ink/80">{f.note}</p>
              </div>
            </label>
          ))}

          {error && <p className="text-xs text-coral-dark">{error}</p>}

          <button
            type="button"
            onClick={handleSuggest}
            disabled={selected.size < 2 || state === "loading"}
            className="mt-2 flex items-center gap-2 rounded-full bg-coral px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-coral-dark disabled:opacity-40"
          >
            {state === "loading" ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Finding connections…
              </>
            ) : (
              <>
                <span aria-hidden>✨</span>
                Suggest group activity ({selected.size} selected)
              </>
            )}
          </button>
        </div>
      )}

      {/* Suggestion result */}
      {(state === "done" || state === "saving") && suggestion && (
        <div className="mt-4">
          <div className="rounded-2xl border border-sage-light bg-sage-light/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-dark/60">
              Suggested group activity
            </p>
            <p className="mt-1 font-display text-base font-semibold text-ink">{suggestion.title}</p>
            <p className="mt-1 text-sm text-ink/70">{suggestion.summary}</p>

            {suggestion.eylf_codes?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {suggestion.eylf_codes.map((code) => (
                  <span
                    key={code}
                    className="rounded-full bg-sage-light px-2 py-0.5 text-xs font-medium text-sage-dark"
                  >
                    EYLF {code}
                  </span>
                ))}
              </div>
            )}

            {suggestion.steps?.length > 0 && (
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-ink/70">
                {suggestion.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            )}

            {suggestion.materials_used?.length > 0 && (
              <p className="mt-2 text-xs text-ink/50">
                Materials: {suggestion.materials_used.join(", ")}
              </p>
            )}
          </div>

          {error && <p className="mt-2 text-xs text-coral-dark">{error}</p>}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={state === "saving"}
              className="rounded-full bg-sage px-4 py-2 text-sm font-semibold text-white hover:bg-sage-dark disabled:opacity-50"
            >
              {state === "saving" ? "Saving…" : "Save to activity library"}
            </button>
            <button
              type="button"
              onClick={() => { setSuggestion(null); setState("idle"); setSelected(new Set()); }}
              className="rounded-full border border-ink/20 px-3 py-2 text-sm text-ink/50 hover:text-ink/70"
            >
              Try different selection
            </button>
          </div>
        </div>
      )}

      {/* Saved */}
      {state === "saved" && savedId && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-sage-dark">Activity saved to library</span>
            <a href={`/activities/${savedId}`} className="text-sm font-semibold text-sage-dark underline">
              View →
            </a>
          </div>
          <p className="text-xs text-ink/50">
            Mark the follow-ups as done once you&apos;ve run this activity:
          </p>
          <div className="space-y-1">
            {followUps
              .filter((f) => selected.has(f.id))
              .map((f) => (
                <form key={f.id} action={markFollowUpDone} className="inline-block mr-2">
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="return_to" value="/follow-ups" />
                  <button
                    type="submit"
                    className="rounded-full border border-sage-light px-3 py-1 text-xs font-medium text-sage-dark hover:bg-sage-light"
                  >
                    ✓ Done — {f.childName}
                  </button>
                </form>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
