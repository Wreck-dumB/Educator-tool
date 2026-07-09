"use client";

import { useState } from "react";
import { cardClass, inputClass } from "@/lib/ui";

// 2024–25 CCS Hourly Rate Caps (approximate) — updated annually by Services Australia
const RATE_CAPS: Record<string, number> = {
  centre_based_day_care: 14.29,
  family_day_care: 12.56,
  outside_school_hours: 13.73,
  in_home_care: 41.50,
};

const CARE_TYPE_LABELS: Record<string, string> = {
  centre_based_day_care: "Centre-based day care (CBDC)",
  family_day_care: "Family day care (FDC)",
  outside_school_hours: "Outside school hours care (OSHC)",
  in_home_care: "In-home care (IHC)",
};

function fmt(n: number) {
  return `$${n.toFixed(2)}`;
}

export default function CcsCalculator() {
  const [careType, setCareType] = useState("centre_based_day_care");
  const [sessionFee, setSessionFee] = useState("");
  const [sessionHours, setSessionHours] = useState("10");
  const [ccsPercent, setCcsPercent] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState("3");
  const [weeksPerYear, setWeeksPerYear] = useState("48");

  const rateCap = RATE_CAPS[careType] ?? 14.29;
  const fee = parseFloat(sessionFee) || 0;
  const hours = parseFloat(sessionHours) || 10;
  const ccs = parseFloat(ccsPercent) || 0;
  const days = parseFloat(daysPerWeek) || 5;
  const weeks = parseFloat(weeksPerYear) || 48;

  const hourlyFee = fee / hours;
  const cappedHourlyFee = Math.min(hourlyFee, rateCap);
  const ccsAmountPerHour = cappedHourlyFee * (ccs / 100);
  const ccsAmountPerSession = ccsAmountPerHour * hours;
  const gapPerSession = Math.max(fee - ccsAmountPerSession, 0);

  const weeklyGap = gapPerSession * days;
  const annualGap = weeklyGap * weeks;
  const annualCcsBenefit = ccsAmountPerSession * days * weeks;

  const isCapped = hourlyFee > rateCap;
  const hasValues = fee > 0 && ccs > 0;

  return (
    <div className="mt-6 flex flex-col gap-5">
      {/* Inputs */}
      <div className={`${cardClass} p-5`}>
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Care type</label>
            <select value={careType} onChange={(e) => setCareType(e.target.value)} className={inputClass}>
              {Object.entries(CARE_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink/40">
              Hourly Rate Cap: <span className="font-semibold">{fmt(rateCap)}/hr</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Session fee ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 135.00"
                value={sessionFee}
                onChange={(e) => setSessionFee(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Session hours</label>
              <input
                type="number"
                min="1"
                max="24"
                step="0.5"
                value={sessionHours}
                onChange={(e) => setSessionHours(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink">
              Family&apos;s CCS percentage (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              placeholder="e.g. 75"
              value={ccsPercent}
              onChange={(e) => setCcsPercent(e.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-ink/40">
              Found in the family&apos;s CCS entitlement notice from myGov / Services Australia.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Days per week</label>
              <input
                type="number"
                min="1"
                max="7"
                step="0.5"
                value={daysPerWeek}
                onChange={(e) => setDaysPerWeek(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Weeks per year</label>
              <input
                type="number"
                min="1"
                max="52"
                value={weeksPerYear}
                onChange={(e) => setWeeksPerYear(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {hasValues && (
        <div className={`${cardClass} overflow-hidden`}>
          <div className="border-b border-coral-light px-4 py-3">
            <h2 className="font-display text-sm font-semibold text-ink">Estimate</h2>
          </div>

          {isCapped && (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold text-amber-800">
                Rate cap applied — your hourly fee ({fmt(hourlyFee)}/hr) exceeds the cap ({fmt(rateCap)}/hr).
                CCS is calculated on the capped amount; the gap above the cap is fully out-of-pocket.
              </p>
            </div>
          )}

          <dl className="divide-y divide-coral-light">
            <Row label="Hourly fee" value={fmt(hourlyFee) + "/hr"} sub={isCapped ? `Capped at ${fmt(rateCap)}/hr for CCS` : undefined} />
            <Row label={`CCS amount (${ccs}% of ${fmt(cappedHourlyFee)}/hr × ${hours}h)`} value={fmt(ccsAmountPerSession)} />
            <Row label="Gap fee per session" value={fmt(gapPerSession)} highlight />
            <Row label={`Weekly gap (${days}d/wk)`} value={fmt(weeklyGap)} />
            <Row label={`Annual gap (${weeks} wks)`} value={fmt(annualGap)} />
            <Row label={`Annual CCS benefit (${weeks} wks)`} value={fmt(annualCcsBenefit)} sub="Approximate — actual benefit may vary" />
          </dl>
        </div>
      )}

      <div className="rounded-2xl border border-ink/10 bg-ink/5 px-4 py-3">
        <p className="text-xs text-ink/50">
          <strong>Disclaimer:</strong> These figures are estimates for planning purposes only. Actual CCS is
          calculated by Services Australia based on the family&apos;s assessed income, activity test result, and
          the official Hourly Rate Cap in force at the time. Rate caps shown are approximate for 2024–25 and are
          updated annually. Always direct families to myGov or Services Australia for their actual entitlement.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, highlight, sub }: { label: string; value: string; highlight?: boolean; sub?: string }) {
  return (
    <div className={`flex items-start justify-between gap-4 px-4 py-3 ${highlight ? "bg-coral-light/30" : ""}`}>
      <div>
        <p className={`text-sm ${highlight ? "font-semibold text-coral-dark" : "text-ink/70"}`}>{label}</p>
        {sub && <p className="text-xs text-ink/40">{sub}</p>}
      </div>
      <p className={`shrink-0 text-sm font-bold ${highlight ? "text-coral-dark" : "text-ink"}`}>{value}</p>
    </div>
  );
}
