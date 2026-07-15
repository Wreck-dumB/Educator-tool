"use client";

import { useState, useTransition } from "react";
import { cardClass } from "@/lib/ui";
import { updateBehaviourSupportPlan } from "../actions";
import type { BehaviourSupportPlan } from "@/lib/supabase/behaviour-support";

const FREQUENCY_OPTIONS = [
  { value: "rarely", label: "Rarely (less than once a week)" },
  { value: "sometimes", label: "Sometimes (a few times a week)" },
  { value: "daily", label: "Daily" },
  { value: "multiple_daily", label: "Multiple times a day" },
];

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active — visible to parents" },
  { value: "under_review", label: "Under Review" },
  { value: "archived", label: "Archived" },
];

export function BSPEditForm({
  plan,
  childName,
}: {
  plan: BehaviourSupportPlan;
  childName: string;
}) {
  const [, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  const [status, setStatus] = useState(plan.status);
  const [strengths, setStrengths] = useState(plan.child_strengths);
  const [interests, setInterests] = useState(plan.child_interests);
  const [behaviourDesc, setBehaviourDesc] = useState(plan.behaviour_description);
  const [triggers, setTriggers] = useState(plan.behaviour_triggers);
  const [frequency, setFrequency] = useState(plan.behaviour_frequency);
  const [behaviourFunction, setBehaviourFunction] = useState(plan.behaviour_function);
  const [educatorStrategies, setEducatorStrategies] = useState(plan.educator_strategies);
  const [familyStrategies, setFamilyStrategies] = useState(plan.suggested_family_strategies);
  const [environmentAdjustments, setEnvironmentAdjustments] = useState(
    plan.environment_adjustments,
  );
  const [externalNotes, setExternalNotes] = useState(plan.external_support_notes);
  const [reviewDate, setReviewDate] = useState(plan.review_date ?? "");
  const [reviewNotes, setReviewNotes] = useState(plan.review_notes ?? "");

  async function handleRegenerate() {
    setGenerating(true);
    setGenerateError("");
    try {
      const res = await fetch("/api/behaviour-support/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: plan.child_id,
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

  function handleSave() {
    const fd = new FormData();
    fd.set("id", plan.id);
    fd.set("status", status);
    fd.set("child_strengths", strengths);
    fd.set("child_interests", interests);
    fd.set("behaviour_description", behaviourDesc);
    fd.set("behaviour_triggers", triggers);
    fd.set("behaviour_frequency", frequency);
    fd.set("behaviour_function", behaviourFunction);
    fd.set("educator_strategies", educatorStrategies);
    fd.set("suggested_family_strategies", familyStrategies);
    fd.set("environment_adjustments", environmentAdjustments);
    fd.set("external_support_notes", externalNotes);
    fd.set("review_date", reviewDate);
    fd.set("review_notes", reviewNotes);

    startTransition(async () => {
      await updateBehaviourSupportPlan(fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <div className="space-y-6">
      {/* Status + review */}
      <div className={`${cardClass} px-4 py-4`}>
        <h2 className="font-display text-sm font-semibold text-ink">Plan status</h2>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink/40">
              Status
            </label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target.value as "draft" | "active" | "under_review" | "archived",
                )
              }
              className="w-full rounded-xl border border-coral-light px-3 py-2.5 text-sm text-ink focus:border-coral focus:outline-none"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink/40">
              Review date
            </label>
            <input
              type="date"
              value={reviewDate}
              onChange={(e) => setReviewDate(e.target.value)}
              className="w-full rounded-xl border border-coral-light px-3 py-2.5 text-sm text-ink focus:border-coral focus:outline-none"
            />
          </div>
        </div>
        {(plan.status === "under_review" || status === "under_review") && (
          <div className="mt-3">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink/40">
              Review notes
            </label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={3}
              placeholder="What was discussed at review? Any changes to strategies?"
              className="w-full resize-none rounded-xl border border-coral-light px-3 py-2.5 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Child context */}
      <div className={`${cardClass} px-4 py-4`}>
        <h2 className="font-display text-sm font-semibold text-ink">
          Child context — {childName}
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink/40">
              Strengths
            </label>
            <textarea
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              rows={3}
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
              rows={3}
              className="w-full resize-none rounded-xl border border-coral-light px-3 py-2 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Behaviour */}
      <div className={`${cardClass} px-4 py-4`}>
        <h2 className="font-display text-sm font-semibold text-ink">Behaviour details</h2>
        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink/40">
              Behaviour description
            </label>
            <textarea
              value={behaviourDesc}
              onChange={(e) => setBehaviourDesc(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-coral-light px-3 py-2.5 text-sm text-ink focus:border-coral focus:outline-none"
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
                className="w-full resize-none rounded-xl border border-coral-light px-3 py-2 text-sm text-ink focus:border-coral focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink/40">
                Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) =>
                  setFrequency(
                    e.target.value as
                      | "rarely"
                      | "sometimes"
                      | "daily"
                      | "multiple_daily",
                  )
                }
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
              className="w-full resize-none rounded-xl border border-coral-light px-3 py-2 text-sm text-ink focus:border-coral focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Strategies */}
      <div className={`${cardClass} px-4 py-4`}>
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-sm font-semibold text-ink">Strategies</h2>
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={generating}
            className="shrink-0 rounded-xl bg-sage px-3 py-1.5 text-xs font-semibold text-white hover:bg-sage-dark disabled:opacity-50"
          >
            {generating ? "Regenerating…" : "✨ Regenerate"}
          </button>
        </div>
        {generateError && (
          <p className="mt-1 text-xs text-coral-dark">{generateError}</p>
        )}

        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink/40">
              Educator strategies
            </label>
            <textarea
              value={educatorStrategies}
              onChange={(e) => setEducatorStrategies(e.target.value)}
              rows={6}
              className="w-full resize-none rounded-xl border border-coral-light px-3 py-2.5 text-sm text-ink focus:border-coral focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink/40">
              Suggested family strategies{" "}
              <span className="font-normal normal-case text-ink/40">
                (visible to parents)
              </span>
            </label>
            <textarea
              value={familyStrategies}
              onChange={(e) => setFamilyStrategies(e.target.value)}
              rows={4}
              className="w-full resize-none rounded-xl border border-coral-light px-3 py-2.5 text-sm text-ink focus:border-coral focus:outline-none"
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
              className="w-full resize-none rounded-xl border border-coral-light px-3 py-2.5 text-sm text-ink focus:border-coral focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* External supports */}
      <div className={`${cardClass} px-4 py-4`}>
        <h2 className="font-display text-sm font-semibold text-ink">
          External support professionals
        </h2>
        <textarea
          value={externalNotes}
          onChange={(e) => setExternalNotes(e.target.value)}
          rows={3}
          className="mt-2 w-full resize-none rounded-xl border border-coral-light px-3 py-2.5 text-sm text-ink focus:border-coral focus:outline-none"
        />
      </div>

      {/* Save */}
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="text-sm font-medium text-sage-dark">Saved ✓</span>
        )}
        <button
          type="button"
          onClick={handleSave}
          className="rounded-xl bg-coral px-5 py-2.5 text-sm font-semibold text-white hover:bg-coral-dark"
        >
          Save changes
        </button>
      </div>
    </div>
  );
}
