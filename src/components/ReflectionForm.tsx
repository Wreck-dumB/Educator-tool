"use client";

import { useState, useTransition } from "react";

type ReflectionType = "post_incident" | "end_of_day" | "general";

interface Props {
  ownerUserId: string;
  onSaved: () => void;
}

const TYPE_LABELS: Record<ReflectionType, string> = {
  post_incident: "Post-incident",
  end_of_day: "End of day",
  general: "General reflection",
};

export default function ReflectionForm({ ownerUserId, onSaved }: Props) {
  const [type, setType] = useState<ReflectionType>("general");
  const [context, setContext] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [responses, setResponses] = useState<string[]>([]);
  const [keyLearning, setKeyLearning] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"context" | "questions" | "saved">("context");
  const [isPending, startTransition] = useTransition();

  function handleGenerateQuestions() {
    if (!context.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/reflection-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ context, type }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Failed to generate questions");
          return;
        }
        const qs: string[] = data.questions ?? [];
        setQuestions(qs);
        setResponses(qs.map(() => ""));
        setStep("questions");
      } catch {
        setError("Network error — please try again");
      }
    });
  }

  async function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/save-reflection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ownerUserId,
            type,
            context,
            questions,
            responses,
            keyLearning: keyLearning.trim() || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Failed to save reflection");
          return;
        }
        setStep("saved");
        onSaved();
      } catch {
        setError("Network error — please try again");
      }
    });
  }

  if (step === "saved") {
    return (
      <p className="rounded-xl bg-sage-light px-4 py-3 text-sm text-sage-dark">
        Reflection saved. It will appear in your reflection log below.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Type selector */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(TYPE_LABELS) as ReflectionType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              type === t
                ? "border-coral bg-coral-light text-coral-dark"
                : "border-coral-light text-ink/60 hover:border-coral"
            }`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {step === "context" && (
        <>
          <div>
            <label className="block text-sm font-medium text-ink/70">
              What happened? Describe the situation briefly.
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={4}
              required
              placeholder="e.g. During outdoor play, a child became very upset when another child took their ball. I intervened but the situation escalated before it calmed down."
              className="mt-1 block w-full rounded-xl border border-coral-light bg-white px-3 py-2 text-sm shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
            />
          </div>
          {error && (
            <p className="rounded-xl bg-coral-light px-4 py-3 text-sm text-coral-dark">{error}</p>
          )}
          <button
            type="button"
            onClick={handleGenerateQuestions}
            disabled={isPending || context.trim().length < 10}
            className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white hover:bg-coral-dark transition-colors disabled:opacity-50"
          >
            {isPending ? "Generating questions…" : "Get reflection questions"}
          </button>
        </>
      )}

      {step === "questions" && (
        <>
          <div className="space-y-4">
            {questions.map((q, i) => (
              <div key={i}>
                <label className="block text-sm font-medium text-ink/80">{q}</label>
                <textarea
                  value={responses[i] ?? ""}
                  onChange={(e) => {
                    const updated = [...responses];
                    updated[i] = e.target.value;
                    setResponses(updated);
                  }}
                  rows={3}
                  placeholder="Your answer…"
                  className="mt-1 block w-full rounded-xl border border-coral-light bg-white px-3 py-2 text-sm shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
                />
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-ink/80">
                Key learning or takeaway <span className="font-normal text-ink/40">(optional)</span>
              </label>
              <textarea
                value={keyLearning}
                onChange={(e) => setKeyLearning(e.target.value)}
                rows={2}
                placeholder="What's the one thing you'll take forward from this?"
                className="mt-1 block w-full rounded-xl border border-coral-light bg-white px-3 py-2 text-sm shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-coral-light px-4 py-3 text-sm text-coral-dark">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep("context")}
              className="rounded-full border border-coral-light px-4 py-2 text-sm text-ink/60 hover:border-coral transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="rounded-full bg-sage px-5 py-2 text-sm font-semibold text-white hover:bg-sage-dark transition-colors disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Save reflection"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
