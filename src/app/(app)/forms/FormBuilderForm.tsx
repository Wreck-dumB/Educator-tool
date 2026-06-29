"use client";

import { useState } from "react";
import type { FormTemplateSuggestion } from "@/lib/types/domain";
import { inputClass, primaryButtonClass, secondaryButtonClass, errorBannerClass } from "@/lib/ui";
import { saveFormTemplate } from "./actions";

const CATEGORY_SUGGESTIONS = [
  "Excursion permission slip",
  "Photo/media consent",
  "Medication authorisation",
  "Sun protection / sunscreen consent",
  "Incursion (visitor to the service) consent",
  "Late pickup / authorised collection notice",
  "Settling-in / orientation form",
];

export default function FormBuilderForm() {
  const [category, setCategory] = useState("");
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<FormTemplateSuggestion | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  async function handleGenerate() {
    if (!category.trim() || !userInput.trim()) {
      setError("Give the form a category and describe what it's for first.");
      return;
    }
    setLoading(true);
    setError(null);
    setDraft(null);
    setSavedId(null);
    try {
      const res = await fetch("/api/form-template", {
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
    const result = await saveFormTemplate(category, userInput, draft);
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
        <label htmlFor="form_category" className="block text-sm font-medium text-ink/70">
          Form category
        </label>
        <input
          id="form_category"
          type="text"
          list="form_category_suggestions"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g. Excursion permission slip"
          className={inputClass}
        />
        <datalist id="form_category_suggestions">
          {CATEGORY_SUGGESTIONS.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <div className="mt-3">
        <label htmlFor="form_user_input" className="block text-sm font-medium text-ink/70">
          Describe what this form is for
        </label>
        <textarea
          id="form_user_input"
          rows={4}
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="e.g. We're taking the 3-5 room to the local library on the 14th, walking, returning by lunchtime. Need parent consent and an emergency contact number on the day..."
          className={inputClass}
        />
        <p className="mt-1 text-xs text-ink/50">
          The more specific you are, the better the draft — and the more useful the gap-check below
          will be.
        </p>
      </div>

      {error && <p className={errorBannerClass}>{error}</p>}
      {savedId && <p className="mt-3 text-sm font-medium text-sage-dark">Saved — view it below.</p>}

      {!draft && (
        <button type="button" onClick={handleGenerate} disabled={loading} className={`mt-4 ${primaryButtonClass}`}>
          {loading ? "Drafting…" : "Draft form"}
        </button>
      )}

      {draft && (
        <div className="mt-4">
          <h3 className="font-display text-lg font-semibold text-ink">{draft.title}</h3>
          {draft.purpose && <p className="mt-2 text-sm text-ink/80">{draft.purpose}</p>}
          {draft.bodyText && <p className="mt-2 whitespace-pre-line text-sm text-ink/80">{draft.bodyText}</p>}
          {draft.fieldsToComplete.length > 0 && (
            <>
              <p className="mt-3 text-sm font-medium text-ink/80">Fields to complete</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink/80">
                {draft.fieldsToComplete.map((f, idx) => (
                  <li key={idx}>{f}</li>
                ))}
              </ul>
            </>
          )}
          {draft.requiresSignature && (
            <p className="mt-2 text-xs text-ink/50">Includes a signature block.</p>
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
              {saving ? "Saving…" : "Save form template"}
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
