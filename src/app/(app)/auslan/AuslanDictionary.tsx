"use client";

import { useMemo, useState } from "react";
import {
  AUSLAN_CATEGORIES,
  AUSLAN_SIGNS,
  searchSigns,
  signbankSearchUrl,
  type AuslanCategory,
  type AuslanSign,
} from "@/lib/auslan";
import { inputClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import QrCode from "@/components/QrCode";

type CardSize = "large" | "small";

export default function AuslanDictionary() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<AuslanCategory | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cardSize, setCardSize] = useState<CardSize>("large");

  const results = useMemo(() => searchSigns(query, category), [query, category]);
  const selectedSigns = useMemo(
    () => AUSLAN_SIGNS.filter((s) => selected.has(s.word)),
    [selected],
  );
  const printSigns = selectedSigns.length > 0 ? selectedSigns : results;

  function toggleSelected(word: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word);
      else next.add(word);
      return next;
    });
  }

  return (
    <>
      {/* ============ On-screen dictionary ============ */}
      <div className="print:hidden">
        <div className="mt-5 rounded-2xl border border-coral-light bg-white p-5 shadow-sm">
          <label className="block text-sm font-medium text-ink/70">
            What do you want to sign, teach, or learn?
          </label>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. more, toilet, kangaroo, happy…"
            className={inputClass}
          />

          <div className="mt-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCategory(null)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                category === null
                  ? "bg-coral text-white"
                  : "border border-coral-light/60 text-ink/60 hover:bg-coral-light/40"
              }`}
            >
              All
            </button>
            {AUSLAN_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(category === c ? null : c)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  category === c
                    ? "bg-coral text-white"
                    : "border border-coral-light/60 text-ink/60 hover:bg-coral-light/40"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Print controls */}
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-sage-light bg-sage-light/40 px-4 py-3">
          <p className="text-sm text-sage-dark">
            <span className="font-semibold">{selected.size}</span> selected for printing
            {selected.size === 0 && results.length > 0 && (
              <span className="text-sage-dark/70"> — none selected, so all {results.length} shown will print</span>
            )}
          </p>
          <div className="flex items-center gap-1.5 text-xs">
            {(["large", "small"] as CardSize[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setCardSize(s)}
                className={`rounded-full px-3 py-1 font-medium transition-colors ${
                  cardSize === s
                    ? "bg-sage text-white"
                    : "border border-sage text-sage-dark hover:bg-sage-light"
                }`}
              >
                {s === "large" ? "Large cards (4/page)" : "Small cards (8/page)"}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-2">
            {selected.size > 0 && (
              <button type="button" onClick={() => setSelected(new Set())} className={secondaryButtonClass}>
                Clear selection
              </button>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              disabled={printSigns.length === 0}
              className={primaryButtonClass}
            >
              🖨️ Print visual aid cards
            </button>
          </div>
        </div>

        {/* Results */}
        {results.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-coral-light bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-ink/60">
              No match for &ldquo;{query}&rdquo; in DR. SparkPlay&apos;s word list yet.
            </p>
            <a
              href={signbankSearchUrl(query)}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-3 inline-block ${primaryButtonClass}`}
            >
              Search &ldquo;{query}&rdquo; on Auslan Signbank →
            </a>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {results.map((sign) => (
              <SignCard
                key={sign.word}
                sign={sign}
                selected={selected.has(sign.word)}
                onToggle={() => toggleSelected(sign.word)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ============ Print-only flashcards ============ */}
      <div className="hidden print:block">
        <div className={`grid ${cardSize === "large" ? "grid-cols-2" : "grid-cols-4"} gap-4`}>
          {printSigns.map((sign) => (
            <div
              key={sign.word}
              className="flex break-inside-avoid flex-col items-center rounded-2xl border-2 border-ink/20 p-4 text-center"
            >
              <span className={cardSize === "large" ? "text-[7rem] leading-none" : "text-5xl leading-none"} aria-hidden>
                {sign.emoji}
              </span>
              <p
                className={`font-display mt-3 font-semibold text-ink ${
                  cardSize === "large" ? "text-3xl" : "text-lg"
                }`}
              >
                {sign.word}
              </p>
              <p className={`mt-1 uppercase tracking-widest text-ink/40 ${cardSize === "large" ? "text-xs" : "text-[8px]"}`}>
                We are learning this sign in Auslan
              </p>
              <div className={`flex items-center gap-2 ${cardSize === "large" ? "mt-3" : "mt-2"}`}>
                <QrCode
                  value={signbankSearchUrl(sign.word.replace(/\s*\(.*\)$/, ""))}
                  sizePx={cardSize === "large" ? 76 : 48}
                />
                <p className={`text-left text-ink/50 ${cardSize === "large" ? "text-[10px] max-w-[9rem]" : "text-[7px] max-w-[5rem]"}`}>
                  Scan with your phone to watch how to make this sign with your hands
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-[10px] text-ink/40">
          Printed from DR. SparkPlay · Sign demonstrations at Auslan Signbank (auslan.org.au) · Auslan has regional
          dialect variants — confirm the sign used in your community.
        </p>
      </div>
    </>
  );
}

function SignCard({
  sign,
  selected,
  onToggle,
}: {
  sign: AuslanSign;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border bg-white p-4 shadow-sm transition-colors ${
        selected ? "border-sage ring-1 ring-sage" : "border-coral-light"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={selected ? `Remove ${sign.word} from print set` : `Add ${sign.word} to print set`}
        className={`absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border text-xs transition-colors ${
          selected
            ? "border-sage bg-sage text-white"
            : "border-coral-light text-ink/30 hover:border-sage hover:text-sage-dark"
        }`}
      >
        {selected ? "✓" : "+"}
      </button>

      <span className="text-4xl" aria-hidden>
        {sign.emoji}
      </span>
      <p className="font-display mt-2 font-semibold text-ink">{sign.word}</p>
      <p className="text-[10px] uppercase tracking-wider text-ink/40">{sign.category}</p>
      {sign.tip && <p className="mt-2 text-xs text-ink/60">{sign.tip}</p>}

      <a
        href={signbankSearchUrl(sign.word.replace(/\s*\(.*\)$/, ""))}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto pt-3 text-xs font-semibold text-coral-dark hover:underline"
      >
        ▶ Watch sign video
      </a>
    </div>
  );
}
