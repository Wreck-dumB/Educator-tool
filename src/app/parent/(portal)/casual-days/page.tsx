import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getChildren } from "@/lib/supabase/children";
import { cardClass, inputClass, primaryButtonClass, errorBannerClass } from "@/lib/ui";
import { submitCasualDayRequest } from "./actions";

function todayAEST() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
}

const SESSION_LABELS: Record<string, string> = {
  full_day: "Full day",
  morning: "Morning session",
  afternoon: "Afternoon session",
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", cls: "bg-sage-light text-sage-dark" },
  declined: { label: "Declined", cls: "bg-coral-light text-coral-dark" },
};

export default async function ParentCasualDaysPage({
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

  const { data: requests } = await supabase
    .from("casual_day_requests")
    .select("id, child_id, requested_date, session_type, notes, status, response_note, responded_at")
    .eq("parent_user_id", user.id)
    .order("requested_date", { ascending: false })
    .limit(30);

  const childNameById = new Map(children.map((c) => [c.id, c.first_name]));

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Request a Casual Day</h1>
      <p className="mt-1 text-sm text-ink/60">
        Ask the service if your child can attend on a day they&apos;re not regularly enrolled. The educator will approve or decline.
      </p>

      {params.error && <p className={`mt-4 ${errorBannerClass}`}>{params.error}</p>}
      {params.sent && (
        <div className="mt-4 rounded-2xl border border-sage bg-sage-light/40 px-4 py-3">
          <p className="text-sm font-semibold text-sage-dark">Request submitted. You&apos;ll see the response here.</p>
        </div>
      )}

      {children.length === 0 ? (
        <p className={`mt-6 p-5 text-sm text-ink/50 ${cardClass}`}>No children linked yet.</p>
      ) : (
        <form action={submitCasualDayRequest} className={`mt-6 flex flex-col gap-4 p-5 ${cardClass}`}>
          {children.length === 1 ? (
            <input type="hidden" name="child_id" value={children[0].id} />
          ) : (
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Child</label>
              <select name="child_id" required className={inputClass}>
                {children.map((c) => (
                  <option key={c.id} value={c.id}>{c.first_name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Date requested</label>
            <input type="date" name="requested_date" required min={today} className={inputClass} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Session</label>
            <select name="session_type" className={inputClass}>
              <option value="full_day">Full day</option>
              <option value="morning">Morning session</option>
              <option value="afternoon">Afternoon session</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Notes (optional)</label>
            <input type="text" name="notes" placeholder="Any extra information for the educator" className={inputClass} />
          </div>

          <button type="submit" className={primaryButtonClass}>Send request</button>
        </form>
      )}

      {requests && requests.length > 0 && (
        <div className={`mt-6 ${cardClass}`}>
          <div className="border-b border-coral-light px-4 py-3">
            <h2 className="font-display text-sm font-semibold text-ink">Your requests</h2>
          </div>
          <ul className="divide-y divide-coral-light">
            {requests.map((r) => {
              const badge = STATUS_LABELS[r.status] ?? { label: r.status, cls: "bg-ink/5 text-ink/50" };
              return (
                <li key={r.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {childNameById.get(r.child_id) ?? "Child"} —{" "}
                        {new Date(r.requested_date + "T00:00:00").toLocaleDateString("en-AU", {
                          weekday: "short", day: "numeric", month: "short",
                        })}
                      </p>
                      <p className="text-xs text-ink/40">{SESSION_LABELS[r.session_type] ?? r.session_type}</p>
                      {r.notes && <p className="mt-0.5 text-xs text-ink/50">{r.notes}</p>}
                      {r.response_note && (
                        <p className="mt-1 text-xs font-medium text-ink/70">Educator: &ldquo;{r.response_note}&rdquo;</p>
                      )}
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
