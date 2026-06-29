"use client";

import { useState } from "react";
import type { QipItemSuggestion } from "@/lib/types/domain";
import { inputClass, primaryButtonClass, secondaryButtonClass, errorBannerClass } from "@/lib/ui";
import { saveQipItems } from "./actions";

const QUALITY_AREAS = [
  "1 — Educational program and practice",
  "2 — Children's health and safety",
  "3 — Physical environment",
  "4 — Staffing arrangements",
  "5 — Relationships with children",
  "6 — Collaborative partnerships with families and communities",
  "7 — Governance and leadership",
];

export default function QipGeneratorForm({ qipId }: { qipId: string }) {
  const [userInput, setUserInput] = useState("");
  const [focusAreas, setFocusAreas] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<QipItemSuggestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  function toggleFocusArea(num: number) {
    setFocusAreas((prev) => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num);
      else next.add(num);
      return next;
    });
  }

  async function handleGenerate() {
    if (!userInput.trim()) {
      setError("Describe current practice, strengths, or known issues first.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuggestions([]);
    try {
      const res = await fetch("/api/qip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userInput,
          targetQualityAreas: focusAreas.size > 0 ? Array.from(focusAreas) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
      } else {
        setSuggestions(data.items);
        setSelected(new Set(data.items.map((_: QipItemSuggestion, i: number) => i)));
      }
    } catch {
      setError("Could not reach the server");
    } finally {
      setLoading(false);
    }
  }

  function toggleSelected(idx: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  async function handleSave() {
    const toSave = suggestions.filter((_, idx) => selected.has(idx));
    if (toSave.length === 0) return;
    setSaving(true);
    const result = await saveQipItems(qipId, toSave);
    if (result && "error" in result) {
      setError(result.error);
    } else {
      setSuggestions([]);
      setUserInput("");
    }
    setSaving(false);
  }

  return (
    <div className="rounded-2xl border border-coral-light bg-white p-5 shadow-sm">
      <label htmlFor="qip_input" className="block text-sm font-medium text-ink/70">
        Describe current practice, strengths, or known issues
      </label>
      <textarea
        id="qip_input"
        rows={4}
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        placeholder="e.g. We have a strong outdoor program but our sun protection policy isn't consistently followed by relief staff. Educators document learning stories weekly but rarely link them back to families' own goals for their child..."
        className={inputClass}
      />

      <p className="mt-3 text-sm font-medium text-ink/70">Focus on specific quality areas (optional)</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {QUALITY_AREAS.map((label, idx) => {
          const num = idx + 1;
          const active = focusAreas.has(num);
          return (
            <button
              key={num}
              type="button"
              onClick={() => toggleFocusArea(num)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                active ? "border-coral bg-coral-light text-coral-dark" : "border-coral-light/60 text-ink/70 hover:bg-coral-light/40"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {error && <p className={errorBannerClass}>{error}</p>}

      {suggestions.length === 0 && (
        <button type="button" onClick={handleGenerate} disabled={loading} className={`mt-4 ${primaryButtonClass}`}>
          {loading ? "Drafting…" : "Generate QIP items"}
        </button>
      )}

      {suggestions.length > 0 && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-ink/60">Review and pick which to add to your plan:</p>
          {suggestions.map((item, idx) => (
            <label
              key={idx}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-coral-light p-3 hover:bg-cream"
            >
              <input
                type="checkbox"
                checked={selected.has(idx)}
                onChange={() => toggleSelected(idx)}
                className="mt-1"
              />
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-ink/40">
                  QA{item.qualityAreaNumber}
                  {item.standardCode ? ` · ${item.standardCode}` : ""} ·{" "}
                  {item.itemType === "strength" ? "Strength" : "Improvement"}
                </p>
                <p className="mt-0.5 text-sm text-ink/80">{item.description}</p>
                {item.itemType === "improvement" && (
                  <div className="mt-1 space-y-0.5 text-xs text-ink/60">
                    {item.successMeasure && <p>How we&apos;ll know: {item.successMeasure}</p>}
                    {item.timeframe && <p>Timeframe: {item.timeframe}</p>}
                    {item.steps.length > 0 && <p>Steps: {item.steps.join("; ")}</p>}
                  </div>
                )}
              </div>
            </label>
          ))}
          <div className="flex gap-3">
            <button type="button" onClick={handleSave} disabled={saving || selected.size === 0} className={primaryButtonClass}>
              {saving ? "Adding…" : `Add ${selected.size} to plan`}
            </button>
            <button type="button" onClick={() => setSuggestions([])} className={secondaryButtonClass}>
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
