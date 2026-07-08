import type { Metadata } from "next";
import Link from "next/link";
import { getExcursions } from "@/lib/supabase/excursions";
import { getMyStaffRole } from "@/lib/supabase/staff";
import { cardClass, inputClass, primaryButtonClass, errorBannerClass } from "@/lib/ui";
import { createExcursion } from "./actions";

export const metadata: Metadata = { title: "Excursions · SparkPlay" };

export default async function ExcursionsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [excursions, myRole] = await Promise.all([getExcursions(), getMyStaffRole()]);
  const canManage = myRole === "director" || myRole === "2ic";

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = excursions.filter((e) => e.excursion_date >= today);
  const past = excursions.filter((e) => e.excursion_date < today);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Excursions</h1>
      <p className="mt-1 text-sm text-ink/60">
        Plan excursions with linked risk assessments, permission slips, and attendee lists.
      </p>

      {error && <p className={errorBannerClass}>{error}</p>}

      {canManage && (
        <div className={`mt-6 p-5 ${cardClass}`}>
          <h2 className="font-display text-sm font-semibold text-ink">Plan a new excursion</h2>
          <form action={createExcursion} className="mt-3 space-y-3">
            <input name="title" type="text" required placeholder="Excursion name (e.g. Botanic Gardens visit)" className={inputClass} />
            <input name="destination" type="text" required placeholder="Destination address or name" className={inputClass} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-ink/60">Date</label>
                <input name="excursion_date" type="date" required className={inputClass} />
              </div>
              <input name="transport_method" type="text" placeholder="Transport (e.g. bus, walking)" className={`${inputClass} mt-5`} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-ink/60">Departure time</label>
                <input name="departure_time" type="time" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink/60">Return time</label>
                <input name="return_time" type="time" className={inputClass} />
              </div>
            </div>
            <input name="supervisor_ratio" type="text" placeholder="Supervisor ratio (e.g. 1:4)" className={inputClass} />
            <textarea name="notes" rows={2} placeholder="Notes (optional)" className={inputClass} />
            <button type="submit" className={`w-full ${primaryButtonClass}`}>Create excursion</button>
          </form>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className={`mt-6 ${cardClass}`}>
          <div className="border-b border-coral-light px-4 py-3">
            <h2 className="font-display text-sm font-semibold text-ink">Upcoming</h2>
          </div>
          <ul className="divide-y divide-coral-light">
            {upcoming.map((e) => (
              <li key={e.id}>
                <Link href={`/excursions/${e.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-coral-light/30 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-ink">{e.title}</p>
                    <p className="text-xs text-ink/50">
                      {new Date(e.excursion_date + "T12:00:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}
                      {e.destination && ` · ${e.destination}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    {e.linked_risk_assessment_id && (
                      <span className="rounded-full bg-sage-light px-2 py-0.5 text-xs font-semibold text-sage-dark">RA</span>
                    )}
                    {e.linked_permission_slip_id && (
                      <span className="rounded-full bg-sage-light px-2 py-0.5 text-xs font-semibold text-sage-dark">Slip</span>
                    )}
                    <span className="text-xs text-coral-dark">View →</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {past.length > 0 && (
        <div className={`mt-4 ${cardClass}`}>
          <div className="border-b border-coral-light px-4 py-3">
            <h2 className="font-display text-sm font-semibold text-ink/50">Past excursions</h2>
          </div>
          <ul className="divide-y divide-coral-light">
            {past.slice(0, 10).map((e) => (
              <li key={e.id}>
                <Link href={`/excursions/${e.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-coral-light/30 transition-colors">
                  <div>
                    <p className="text-sm text-ink/70">{e.title}</p>
                    <p className="text-xs text-ink/40">
                      {new Date(e.excursion_date + "T12:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-coral-dark">View →</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {excursions.length === 0 && (
        <p className="mt-8 text-center text-sm text-ink/40">No excursions yet. Plan one above.</p>
      )}
    </div>
  );
}
