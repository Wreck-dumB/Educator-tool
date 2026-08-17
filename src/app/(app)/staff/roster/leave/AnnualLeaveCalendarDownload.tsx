"use client";

import { buildAnnualLeaveCalendarPdf, type LeaveEntry, type LegendEntry } from "@/lib/pdf/annualLeaveCalendar";

interface FlatLeaveEntry {
  date: string; // YYYY-MM-DD
  initials: string;
  leaveType: string;
}

function download(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function AnnualLeaveCalendarDownload({
  year,
  leaveEntries,
  legend,
}: {
  year: number;
  leaveEntries: FlatLeaveEntry[];
  legend: LegendEntry[];
}) {
  const handleBlank = () => {
    const bytes = buildAnnualLeaveCalendarPdf(year);
    download(bytes, `${year}-annual-leave-calendar-blank.pdf`);
  };

  const handleFilled = () => {
    const leaveByDate = new Map<string, LeaveEntry[]>();
    for (const e of leaveEntries) {
      const list = leaveByDate.get(e.date) ?? [];
      list.push({ initials: e.initials, leaveType: e.leaveType });
      leaveByDate.set(e.date, list);
    }
    const bytes = buildAnnualLeaveCalendarPdf(year, { leaveByDate, legend });
    download(bytes, `${year}-annual-leave-calendar.pdf`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={handleBlank}
        className="rounded-full border border-ink/20 px-4 py-2 text-sm font-semibold text-ink/70 transition-colors hover:bg-ink/5"
      >
        Download blank template
      </button>
      <button
        type="button"
        onClick={handleFilled}
        className="rounded-full bg-coral px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-coral-dark"
      >
        Download filled calendar ({year})
      </button>
    </div>
  );
}
