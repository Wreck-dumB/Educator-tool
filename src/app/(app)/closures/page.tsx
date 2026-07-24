import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { getMyStaffRole } from "@/lib/supabase/staff";
import { addClosure, deleteClosure } from "./actions";
import { cardClass, inputClass, primaryButtonClass, errorBannerClass } from "@/lib/ui";

const TYPE_LABELS: Record<string, string> = {
  public_holiday: "Public Holiday",
  pupil_free: "Pupil-Free / Staff Day",
  emergency: "Emergency Closure",
  maintenance: "Maintenance",
  other: "Other",
};

const TYPE_COLOURS: Record<string, string> = {
  public_holiday: "bg-sage-light text-sage-dark",
  pupil_free: "bg-amber-100 text-amber-800",
  emergency: "bg-coral/15 text-coral-dark",
  maintenance: "bg-ink/10 text-ink/70",
  other: "bg-ink/10 text-ink/70",
};

export default async function ClosuresPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/onboarding");

  const myRole = await getMyStaffRole();
  const canEdit = myRole === "director" || myRole === "2ic";

  const today = new Date().toISOString().slice(0, 10);

  const { data: closures } = await supabase
    .from("service_closures")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .gte("closure_date", today)
    .order("closure_date");

  const { data: pastClosures } = await supabase
    .from("service_closures")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .lt("closure_date", today)
    .order("closure_date", { ascending: false })
    .limit(20);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Service Closures</h1>
        <p className="mt-1 text-sm text-ink/50">
          Record public holidays, pupil-free days, and other closures. Affects casual day booking availability.
        </p>
      </div>

      {canEdit && (
        <div className={cardClass + " p-5"}>
          <h2 className="font-display text-base font-semibold text-ink mb-4">Add closure</h2>
          {error && <p className={`mb-3 ${errorBannerClass}`}>{error}</p>}
          <form action={addClosure} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1">Date</label>
                <input type="date" name="closure_date" required min={today} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1">Type</label>
                <select name="closure_type" className={inputClass}>
                  <option value="public_holiday">Public Holiday</option>
                  <option value="pupil_free">Pupil-Free / Staff Day</option>
                  <option value="emergency">Emergency Closure</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink/70 mb-1">Reason (optional)</label>
              <input type="text" name="reason" placeholder="e.g. Australia Day, Teacher planning day" className={inputClass} />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink/70">
              <input type="checkbox" name="affects_casual_days" value="1" defaultChecked className="rounded" />
              Block casual day bookings on this date
            </label>
            <button type="submit" className={primaryButtonClass}>Add closure</button>
          </form>
        </div>
      )}

      <div className={cardClass + " p-5"}>
        <h2 className="font-display text-base font-semibold text-ink mb-4">Upcoming closures</h2>
        {(closures ?? []).length === 0 ? (
          <p className="text-sm text-ink/40">No upcoming closures recorded.</p>
        ) : (
          <ul className="space-y-3">
            {(closures ?? []).map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="text-center min-w-[48px]">
                    <p className="text-xs font-semibold text-ink/40 uppercase">
                      {new Date(c.closure_date).toLocaleDateString("en-AU", { month: "short" })}
                    </p>
                    <p className="text-xl font-bold text-ink leading-none">
                      {new Date(c.closure_date).toLocaleDateString("en-AU", { day: "numeric" })}
                    </p>
                  </div>
                  <div>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_COLOURS[c.closure_type] ?? TYPE_COLOURS.other}`}>
                      {TYPE_LABELS[c.closure_type] ?? c.closure_type}
                    </span>
                    {c.reason && <p className="mt-0.5 text-sm text-ink/70">{c.reason}</p>}
                    {c.affects_casual_days && (
                      <p className="text-xs text-ink/40">Casual bookings blocked</p>
                    )}
                  </div>
                </div>
                {canEdit && (
                  <form action={deleteClosure.bind(null, c.id)}>
                    <button type="submit" className="text-xs text-coral-dark hover:underline">Remove</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {(pastClosures ?? []).length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-ink/50 hover:text-ink">
            Past closures (last 20)
          </summary>
          <ul className="mt-3 space-y-2 pl-2">
            {(pastClosures ?? []).map((c) => (
              <li key={c.id} className="flex items-center gap-2 text-sm text-ink/60">
                <span>{new Date(c.closure_date).toLocaleDateString("en-AU")}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${TYPE_COLOURS[c.closure_type] ?? TYPE_COLOURS.other}`}>
                  {TYPE_LABELS[c.closure_type]}
                </span>
                {c.reason && <span>{c.reason}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
