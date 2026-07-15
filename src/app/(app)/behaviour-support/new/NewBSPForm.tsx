"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cardClass } from "@/lib/ui";
import { createBehaviourSupportPlan } from "../actions";

const FREQUENCY_OPTIONS = [
  { value: "rarely", label: "Rarely (less than once a week)" },
  { value: "sometimes", label: "Sometimes (a few times a week)" },
  { value: "daily", label: "Daily" },
  { value: "multiple_daily", label: "Multiple times a day" },
];

interface Child {
  id: string;
  first_name: string;
  current_interests: string | null;
}

export function NewBSPForm({ children }: { children: Child[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [childId, setChildId] = useState(children[0]?.id ?? "");
  const [strengths, setStrengths] = useState("");
  const [interests, setInterests] = useState("");
  const [behaviourDesc, setBehaviourDesc] = useState("");
  const [triggers, setTriggers] = useState("");
  const [frequency, setFrequency] = useState("sometimes");
  const [behaviourFunction, setBehaviourFunction] = useState("");
  const [educatorStrategies, setEducatorStrategies] = useState("");
  const [familyStrategies, setFamilyStrategies] = useState("");
  const [environmentAdjustments, setEnvironmentAdjustments] = useState("");
  const [externalNotes, setExternalNotes] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  function handleChildChange(id: string) {
    setChildId(id);
    const child = children.find((c) => c.id === id);
    if (child?.current_interests && !interests) {
      setInterests(child.current_interests);
    }
  }

  async function handleGenerate() {
    if (!childId || !behaviourDesc.trim()) {
      setGenerateError("Fill in the child and behaviour description first.");
      return;
    }
    setGenerating(true);
    setGenerateError("");
    try {
      const res = await fetch("/api/behaviour-support/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          behaviourDescription: behaviourDesc,
          triggers,
          frequency,
          behaviourFunction,
          childStrengths: strengths,
          childInterests: interests,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Generation failed");
      }
      const data = await res.json();
      if (data.educator_strategies) setEducatorStrategies(data.educator_strategies);
      if (data.family_strategies) setFamilyStrategies(data.family_strategies);
      if (data.environment_adjustments) setEnvironmentAdjustments(data.environment_adjustments);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Generation failed — try again.");
    } finally {
      setGenerating(false);
    }
  }

  function handleSubmit(saveAs: "draft" | "active") {
    const fd = new FormData();
    fd.set("child_id", childId);
    fd.set("status", saveAs);
    fd.set("child_strengths", strengths);
    fd.set("child_interests", interests);
    fd.set("behaviour_description", behaviourDesc);
    fd.set("behaviour_triggers", triggers);
    fd.set("behaviour_frequency", frequency);
    fd.set("behaviour_function", behaviourFunction);
    fd.set("educator_strategies", educatorStrategies);
    fd.set("environment_adjustments", environmentAdjustments);
    fd.set("external_support_notes", externalNotes);
    fd.set("suggested_family_strategies", familyStrategies);
    if (reviewDate) fd.set("review_date", reviewDate);

    startTransition(() => {
      createBehaviourSupportPlan(fd);
    });
  }

  const canGenerate = !!childId && behaviourDesc.trim().length > 10;

  return (
    <div className="mt-6 space-y-6">
      {/* Child */}
      <div className={`${cardClass} px-4 py-4`}>
        <h2 className="font-display text-sm font-semibold text-ink">Child</h2>
        <select
          value={childId}
          onChange={(e) => handleChildChange(e.target.value)}
          className="mt-2 w-full rounded-xl border border-coral-light px-3 py-2.5 text-sm text-ink focus:border-coral focus:outline-none"
        >
          {children.map((c) => (
            <option key={c.id} value={c.id}>
              {c.first_name}
            </option>
          ))}
        </select>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink/40">
              Child&apos;s strengths
            </label>
            <textarea
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              rows={2}
              placeholder="What does this child do well? What are they proud of?"
              className="w-full resize-none rounded-xl border border-coral-light px-3 py-2 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink/40">
              Current interests
            </label>
            <textarea
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              rows={2}
              placeholder="What does this child love? What motivates them?"
              className="w-full resize-none rounded-xl border border-coral-light px-3 py-2 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Behaviour details */}
      <div className={`${cardClass} px-4 py-4`}>
        <h2 className="font-display text-sm font-semibold text-ink">Behaviour details</h2>
        <p className="mt-0.5 text-xs text-ink/50">
          The more detail here, the better the AI-generated strategies will be.
        </p>

        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink/40">
              Describe the behaviour <span className="text-coral">*</span>
            </label>
            <textarea
              value={behaviourDesc}
              onChange={(e) => setBehaviourDesc(e.target.value)}
              required
              rows={3}
              placeholder="What does it look like? What happens? Be specific and objective."
              className="w-full resize-none rounded-xl border border-coral-light px-3 py-2.5 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink/40">
                Known triggers
              </label>
              <textarea
                value={triggers}
                onChange={(e) => setTriggers(e.target.value)}
                rows={2}
                placeholder="What tends to set it off? Times of day, transitions, specific peers?"
                className="w-full resize-none rounded-xl border border-coral-light px-3 py-2 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink/40">
                Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full rounded-xl border border-coral-light px-3 py-2.5 text-sm text-ink focus:border-coral focus:outline-none"
              >
                {FREQUENCY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink/40">
              Hypothesised function
            </label>
            <textarea
              value={behaviourFunction}
              onChange={(e) => setBehaviourFunction(e.target.value)}
              rows={2}
              placeholder="What need might this behaviour be meeting? (e.g. seeking attention, avoiding a task, sensory need, communication difficulty)"
              className="w-full resize-none rounded-xl border border-coral-light px-3 py-2 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* AI generation + strategies */}
      <div className={`${cardClass} px-4 py-4`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-sm font-semibold text-ink">Strategies</h2>
            <p className="mt-0.5 text-xs text-ink/50">
              Generate AI-suggested strategies then edit before saving.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !canGenerate}
            className="shrink-0 rounded-xl bg-sage px-4 py-2 text-sm font-semibold text-white hover:bg-sage-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? "Generating…" : "✨ Generate strategies"}
          </button>
        </div>
        {generateError && (
          <p className="mt-2 text-xs text-coral-dark">{generateError}</p>
        )}
        {!canGenerate && (
          <p className="mt-1 text-xs text-ink/30">
            Complete the behaviour description above to enable generation.
          </p>
        )}

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink/40">
              Educator strategies — what we will do at the service
            </label>
            <textarea
              value={educatorStrategies}
              onChange={(e) => setEducatorStrategies(e.target.value)}
              rows={5}
              placeholder="Strategies will appear here after generation, or type them manually."
              className="w-full resize-none rounded-xl border border-coral-light px-3 py-2.5 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink/40">
              Suggested family strategies{" "}
              <span className="font-normal normal-case text-ink/40">
                (shared with parents — they can add their own)
              </span>
            </label>
            <textarea
              value={familyStrategies}
              onChange={(e) => setFamilyStrategies(e.target.value)}
              rows={4}
              placeholder="Strategies families can try at home for consistency."
              className="w-full resize-none rounded-xl border border-coral-light px-3 py-2.5 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink/40">
              Environment adjustments
            </label>
            <textarea
              value={environmentAdjustments}
              onChange={(e) => setEnvironmentAdjustments(e.target.value)}
              rows={3}
              placeholder="Physical or social environment changes that may help."
              className="w-full resize-none rounded-xl border border-coral-light px-3 py-2.5 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* External supports */}
      <div className={`${cardClass} px-4 py-4`}>
        <h2 className="font-display text-sm font-semibold text-ink">
          External support professionals
        </h2>
        <p className="mt-0.5 text-xs text-ink/50">
          Recommendations from speech pathologists, OTs, NDIS providers, inclusion support, etc.
        </p>
        <textarea
          value={externalNotes}
          onChange={(e) => setExternalNotes(e.target.value)}
          rows={3}
          placeholder="e.g. Speech pathologist recommends visual cues before transitions. NDIS plan includes fortnightly OT visits — strategies aligned with sensory diet."
          className="mt-2 w-full resize-none rounded-xl border border-coral-light px-3 py-2.5 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none"
        />
      </div>

      {/* Review date + save */}
      <div className={`${cardClass} px-4 py-4`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink/40">
              Review date
            </label>
            <input
              type="date"
              value={reviewDate}
              onChange={(e) => setReviewDate(e.target.value)}
              className="rounded-xl border border-coral-light px-3 py-2 text-sm text-ink focus:border-coral focus:outline-none"
            />
            <p className="mt-1 text-xs text-ink/40">Recommended: 4–6 weeks from today</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleSubmit("draft")}
              className="rounded-xl border border-coral-light px-4 py-2 text-sm font-semibold text-ink/60 hover:bg-coral-light/20"
            >
              Save as draft
            </button>
            <button
              type="button"
              onClick={() => handleSubmit("active")}
              disabled={!behaviourDesc.trim() || !educatorStrategies.trim()}
              className="rounded-xl bg-coral px-4 py-2 text-sm font-semibold text-white hover:bg-coral-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              Activate plan →
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-ink/40">
          Activating makes the plan visible in the parent portal. Parents can add their home
          strategies and acknowledge the plan.
        </p>
      </div>
    </div>
  );
}
