"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveActivity } from "@/app/(app)/generate/save";
import type { RawActivitySuggestion } from "@/lib/anthropic";

interface Props {
  observationId: string;
  observationNote: string;
  childName: string;
  childInterests?: string | null;
  eylfCodes?: string[];
  activityTitle?: string | null;
}

type State = "idle" | "loading" | "done" | "saving" | "saved";

export default function FollowUpPanel({
  observationNote,
  childName,
  childInterests,
  eylfCodes = [],
  activityTitle,
}: Props) {
  const [state, setState] = useState<State>("idle");
  const [suggestion, setSuggestion] = useState<RawActivitySuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function handleGenerate() {
    setState("loading");
    setError(null);
    try {
      const res = await fetch("/api/follow-up-activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          observationNote,
          childName,
          childInterests,
          eylfCodes,
          previousActivityTitle: activityTitle,
        }),
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

  if (state === "idle" || state === "loading") {
    return (
      <div className="mt-3">
        {error && <p className="mb-2 text-xs text-coral-dark">{error}</p>}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={state === "loading"}
          className="flex items-center gap-1.5 rounded-full border border-sage-light bg-sage-light px-3 py-1.5 text-xs font-semibold text-sage-dark hover:bg-sage-light/70"
        >
          {state === "loading" ? (
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-sage border-t-transparent" />
          ) : (
            <span aria-hidden>✨</span>
          )}
          {state === "loading" ? "Planning follow-up…" : "Plan follow-up activity"}
        </button>
      </div>
    );
  }

  if ((state === "done" || state === "saving") && suggestion) {
    return (
      <div className="mt-3 rounded-xl border border-sage-light bg-sage-light/40 p-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-sage-dark/60">
          Suggested follow-up
        </p>
        <p className="font-display font-semibold text-ink">{suggestion.title}</p>
        <p className="mt-1 text-sm text-ink/70">{suggestion.summary}</p>
        {suggestion.eylf_codes?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {suggestion.eylf_codes.map((code) => (
              <span key={code} className="rounded-full bg-sage-light px-2 py-0.5 text-xs font-medium text-sage-dark">
                EYLF {code}
              </span>
            ))}
          </div>
        )}
        {error && <p className="mt-2 text-xs text-coral-dark">{error}</p>}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={state === "saving"}
            className="rounded-full bg-sage px-4 py-1.5 text-xs font-semibold text-white hover:bg-sage-dark"
          >
            {state === "saving" ? "Saving…" : "Save to library"}
          </button>
          <button
            type="button"
            onClick={() => { setSuggestion(null); setState("idle"); }}
            className="rounded-full border border-ink/20 px-3 py-1.5 text-xs text-ink/50 hover:text-ink/70"
          >
            Discard
          </button>
        </div>
      </div>
    );
  }

  if (state === "saved" && savedId) {
    return (
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs font-medium text-sage-dark">Saved to activity library</span>
        <a
          href={`/activities/${savedId}`}
          className="text-xs font-semibold text-sage-dark underline"
        >
          View →
        </a>
      </div>
    );
  }

  return null;
}
