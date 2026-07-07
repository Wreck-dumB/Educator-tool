"use client";

import { useState, useTransition } from "react";

interface SupportResult {
  patterns_observed: string[];
  immediate_strategies: string[];
  longer_term_adjustments: string[];
  when_to_escalate: string[];
}

export default function BehaviourSupportForm({ childId, childName }: { childId: string; childName: string }) {
  const [situation, setSituation] = useState("");
  const [result, setResult] = useState<SupportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!situation.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/behaviour-support", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ childId, situation }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Failed to get strategies");
          return;
        }
        setResult(data as SupportResult);
      } catch {
        setError("Network error — please try again");
      }
    });
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-ink/70">
            Describe what&apos;s happening with {childName}
          </label>
          <textarea
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            rows={4}
            required
            placeholder="e.g. Charlie has been hitting other children at transition times — especially moving from free play to lunch. When redirected he escalates and runs away. This started about two weeks ago."
            className="mt-1 block w-full rounded-xl border border-coral-light bg-white px-3 py-2 text-sm shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
          />
        </div>
        <button
          type="submit"
          disabled={isPending || !situation.trim()}
          className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white hover:bg-coral-dark transition-colors disabled:opacity-50"
        >
          {isPending ? "Getting strategies…" : "Get support strategies"}
        </button>
      </form>

      {error && (
        <p className="rounded-xl bg-coral-light px-4 py-3 text-sm text-coral-dark">{error}</p>
      )}

      {result && (
        <div className="space-y-5">
          {result.patterns_observed.length > 0 && (
            <section>
              <h3 className="font-display text-sm font-semibold text-ink">What the data shows</h3>
              <ul className="mt-2 space-y-1.5">
                {result.patterns_observed.map((p, i) => (
                  <li key={i} className="flex gap-2 text-sm text-ink/80">
                    <span className="mt-0.5 text-coral-dark">•</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h3 className="font-display text-sm font-semibold text-ink">Immediate strategies</h3>
            <ul className="mt-2 space-y-2">
              {result.immediate_strategies.map((s, i) => (
                <li key={i} className="flex gap-2 rounded-xl bg-sage-light px-3 py-2.5 text-sm text-ink/80">
                  <span className="shrink-0 font-bold text-sage-dark">{i + 1}.</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </section>

          {result.longer_term_adjustments.length > 0 && (
            <section>
              <h3 className="font-display text-sm font-semibold text-ink">Longer-term adjustments</h3>
              <ul className="mt-2 space-y-1.5">
                {result.longer_term_adjustments.map((a, i) => (
                  <li key={i} className="flex gap-2 text-sm text-ink/80">
                    <span className="mt-0.5 text-sage-dark">→</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-xl border border-amber-light bg-amber-light/30 px-4 py-3">
            <h3 className="font-display text-sm font-semibold text-amber-dark">When to escalate or seek external support</h3>
            <ul className="mt-2 space-y-1.5">
              {result.when_to_escalate.map((w, i) => (
                <li key={i} className="flex gap-2 text-sm text-amber-dark/80">
                  <span className="mt-0.5">⚑</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </section>

          <p className="text-xs text-ink/40">
            AI-generated — review before acting. This is a starting point for your professional judgement, not a clinical assessment.
          </p>
        </div>
      )}
    </div>
  );
}
