"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full bg-coral px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-coral-dark print:hidden"
    >
      🖨️ Print / save as PDF
    </button>
  );
}
