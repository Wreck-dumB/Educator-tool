"use client";

import { useState } from "react";
import { inputClass, secondaryButtonClass } from "@/lib/ui";

export default function AttendanceExport() {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
  const firstOfMonth = today.slice(0, 8) + "01";

  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today);
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const url = `/api/staff-attendance-export?from=${from}&to=${to}`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Export failed" }));
        alert(err.error ?? "Export failed");
        return;
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `staff-attendance-${from}-to-${to}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-1 flex flex-wrap items-end gap-3">
      <div>
        <label className="mb-1 block text-xs text-ink/60">From</label>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          max={to}
          className={`${inputClass} mt-0 w-40`}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink/60">To</label>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          min={from}
          max={today}
          className={`${inputClass} mt-0 w-40`}
        />
      </div>
      <button
        onClick={handleExport}
        disabled={loading || !from || !to}
        className={`${secondaryButtonClass} disabled:opacity-40`}
      >
        {loading ? "Exporting…" : "Download CSV"}
      </button>
    </div>
  );
}
