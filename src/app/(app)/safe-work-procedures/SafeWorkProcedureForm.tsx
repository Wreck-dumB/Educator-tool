"use client";

import { useState } from "react";
import type { SafeWorkProcedureSuggestion } from "@/lib/types/domain";
import { inputClass, primaryButtonClass, secondaryButtonClass, errorBannerClass } from "@/lib/ui";
import HazardTable from "@/components/HazardTable";
import { saveSafeWorkProcedure } from "./actions";

export default function SafeWorkProcedureForm() {
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<SafeWorkProcedureSuggestion | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  async function handleGenerate() {
    if (!taskTitle.trim() || !taskDescription.trim()) {
      setError("Give the task a title and a short description first.");
      return;
    }
    setLoading(true);
    setError(null);
    setDraft(null);
    setSavedId(null);
    try {
      const res = await fetch("/api/safe-work-procedure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskTitle, taskDescription }),
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
    const result = await saveSafeWorkProcedure(taskTitle, taskDescription, draft);
    if ("error" in result) {
      setError(result.error);
    } else {
      setSavedId(result.id);
      setDraft(null);
      setTaskTitle("");
      setTaskDescription("");
    }
    setSaving(false);
  }

  return (
    <div className="rounded-2xl border border-coral-light bg-white p-5 shadow-sm">
      <div>
        <label htmlFor="task_title" className="block text-sm font-medium text-ink/70">
          Task
        </label>
        <input
          id="task_title"
          type="text"
          value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)}
          placeholder="e.g. Sanitising toys with bleach solution"
          className={inputClass}
        />
      </div>
      <div className="mt-3">
        <label htmlFor="task_description" className="block text-sm font-medium text-ink/70">
          Describe how it&apos;s currently done (or how you&apos;d like it done)
        </label>
        <textarea
          id="task_description"
          rows={3}
          value={taskDescription}
          onChange={(e) => setTaskDescription(e.target.value)}
          placeholder="e.g. Educator mixes bleach and water in the laundry sink at the end of the day, soaks toys, rinses and air-dries them on the rack."
          className={inputClass}
        />
      </div>

      {error && <p className={errorBannerClass}>{error}</p>}
      {savedId && <p className="mt-3 text-sm font-medium text-sage-dark">Saved — view it below.</p>}

      {!draft && (
        <button type="button" onClick={handleGenerate} disabled={loading} className={`mt-4 ${primaryButtonClass}`}>
          {loading ? "Generating…" : "Generate baseline safe work procedure"}
        </button>
      )}

      {draft && (
        <div className="mt-4">
          {draft.ppeRequired.length > 0 && (
            <p className="mb-3 text-sm text-ink/70">
              <span className="font-medium">PPE required:</span> {draft.ppeRequired.join(", ")}
            </p>
          )}
          {draft.steps.length > 0 && (
            <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm text-ink/80">
              {draft.steps.map((s, idx) => (
                <li key={idx}>{s}</li>
              ))}
            </ol>
          )}
          <HazardTable hazards={draft.hazards} />
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={handleSave} disabled={saving} className={primaryButtonClass}>
              {saving ? "Saving…" : "Save safe work procedure"}
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
