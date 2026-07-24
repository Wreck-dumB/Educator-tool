"use client";

export default function PrintButton({
  label = "🖨️ Print / save as PDF",
  className = "rounded-full bg-coral px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-coral-dark print:hidden",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <button type="button" onClick={() => window.print()} className={className}>
      {label}
    </button>
  );
}
