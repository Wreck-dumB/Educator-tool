"use client";

import { useState, useTransition } from "react";
import { saveNqsRating } from "./actions";

type Rating = "working_towards" | "meeting" | "exceeding";

interface Props {
  assessmentId: string;
  code: string;
  title: string;
  text: string;
  currentRating: Rating | null;
  evidenceNotes: string | null;
}

const RATING_OPTIONS: { value: Rating; label: string; color: string }[] = [
  { value: "working_towards", label: "Working Towards", color: "bg-amber-100 border-amber-300 text-amber-800" },
  { value: "meeting", label: "Meeting", color: "bg-blue-100 border-blue-300 text-blue-800" },
  { value: "exceeding", label: "Exceeding", color: "bg-sage-light border-sage text-sage-dark" },
];

export default function NqsStandardCard({
  assessmentId,
  code,
  title,
  text,
  currentRating,
  evidenceNotes,
}: Props) {
  const [rating, setRating] = useState<Rating | null>(currentRating);
  const [notes, setNotes] = useState(evidenceNotes ?? "");
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleRatingChange(newRating: Rating) {
    setRating(newRating);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("assessment_id", assessmentId);
      fd.append("standard_code", code);
      fd.append("rating", newRating);
      fd.append("evidence_notes", notes);
      await saveNqsRating(fd);
    });
  }

  function handleNotesBlur() {
    if (rating) {
      startTransition(async () => {
        const fd = new FormData();
        fd.append("assessment_id", assessmentId);
        fd.append("standard_code", code);
        fd.append("rating", rating);
        fd.append("evidence_notes", notes);
        await saveNqsRating(fd);
      });
    }
  }

  const ratingOption = RATING_OPTIONS.find((r) => r.value === rating);

  return (
    <div className={`rounded-xl border p-4 transition-colors ${rating ? "border-coral-light/50" : "border-dashed border-ink/20"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-ink/40 font-mono">{code}</span>
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-sm font-semibold text-ink hover:text-coral-dark text-left"
            >
              {title}
            </button>
          </div>
          {expanded && (
            <p className="mt-1 text-xs text-ink/60 leading-relaxed">{text}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {RATING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleRatingChange(opt.value)}
              disabled={pending}
              title={opt.label}
              className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-all ${
                rating === opt.value
                  ? opt.color + " ring-2 ring-offset-1 ring-current"
                  : "bg-white border-ink/15 text-ink/40 hover:border-ink/30"
              }`}
            >
              {opt.value === "working_towards" ? "WT" : opt.value === "meeting" ? "M" : "E"}
            </button>
          ))}
        </div>
      </div>

      {rating && (
        <div className="mt-3">
          <label className="block text-xs font-medium text-ink/50 mb-1">Evidence notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            rows={2}
            placeholder="What evidence supports this rating? (optional)"
            className="block w-full rounded-lg border border-coral-light bg-white px-3 py-2 text-xs text-ink shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral resize-none"
          />
        </div>
      )}

      {!rating && (
        <p className="mt-2 text-xs text-ink/30">Click WT / M / E to rate this standard</p>
      )}

      {pending && <p className="mt-1 text-xs text-ink/30">Saving…</p>}

      {ratingOption && !expanded && (
        <p className="mt-1 text-xs">
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${ratingOption.color}`}>
            {ratingOption.label}
          </span>
        </p>
      )}
    </div>
  );
}
