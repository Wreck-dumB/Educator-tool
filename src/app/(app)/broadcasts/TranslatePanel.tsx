"use client";

import { useState } from "react";

const LANGUAGES = [
  { key: "arabic", label: "Arabic (عربي)" },
  { key: "cantonese", label: "Cantonese (廣東話)" },
  { key: "hindi", label: "Hindi (हिन्दी)" },
  { key: "italian", label: "Italian (Italiano)" },
  { key: "japanese", label: "Japanese (日本語)" },
  { key: "korean", label: "Korean (한국어)" },
  { key: "mandarin", label: "Mandarin (普通话)" },
  { key: "punjabi", label: "Punjabi (ਪੰਜਾਬੀ)" },
  { key: "somali", label: "Somali (Soomaali)" },
  { key: "spanish", label: "Spanish (Español)" },
  { key: "tagalog", label: "Tagalog (Filipino)" },
  { key: "thai", label: "Thai (ภาษาไทย)" },
  { key: "turkish", label: "Turkish (Türkçe)" },
  { key: "urdu", label: "Urdu (اردو)" },
  { key: "vietnamese", label: "Vietnamese (Tiếng Việt)" },
];

interface Props {
  broadcastId: string;
  title: string;
  body: string;
}

export default function TranslatePanel({ broadcastId, title, body }: Props) {
  const [language, setLanguage] = useState("");
  const [result, setResult] = useState<{ title: string; body: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleTranslate() {
    if (!language) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/translate-broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, text: body, language }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Translation failed");
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(`${result.title}\n\n${result.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-xs font-medium text-coral-dark hover:underline select-none">
        Translate this message
      </summary>
      <div className="mt-3 space-y-3">
        <div className="flex items-center gap-2">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="flex-1 rounded-xl border border-coral-light bg-white px-3 py-1.5 text-xs shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
          >
            <option value="" disabled>Select a language…</option>
            {LANGUAGES.map((l) => (
              <option key={l.key} value={l.key}>{l.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleTranslate}
            disabled={!language || loading}
            className="rounded-full bg-coral px-3 py-1.5 text-xs font-semibold text-white hover:bg-coral-dark disabled:opacity-50"
          >
            {loading ? "Translating…" : "Translate"}
          </button>
        </div>

        {error && (
          <p className="rounded-xl bg-coral-light px-3 py-2 text-xs text-coral-dark">{error}</p>
        )}

        {result && (
          <div className="rounded-xl border border-sage-light bg-sage-light/20 px-4 py-3 space-y-2">
            <p className="text-xs font-semibold text-ink">{result.title}</p>
            <p className="text-xs text-ink/80 whitespace-pre-wrap">{result.body}</p>
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs font-medium text-sage-dark hover:underline"
            >
              {copied ? "Copied!" : "Copy to clipboard"}
            </button>
          </div>
        )}

        <p className="text-xs text-ink/30">
          AI translations are approximate. For critical health or safety notices, have a qualified
          speaker review before sharing.
        </p>
      </div>
    </details>
  );
}
