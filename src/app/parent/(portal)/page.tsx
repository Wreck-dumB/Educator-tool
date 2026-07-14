import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getChildren } from "@/lib/supabase/children";
import { cardClass } from "@/lib/ui";
import { markAllNotificationsRead } from "./actions";

const NOTIF_ICONS: Record<string, string> = {
  daily_summary: "📋",
  observation_shared: "👁️",
  new_message: "💬",
  permission_slip: "✍️",
  wall_post_approved: "📌",
  absence_acknowledged: "✅",
  broadcast_message: "📢",
  incident_update: "⚠️",
};

export default async function ParentDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [children, { data: notifications }] = await Promise.all([
    getChildren(),
    supabase
      .from("parent_notifications")
      .select("id, type, title, body, href, read_at, created_at")
      .eq("recipient_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const unread = (notifications ?? []).filter((n) => !n.read_at);

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {(notifications ?? []).length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">
              Updates
              {unread.length > 0 && (
                <span className="ml-2 inline-flex items-center rounded-full bg-coral px-2 py-0.5 text-xs font-bold text-white">
                  {unread.length} new
                </span>
              )}
            </h2>
            {unread.length > 0 && (
              <form action={markAllNotificationsRead}>
                <button
                  type="submit"
                  className="text-xs font-medium text-ink/40 hover:text-coral-dark"
                >
                  Mark all read
                </button>
              </form>
            )}
          </div>

          <ul className="space-y-2">
            {(notifications ?? []).map((n) => {
              const isUnread = !n.read_at;
              const inner = (
                <li
                  key={n.id}
                  className={`flex items-start gap-3 rounded-2xl border p-4 transition-colors ${
                    isUnread
                      ? "border-coral-light bg-coral-light/20"
                      : "border-coral-light/40 bg-white"
                  }`}
                >
                  <span className="mt-0.5 text-xl leading-none" aria-hidden>
                    {NOTIF_ICONS[n.type] ?? "🔔"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${isUnread ? "text-ink" : "text-ink/70"}`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="mt-0.5 text-xs text-ink/50">{n.body}</p>
                    )}
                    <p className="mt-1 text-[10px] text-ink/30">
                      {new Date(n.created_at).toLocaleDateString("en-AU", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {n.href && (
                    <span className="shrink-0 text-xs font-medium text-coral-dark">View →</span>
                  )}
                </li>
              );

              return n.href ? (
                <Link key={n.id} href={n.href}>
                  {inner}
                </Link>
              ) : (
                inner
              );
            })}
          </ul>
        </div>
      )}

      {/* Children */}
      <div>
        <h1 className="font-display text-3xl font-semibold text-coral-dark">Your children</h1>
        <p className="mt-1 text-sm text-ink/60">
          Linked profiles for the children your account has been invited to.
        </p>

        {children.length === 0 ? (
          <p className={`mt-4 p-5 text-sm text-ink/50 ${cardClass}`}>
            No children are linked to your account yet. Ask your child&apos;s educator for an invite
            link to get started.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {children.map((child) => (
              <li key={child.id} className={`p-4 ${cardClass}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-semibold text-ink">
                      🧒 {child.first_name}
                    </p>
                    {child.current_interests && (
                      <p className="mt-1 text-sm text-ink/60">
                        Interests: {child.current_interests}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/parent/diary?child=${child.id}`}
                    className="shrink-0 rounded-full border border-coral-light px-3 py-1 text-xs font-medium text-coral-dark hover:bg-coral-light"
                  >
                    Today&apos;s diary →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
