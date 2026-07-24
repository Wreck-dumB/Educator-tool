"use client";

export default function DateNavInput({ date, path, className }: { date: string; path: string; className?: string }) {
  return (
    <input
      type="date"
      defaultValue={date}
      onChange={(e) => {
        if (e.target.value) window.location.href = `${path}?date=${e.target.value}`;
      }}
      className={className ?? "rounded-xl border border-coral-light px-3 py-1.5 text-sm text-ink focus:border-coral focus:outline-none"}
    />
  );
}
