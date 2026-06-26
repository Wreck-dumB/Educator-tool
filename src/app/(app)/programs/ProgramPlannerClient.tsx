"use client";

import { useRef, useState } from "react";
import type { CulturalDay } from "@/lib/types/database.types";
import CulturalCalendar from "./CulturalCalendar";
import ProgramBuilderForm from "./ProgramBuilderForm";

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function ProgramPlannerClient() {
  const [prefill, setPrefill] = useState<{ start: string; end: string; notes: string } | null>(null);
  const [prefillKey, setPrefillKey] = useState(0);
  const formRef = useRef<HTMLDivElement>(null);

  function handleDayClick(date: string, events: CulturalDay[]) {
    const names = events.map((e) => `${e.name} (${e.origin})`).join("; ");
    setPrefill({
      start: date,
      end: addDays(date, 4),
      notes: `Build around: ${names}`,
    });
    setPrefillKey((k) => k + 1);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <div className="mt-6">
        <CulturalCalendar onDayClick={handleDayClick} />
      </div>
      <div ref={formRef} className="mt-6">
        <ProgramBuilderForm
          key={prefillKey}
          initialStartDate={prefill?.start}
          initialEndDate={prefill?.end}
          initialNotes={prefill?.notes}
        />
      </div>
    </>
  );
}
