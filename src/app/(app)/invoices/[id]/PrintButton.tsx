"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-xl border border-coral-light px-4 py-2 text-sm font-semibold text-ink/60 hover:bg-coral-light"
      type="button"
    >
      Print / Save PDF
    </button>
  );
}
