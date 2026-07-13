"use client";

import { useState } from "react";
import { saveTransitionStatement } from "./actions";
import { inputClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

interface Props {
  childId: string;
  childName: string;
  initialText: string | null;
  transitionType: "to_school" | "between_rooms" | "between_services";
  isFinalized: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  to_school: "Transition to School",
  between_rooms: "Room Transition",
  between_services: "Service Transition",
};

export default function TransitionEditor({
  childId,
  childName,
  initialText,
  transitionType,
  isFinalized,
}: Props) {
  const [text, setText] = useState(initialText ?? "");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/transition-statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, transitionType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenError(data.error ?? "Generation failed");
      } else {
        setText(data.text);
      }
    } catch {
      setGenError("Network error — please try again.");
    } finally {
      setGenerating(false);
    }
  }

  if (isFinalized) {
    return (
      <div>
        <div className="rounded-xl border border-sage-light bg-sage-light/30 px-4 py-3 text-sm text-sage-dark mb-4">
          This statement has been finalised and is locked for editing.
        </div>
        <pre className="whitespace-pre-wrap text-sm text-ink/80 font-sans leading-relaxed">{text}</pre>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className={secondaryButtonClass}
        >
          {generating ? "Generating…" : text ? "Re-generate with AI" : "Generate with AI"}
        </button>
        {text && (
          <span className="text-xs text-ink/40">
            Review and edit the draft below before saving.
          </span>
        )}
      </div>

      {genError && (
        <p className="rounded-xl bg-coral-light px-3 py-2 text-sm text-coral-dark">{genError}</p>
      )}

      {generating && (
        <div className="rounded-xl border border-coral-light bg-white px-4 py-8 text-center text-sm text-ink/40">
          Generating {TYPE_LABELS[transitionType]?.toLowerCase()} for {childName}…
        </div>
      )}

      <form action={saveTransitionStatement} className="space-y-4">
        <input type="hidden" name="child_id" value={childId} />
        <input type="hidden" name="transition_type" value={transitionType} />

        <div>
          <label className="block text-sm font-medium text-ink/70 mb-1">
            Statement text
          </label>
          <textarea
            name="draft_text"
            rows={16}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Click 'Generate with AI' to create a draft, or write your own statement here…"
            className={inputClass + " resize-y font-mono text-xs leading-relaxed"}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            name="finalize"
            value="0"
            disabled={!text.trim()}
            className={primaryButtonClass}
          >
            Save draft
          </button>
          <button
            type="submit"
            name="finalize"
            value="1"
            disabled={!text.trim()}
            className="rounded-full border-2 border-coral px-4 py-2 text-sm font-semibold text-coral-dark transition-colors hover:bg-coral-light disabled:opacity-50"
          >
            Finalise statement
          </button>
        </div>
        <p className="text-xs text-ink/40">
          Finalised statements are locked and cannot be edited. Use &ldquo;Save draft&rdquo; while
          still revising.
        </p>
      </form>
    </div>
  );
}
