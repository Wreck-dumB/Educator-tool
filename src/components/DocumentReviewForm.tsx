"use client";

import { useState, useRef, useTransition } from "react";

interface ReviewResult {
  filename: string;
  truncated: boolean;
  document_type_detected: string;
  quality_score: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  nqs_alignment: string[];
  suggestions: string[];
  import_recommendation: "ready" | "minor_edits" | "major_rewrite";
}

const CATEGORIES = [
  { value: "policy", label: "Policy" },
  { value: "form", label: "Form / Template" },
  { value: "procedure", label: "Safe Work Procedure" },
  { value: "risk_assessment", label: "Risk Assessment" },
  { value: "other", label: "Other" },
];

const RECOMMENDATION_LABELS: Record<ReviewResult["import_recommendation"], { text: string; color: string }> = {
  ready: { text: "Ready to import", color: "text-sage-dark bg-sage-light" },
  minor_edits: { text: "Minor edits needed", color: "text-amber-dark bg-amber-light" },
  major_rewrite: { text: "Major rewrite needed", color: "text-coral-dark bg-coral-light" },
};

function QualityDots({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={i}
          className={`h-2.5 w-2.5 rounded-full ${i < score ? "bg-coral" : "bg-coral-light"}`}
        />
      ))}
      <span className="ml-1.5 text-xs font-semibold text-ink/60">{score}/10</span>
    </div>
  );
}

export default function DocumentReviewForm() {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("policy");
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File | null) {
    if (!f) return;
    const ok = f.name.toLowerCase().endsWith(".pdf") || f.name.toLowerCase().endsWith(".docx");
    if (!ok) {
      setError("Only PDF and DOCX files are supported");
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      setError("File is too large (max 20 MB)");
      return;
    }
    setFile(f);
    setError(null);
    setResult(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0] ?? null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError(null);
    setResult(null);

    startTransition(async () => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", category);

      try {
        const res = await fetch("/api/document-review", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Review failed");
          return;
        }
        setResult(data as ReviewResult);
      } catch {
        setError("Network error — please try again");
      }
    });
  }

  const rec = result ? RECOMMENDATION_LABELS[result.import_recommendation] : null;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-coral-light bg-white px-6 py-10 text-center transition-colors hover:border-coral hover:bg-coral-light/20"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          <span className="text-3xl">📄</span>
          {file ? (
            <div>
              <p className="text-sm font-semibold text-ink">{file.name}</p>
              <p className="text-xs text-ink/50">{(file.size / 1024).toFixed(0)} KB — click to change</p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-ink">Drop a file here, or click to browse</p>
              <p className="text-xs text-ink/50 mt-0.5">PDF or DOCX, up to 20 MB</p>
            </div>
          )}
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-ink/70">Document type</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-coral-light bg-white px-3 py-2 text-sm text-ink shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {error && (
          <p className="rounded-xl bg-coral-light px-4 py-3 text-sm text-coral-dark">{error}</p>
        )}

        <button
          type="submit"
          disabled={!file || isPending}
          className="rounded-full bg-coral px-6 py-2.5 text-sm font-semibold text-white hover:bg-coral-dark transition-colors disabled:opacity-50"
        >
          {isPending ? "Reviewing… this may take a moment" : "Review with AI"}
        </button>
      </form>

      {result && (
        <div className="space-y-5">
          {/* Header */}
          <div className="rounded-2xl border border-coral-light bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">
                  {result.document_type_detected}
                </p>
                <p className="mt-0.5 text-sm text-ink/70">{result.filename}</p>
              </div>
              {rec && (
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${rec.color}`}>
                  {rec.text}
                </span>
              )}
            </div>
            <p className="mt-3 text-sm text-ink/80">{result.summary}</p>
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-medium text-ink/50">Overall quality</p>
              <QualityDots score={result.quality_score} />
            </div>
            {result.truncated && (
              <p className="mt-3 text-xs text-amber-dark">
                ⚠ This document was very large, so only the earlier portion was analysed and there may be gaps not reflected above. For an unusually long manual, consider splitting it into its individual policies and reviewing each one separately.
              </p>
            )}
          </div>

          {/* Strengths */}
          {result.strengths.length > 0 && (
            <section className="rounded-2xl border border-coral-light bg-white p-5">
              <h3 className="font-display text-sm font-semibold text-ink">What&apos;s working well</h3>
              <ul className="mt-3 space-y-2">
                {result.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-ink/80">
                    <span className="mt-0.5 shrink-0 text-sage-dark">✓</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Gaps */}
          {result.gaps.length > 0 && (
            <section className="rounded-2xl border border-coral-light bg-white p-5">
              <h3 className="font-display text-sm font-semibold text-ink">Gaps &amp; issues</h3>
              <ul className="mt-3 space-y-2">
                {result.gaps.map((g, i) => (
                  <li key={i} className="flex gap-2 text-sm text-ink/80">
                    <span className="mt-0.5 shrink-0 text-coral-dark">•</span>
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* NQS alignment */}
          {result.nqs_alignment.length > 0 && (
            <section className="rounded-2xl border border-coral-light bg-white p-5">
              <h3 className="font-display text-sm font-semibold text-ink">NQS alignment</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {result.nqs_alignment.map((code, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-sage-light px-3 py-1 text-xs font-medium text-sage-dark"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Suggestions */}
          {result.suggestions.length > 0 && (
            <section className="rounded-2xl border border-coral-light bg-white p-5">
              <h3 className="font-display text-sm font-semibold text-ink">Suggested improvements</h3>
              <ul className="mt-3 space-y-2">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="flex gap-2 rounded-xl bg-sage-light px-3 py-2.5 text-sm text-ink/80">
                    <span className="shrink-0 font-bold text-sage-dark">{i + 1}.</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="text-xs text-ink/40">
            AI-generated — use as a starting point for your professional review, not a replacement for it.
          </p>
        </div>
      )}
    </div>
  );
}
