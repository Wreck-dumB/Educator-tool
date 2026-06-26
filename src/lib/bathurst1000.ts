import type { CulturalDay } from "@/lib/types/database.types";

// Always-included, non-negotiable calendar entry. Not dependent on the AI
// generator knowing about it or getting the date right - it's injected
// deterministically wherever cultural days are returned.
//
// Confirmed official race-day dates from Supercars' published championship
// calendar - add to this table once Supercars confirms a new year (usually
// 12-18 months ahead). Until then, the fallback below estimates from the
// recent "second Sunday of October" pattern, explicitly flagged as
// unconfirmed since the actual date HAS shifted before (e.g. 2000's Sydney
// Olympics clash, and a flagged possible 2027 shuffle around the Australian
// Grand Prix date) - this keeps an estimate honest rather than presented as fact.
const CONFIRMED_RACE_DAYS: Record<number, string> = {
  2025: "2025-10-12",
  2026: "2026-10-11",
};

function secondSundayOfOctober(year: number): string {
  const oct1 = new Date(year, 9, 1); // month 9 = October
  const firstSunday = 1 + ((7 - oct1.getDay()) % 7);
  const secondSunday = firstSunday + 7;
  return new Date(year, 9, secondSunday).toISOString().slice(0, 10);
}

export function getBathurst1000(year: number): CulturalDay {
  const confirmed = CONFIRMED_RACE_DAYS[year];
  return {
    name: "Bathurst 1000",
    date: confirmed ?? secondSundayOfOctober(year),
    origin: "Australia (Bathurst, NSW)",
    note: "\"The Great Race\" — Australia's biggest motor racing event, held annually at Mount Panorama.",
    confidence: confirmed ? "high" : "approximate",
  };
}

/** Bathurst 1000 entries (usually one) whose date falls within [startDate, endDate]. */
export function getBathurst1000InRange(startDate: string, endDate: string): CulturalDay[] {
  const startYear = new Date(startDate).getFullYear();
  const endYear = new Date(endDate).getFullYear();
  const results: CulturalDay[] = [];
  for (let year = startYear; year <= endYear; year++) {
    const day = getBathurst1000(year);
    if (day.date >= startDate && day.date <= endDate) results.push(day);
  }
  return results;
}

/** Merges in Bathurst 1000 for the range, replacing any AI-generated duplicate. */
export function withBathurst1000(days: CulturalDay[], startDate: string, endDate: string): CulturalDay[] {
  const withoutDuplicates = days.filter((d) => !d.name.toLowerCase().includes("bathurst"));
  return [...withoutDuplicates, ...getBathurst1000InRange(startDate, endDate)];
}
