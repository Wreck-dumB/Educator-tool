import type { Metadata } from "next";
import { getChildren } from "@/lib/supabase/children";
import { getSleepForDate } from "@/lib/supabase/dailyCare";
import { cardClass, inputClass, primaryButtonClass } from "@/lib/ui";
import { addSleepRecord, updateSleepEnd, deleteSleepRecord } from "./actions";

export const metadata: Metadata = { title: "Sleep Chart · SparkPlay" };

function todayLocal() {
  return new Date().toISOString().slice(0, 10);
}

export default async function SleepPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: rawDate } = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate ?? "") ? rawDate! : todayLocal();
  const isToday = date === todayLocal();

  const [children, records] = await Promise.all([getChildren(), getSleepForDate(date)]);

  const byChild = new Map<string, typeof records>();
  for (const r of records) {
    const arr = byChild.get(r.child_id) ?? [];
    arr.push(r);
    byChild.set(r.child_id, arr);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div>
        <h1 className="font-display text-3xl font-semibold text-coral-dark">Sleep Chart</h1>
        <p className="mt-1 text-sm text-ink/60">Record sleep and rest periods for each child.</p>
      </div>

      {/* Date picker */}
      <div className={`mt-5 flex items-center gap-3 p-4 ${cardClass} print:hidden`}>
        <label htmlFor="sleep-date" className="text-sm font-medium text-ink/70 shrink-0">Date</label>
        <form className="flex flex-1 items-center gap-2">
          <input
            id="sleep-date"
            name="date"
            type="date"
            defaultValue={date}
            className="flex-1 rounded-xl border border-coral-light bg-white px-3 py-1.5 text-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
          />
          <button type="submit" className="rounded-full bg-coral px-4 py-1.5 text-sm font-semibold text-white hover:bg-coral-dark">
            Go
          </button>
        </form>
        {isToday && (
          <span className="shrink-0 rounded-full bg-sage-light px-2.5 py-0.5 text-xs font-semibold text-sage-dark">Today</span>
        )}
      </div>

      {children.length === 0 && (
        <p className="mt-6 text-sm text-ink/50">Add children first to use the sleep chart.</p>
      )}

      <div className="mt-4 space-y-4">
        {children.map((child) => {
          const childRecords = byChild.get(child.id) ?? [];
          return (
            <div key={child.id} className={cardClass}>
              <div className="border-b border-coral-light px-4 py-3">
                <h2 className="font-display font-semibold text-ink">{child.first_name}</h2>
              </div>

              {/* Existing records */}
              {childRecords.length > 0 && (
                <ul className="divide-y divide-coral-light/50">
                  {childRecords.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <span className="font-medium tabular-nums text-ink">{r.sleep_start}</span>
                      <span className="text-ink/40">→</span>
                      {r.sleep_end ? (
                        <span className="tabular-nums text-ink/70">{r.sleep_end}</span>
                      ) : (
                        <form action={updateSleepEnd} className="flex items-center gap-1.5">
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="date" value={date} />
                          <input
                            type="time"
                            name="sleep_end"
                            className="rounded border border-coral-light px-2 py-0.5 text-xs"
                          />
                          <button type="submit" className="text-xs font-medium text-sage-dark hover:underline">
                            Wake
                          </button>
                        </form>
                      )}
                      {r.notes && <span className="ml-auto text-xs text-ink/40">{r.notes}</span>}
                      <form action={deleteSleepRecord}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="date" value={date} />
                        <button type="submit" className="text-xs text-ink/30 hover:text-coral-dark" title="Remove">×</button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}

              {/* Add new record */}
              <form action={addSleepRecord} className="flex flex-wrap items-end gap-3 p-4">
                <input type="hidden" name="child_id" value={child.id} />
                <input type="hidden" name="date" value={date} />
                <div>
                  <label className="block text-xs font-medium text-ink/50">Sleep start</label>
                  <input type="time" name="sleep_start" required className={`${inputClass} w-32 py-1`} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink/50">Sleep end (optional)</label>
                  <input type="time" name="sleep_end" className={`${inputClass} w-32 py-1`} />
                </div>
                <div className="flex-1 min-w-32">
                  <label className="block text-xs font-medium text-ink/50">Notes</label>
                  <input type="text" name="notes" placeholder="e.g. settled quickly" className={`${inputClass} py-1`} />
                </div>
                <button type="submit" className={`${primaryButtonClass} py-1.5 shrink-0`}>
                  + Add
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
