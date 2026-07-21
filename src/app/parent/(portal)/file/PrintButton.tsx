"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="shrink-0 rounded-full border border-coral-light px-4 py-2 text-sm font-medium text-coral-dark hover:bg-coral-light"
    >
      Print / Save as PDF
    </button>
  );
}
