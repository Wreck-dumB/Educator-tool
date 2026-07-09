import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getChildren } from "@/lib/supabase/children";
import { cardClass, inputClass, primaryButtonClass, errorBannerClass } from "@/lib/ui";
import { submitAbsence } from "./actions";

function todayAEST() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
}

function maxDateAEST() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
}

export default async function ParentAbsencesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const children = await getChildren();
  const today = todayAEST();

  // Fetch past submissions
  const { data: past } = await supabase
    .from("parent_absence_notifications")
    .select("id, child_id, absence_date, reason, acknowledged_at, created_at")
    .eq("parent_user_id", user.id)
    .order("absence_date", { ascending: false })
    .limit(20);

  const childNameById = new Map(children.map((c) => [c.id, c.first_name]));

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Report Absence</h1>
      <p className="mt-1 text-sm text-ink/60">
        Let the service know your child won&apos;t be in. You can notify up to 14 days in advance.
      </p>

      {params.error && <p className={`mt-4 ${errorBannerClass}`}>{params.error}</p>}
      {params.sent && (
        <div className="mt-4 rounded-2xl border border-sage bg-sage-light/40 px-4 py-3">
          <p className="text-sm font-semibold text-sage-dark">Absence notification sent successfully.</p>
        </div>
      )}

      {children.length === 0 ? (
        <p className={`mt-6 p-5 text-sm text-ink/50 ${cardClass}`}>
          No children are linked to your account yet.
        </p>
      ) : (
        <form action={submitAbsence} className={`mt-6 flex flex-col gap-4 p-5 ${cardClass}`}>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Child</label>
            {children.length === 1 ? (
              <>
                <p className="text-sm font-semibold text-ink">{children[0].first_name}</p>
                <input type="hidden" name="child_id" value={children[0].id} />
              </>
            ) : (
              <select name="child_id" required className={inputClass}>
                {children.map((c) => (
                  <option key={c.id} value={c.id}>{c.first_name}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Date of absence</label>
            <input
              type="date"
              name="absence_date"
              required
              defaultValue={today}
              min={today}
              max={maxDateAEST()}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Reason (optional)</label>
            <select name="reason" className={inputClass}>
              <option value="">Select a reason…</option>
              <option value="Sick">Sick</option>
              <option value="Family holiday">Family holiday</option>
              <option value="Medical appointment">Medical appointment</option>
              <option value="Public holiday">Public holiday</option>
              <option value="No longer attending">No longer attending this week</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <button type="submit" className={primaryButtonClass}>
            Send notification
          </button>
        </form>
      )}

      {past && past.length > 0 && (
        <div className={`mt-6 ${cardClass}`}>
          <div className="border-b border-coral-light px-4 py-3">
            <h2 className="font-display text-sm font-semibold text-ink">Recent notifications</h2>
          </div>
          <ul className="divide-y divide-coral-light">
            {past.map((n) => (
              <li key={n.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">
                    {childNameById.get(n.child_id) ?? "Child"} —{" "}
                    {new Date(n.absence_date + "T00:00:00").toLocaleDateString("en-AU", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                  {n.reason && <p className="text-xs text-ink/50">{n.reason}</p>}
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  n.acknowledged_at
                    ? "bg-sage-light text-sage-dark"
                    : "bg-ink/5 text-ink/50"
                }`}>
                  {n.acknowledged_at ? "Seen" : "Pending"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
