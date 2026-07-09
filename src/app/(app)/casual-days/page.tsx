import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { cardClass, errorBannerClass } from "@/lib/ui";
import { respondToCasualDayRequest } from "./actions";

function todayAEST() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
}

const SESSION_LABELS: Record<string, string> = {
  full_day: "Full day",
  morning: "Morning session",
  afternoon: "Afternoon session",
};

export default async function CasualDaysPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; tab?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/generate");

  const today = todayAEST();
  const tab = params.tab ?? "pending";

  const [pendingRes, historicalRes, childrenRes, profilesRes] = await Promise.all([
    supabase
      .from("casual_day_requests")
      .select("id, child_id, parent_user_id, requested_date, session_type, notes, created_at")
      .eq("educator_user_id", ownerUserId)
      .eq("status", "pending")
      .gte("requested_date", today)
      .order("requested_date"),
    supabase
      .from("casual_day_requests")
      .select("id, child_id, parent_user_id, requested_date, session_type, notes, status, response_note, responded_at")
      .eq("educator_user_id", ownerUserId)
      .in("status", ["approved", "declined"])
      .order("requested_date", { ascending: false })
      .limit(40),
    supabase.from("children").select("id, first_name").eq("owner_user_id", ownerUserId),
    supabase.from("profiles").select("id, display_name").eq("role", "parent"),
  ]);

  const pending = pendingRes.data ?? [];
  const historical = historicalRes.data ?? [];
  const childNameById = new Map((childrenRes.data ?? []).map((c) => [c.id, c.first_name]));
  const parentNameById = new Map((profilesRes.data ?? []).map((p) => [p.id, p.display_name]));

  const tabs = [
    { key: "pending", label: `Pending (${pending.length})` },
    { key: "history", label: "History" },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Casual Day Requests</h1>
      <p className="mt-1 text-sm text-ink/60">
        Parents request extra attendance days here. Approve or decline below.
      </p>

      {params.error && <p className={`mt-4 ${errorBannerClass}`}>{params.error}</p>}

      {/* Tabs */}
      <div className="mt-5 flex gap-2 border-b border-coral-light pb-0">
        {tabs.map((t) => (
          <a
            key={t.key}
            href={`/casual-days?tab=${t.key}`}
            className={`-mb-px rounded-t-lg border border-b-0 px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t.key
                ? "border-coral-light bg-white text-coral-dark"
                : "border-transparent text-ink/40 hover:text-coral-dark"
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>

      {tab === "pending" && (
        <>
          {pending.length === 0 ? (
            <p className={`mt-6 p-5 text-sm text-ink/50 ${cardClass}`}>
              No pending casual day requests.
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-4">
              {pending.map((r) => (
                <div key={r.id} className={`${cardClass} p-5`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">
                        {childNameById.get(r.child_id) ?? "Unknown child"}
                      </p>
                      <p className="text-sm text-ink/60">
                        {new Date(r.requested_date + "T00:00:00").toLocaleDateString("en-AU", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}{" "}
                        · {SESSION_LABELS[r.session_type] ?? r.session_type}
                      </p>
                      <p className="text-xs text-ink/40">
                        From: {parentNameById.get(r.parent_user_id) ?? "Parent"}
                      </p>
                      {r.notes && (
                        <p className="mt-1 text-sm text-ink/70">
                          &ldquo;{r.notes}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  <form action={respondToCasualDayRequest} className="mt-4 flex flex-col gap-3">
                    <input type="hidden" name="id" value={r.id} />
                    <div>
                      <label className="mb-1 block text-xs font-medium text-ink/60">
                        Response note (optional)
                      </label>
                      <input
                        type="text"
                        name="response_note"
                        placeholder="e.g. Great, we have a spot available"
                        className="w-full rounded-xl border border-coral-light bg-white px-3 py-2 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        name="status"
                        value="approved"
                        className="flex-1 rounded-xl bg-sage px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                      >
                        Approve
                      </button>
                      <button
                        type="submit"
                        name="status"
                        value="declined"
                        className="flex-1 rounded-xl border border-coral-light px-4 py-2 text-sm font-semibold text-coral-dark hover:bg-coral-light"
                      >
                        Decline
                      </button>
                    </div>
                  </form>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "history" && (
        <>
          {historical.length === 0 ? (
            <p className={`mt-6 p-5 text-sm text-ink/50 ${cardClass}`}>No past requests yet.</p>
          ) : (
            <div className={`mt-4 ${cardClass}`}>
              <ul className="divide-y divide-coral-light">
                {historical.map((r) => (
                  <li key={r.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-ink">
                          {childNameById.get(r.child_id) ?? "Unknown"} —{" "}
                          {new Date(r.requested_date + "T00:00:00").toLocaleDateString("en-AU", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                        <p className="text-xs text-ink/40">
                          {SESSION_LABELS[r.session_type] ?? r.session_type} ·{" "}
                          {parentNameById.get(r.parent_user_id) ?? "Parent"}
                        </p>
                        {r.response_note && (
                          <p className="mt-0.5 text-xs text-ink/60">Note: {r.response_note}</p>
                        )}
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          r.status === "approved"
                            ? "bg-sage-light text-sage-dark"
                            : "bg-coral-light text-coral-dark"
                        }`}
                      >
                        {r.status === "approved" ? "Approved" : "Declined"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
