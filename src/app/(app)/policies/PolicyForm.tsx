"use client";

import { useState } from "react";
import type { PolicySuggestion } from "@/lib/types/domain";
import { inputClass, primaryButtonClass, secondaryButtonClass, errorBannerClass } from "@/lib/ui";
import { savePolicy } from "./actions";

export default function PolicyForm() {
  const [category, setCategory] = useState("");
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<PolicySuggestion | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  async function handleGenerate() {
    if (!category.trim() || !userInput.trim()) {
      setError("Give the policy a category and describe your service's situation first.");
      return;
    }
    setLoading(true);
    setError(null);
    setDraft(null);
    setSavedId(null);
    try {
      const res = await fetch("/api/policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, userInput }),
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
    const result = await savePolicy(category, userInput, draft);
    if ("error" in result) {
      setError(result.error);
    } else {
      setSavedId(result.id);
      setDraft(null);
      setCategory("");
      setUserInput("");
    }
    setSaving(false);
  }

  return (
    <div className="rounded-2xl border border-coral-light bg-white p-5 shadow-sm">
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-ink/70">
          Policy category
        </label>
        <input
          id="category"
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g. Incident, Injury, Trauma and Illness"
          className={inputClass}
        />
      </div>
      <div className="mt-3">
        <label htmlFor="user_input" className="block text-sm font-medium text-ink/70">
          Describe your service&apos;s situation and approach
        </label>
        <textarea
          id="user_input"
          rows={5}
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="e.g. We're a 40-place long day care centre. When a child is injured, the educator who witnessed it completes a paper incident form, the nominated supervisor is notified immediately, and families are told at pickup or by phone for anything serious..."
          className={inputClass}
        />
        <p className="mt-1 text-xs text-ink/50">
          The more specific you are about how things actually work at your service, the better the
          draft — and the more useful the gap-check below will be.
        </p>
      </div>

      {error && <p className={errorBannerClass}>{error}</p>}
      {savedId && <p className="mt-3 text-sm font-medium text-sage-dark">Saved — view it below.</p>}

      {!draft && (
        <button type="button" onClick={handleGenerate} disabled={loading} className={`mt-4 ${primaryButtonClass}`}>
          {loading ? "Drafting…" : "Draft policy"}
        </button>
      )}

      {draft && (
        <div className="mt-4">
          <h3 className="font-display text-lg font-semibold text-ink">{draft.title}</h3>
          {draft.purpose && (
            <p className="mt-2 text-sm text-ink/80">
              <span className="font-medium">Purpose:</span> {draft.purpose}
            </p>
          )}
          {draft.scope && (
            <p className="mt-2 text-sm text-ink/80">
              <span className="font-medium">Scope:</span> {draft.scope}
            </p>
          )}
          {draft.procedureSteps.length > 0 && (
            <>
              <p className="mt-3 text-sm font-medium text-ink/80">Procedure</p>
              <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-ink/80">
                {draft.procedureSteps.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ol>
            </>
          )}
          {draft.relatedLegislation.length > 0 && (
            <p className="mt-3 text-xs text-ink/50">
              <span className="font-medium">Related legislation/areas:</span> {draft.relatedLegislation.join("; ")}
            </p>
          )}

          {draft.suggestedAdditions.length > 0 && (
            <div className="mt-4 rounded-xl bg-amber-light p-3">
              <p className="text-sm font-medium text-amber-dark">Worth considering — things your description didn&apos;t cover</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-amber-dark/90">
                {draft.suggestedAdditions.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <button type="button" onClick={handleSave} disabled={saving} className={primaryButtonClass}>
              {saving ? "Saving…" : "Save policy draft"}
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
