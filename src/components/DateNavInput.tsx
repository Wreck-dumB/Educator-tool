"use client";

export default function DateNavInput({ date, path, max, className, extraParams }: { date: string; path: string; max?: string; className?: string; extraParams?: string }) {
  return (
    <input
      type="date"
      defaultValue={date}
      max={max}
      onChange={(e) => {
        if (e.target.value) window.location.href = `${path}?date=${e.target.value}${extraParams ? `&${extraParams}` : ""}`;
      }}
      className={className ?? "rounded-xl border border-coral-light px-3 py-1.5 text-sm text-ink focus:border-coral focus:outline-none"}
    />
  );
}
