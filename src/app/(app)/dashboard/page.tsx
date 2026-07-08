import type { Metadata } from "next";
import Link from "next/link";
import { getChildren } from "@/lib/supabase/children";
import { getAttendanceForDate } from "@/lib/supabase/attendance";
import { getRooms, getRoomStaffCountsForDate } from "@/lib/supabase/rooms";
import { getObservations } from "@/lib/supabase/observations";
import { getIncidentAlerts } from "@/lib/supabase/incidents";
import { cardClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Dashboard · SparkPlay" };

const RATIO_TIERS = [
  { maxMonths: 24, ratio: 4 },
  { maxMonths: 36, ratio: 5 },
  { maxMonths: 72, ratio: 11 },
  { maxMonths: Infinity, ratio: 15 },
];

function ageInMonths(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  return (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
}

function requiredEducators(children: { date_of_birth: string | null }[]): number {
  if (children.length === 0) return 0;
  const sum = children.reduce((acc, c) => {
    const months = ageInMonths(c.date_of_birth);
    const tier = RATIO_TIERS.find((t) => months === null || months < t.maxMonths) ?? RATIO_TIERS[RATIO_TIERS.length - 1];
    return acc + 1 / tier.ratio;
  }, 0);
  return Math.ceil(sum);
}

function todayLocal() {
  return new Date().toISOString().slice(0, 10);
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const date = todayLocal();
  const [children, records, rooms, staffCounts, recentObs, incidentAlerts] = await Promise.all([
    getChildren(),
    getAttendanceForDate(date),
    getRooms(),
    getRoomStaffCountsForDate(date),
    getObservations(),
    getIncidentAlerts(),
  ]);

  const signedIn = records.filter((r) => r.status === "signed_in");
  const signedInIds = new Set(signedIn.map((r) => r.child_id));
  const signedInChildren = children.filter((c) => signedInIds.has(c.id));

  const totalRequired = requiredEducators(signedInChildren);
  const totalStaff = staffCounts.reduce((s, c) => s + c.staff_count, 0);
  const inRatio = totalStaff >= totalRequired;

  const thisWeekStart = new Date();
  thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
  const obsThisWeek = recentObs.filter(
    (o) => new Date(o.observed_at) >= thisWeekStart
  );

  const childrenWithoutObsThisWeek = children.filter(
    (c) => !obsThisWeek.some((o) => o.child_id === c.id)
  );

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-coral-dark">{greeting()}</h1>
        <p className="mt-1 text-sm text-ink/60">{new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}</p>
      </div>

      {/* Attendance summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Link href="/attendance" className={`${cardClass} p-4 hover:border-coral transition-colors`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/40">On premises</p>
          <p className="mt-1 font-display text-4xl font-bold text-coral-dark">{signedIn.length}</p>
          <p className="text-xs text-ink/50">of {children.length} enrolled</p>
        </Link>

        <Link href="/attendance" className={`${cardClass} p-4 hover:border-coral transition-colors`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/40">Ratio</p>
          <p className={`mt-1 font-display text-4xl font-bold ${inRatio ? "text-sage-dark" : "text-coral-dark"}`}>
            {totalStaff}/{totalRequired}
          </p>
          <p className={`text-xs font-medium ${inRatio ? "text-sage-dark" : "text-coral-dark"}`}>
            {signedIn.length === 0 ? "No children in" : inRatio ? "In ratio" : "Under ratio"}
          </p>
        </Link>

        <Link href="/observations" className={`${cardClass} p-4 hover:border-coral transition-colors sm:block hidden`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/40">Obs this week</p>
          <p className="mt-1 font-display text-4xl font-bold text-coral-dark">{obsThisWeek.length}</p>
          <p className="text-xs text-ink/50">across {new Set(obsThisWeek.map((o) => o.child_id)).size} children</p>
        </Link>
      </div>

      {/* Rooms summary */}
      {rooms.length > 0 && (
        <div className={`mt-4 ${cardClass} p-4`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-sm font-semibold text-ink">Rooms today</h2>
            <Link href="/attendance" className="text-xs text-coral-dark hover:underline">Roll call →</Link>
          </div>
          <div className="space-y-2">
            {rooms.map((room) => {
              const roomChildren = signedInChildren.filter((c) => c.room_id === room.id);
              const staffCount = staffCounts.find((s) => s.room_id === room.id)?.staff_count ?? 0;
              const req = requiredEducators(roomChildren);
              const ok = staffCount >= req || roomChildren.length === 0;
              return (
                <div key={room.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-ink">{room.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-ink/50">{roomChildren.length} children</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ok ? "bg-sage-light text-sage-dark" : "bg-coral-light text-coral-dark"}`}>
                      {staffCount}/{req} staff
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Behaviour pattern alerts */}
      {incidentAlerts.length > 0 && (
        <div className={`mt-4 border-l-4 border-coral bg-coral-light/40 p-4 rounded-2xl`}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display text-sm font-semibold text-coral-dark">Behaviour frequency alert</h2>
            <Link href="/incident-reports" className="text-xs text-coral-dark hover:underline">View incidents →</Link>
          </div>
          <p className="text-xs text-ink/60 mb-3">
            These children have had an elevated number of incidents recently. Visit their support page for tailored strategies.
          </p>
          <div className="space-y-2">
            {incidentAlerts.map((alert) => (
              <div key={alert.childId} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink">{alert.childName}</span>
                  <span className="text-xs text-ink/50">
                    {alert.count7d > 0 && `${alert.count7d} in 7d`}
                    {alert.count7d > 0 && alert.count30d > alert.count7d && " · "}
                    {alert.count30d > alert.count7d && `${alert.count30d} in 30d`}
                  </span>
                </div>
                <Link
                  href={`/children/${alert.childId}/support`}
                  className="shrink-0 rounded-full bg-coral px-3 py-1 text-xs font-semibold text-white hover:bg-coral-dark transition-colors"
                >
                  Support →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Children not yet observed this week */}
      {childrenWithoutObsThisWeek.length > 0 && (
        <div className={`mt-4 ${cardClass} p-4`}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display text-sm font-semibold text-ink">No observation yet this week</h2>
            <Link href="/observations" className="text-xs text-coral-dark hover:underline">Log one →</Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {childrenWithoutObsThisWeek.map((c) => (
              <Link
                key={c.id}
                href={`/observations?child=${c.id}`}
                className="rounded-full bg-amber-light px-3 py-1 text-xs font-medium text-amber-dark hover:bg-amber/20"
              >
                {c.first_name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className={`mt-4 ${cardClass} p-4`}>
        <h2 className="font-display text-sm font-semibold text-ink mb-3">Quick actions</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            { href: "/generate", icon: "✨", label: "Generate activity" },
            { href: "/observations", icon: "📝", label: "Log observation" },
            { href: "/attendance", icon: "📋", label: "Roll call" },
            { href: "/sleep", icon: "😴", label: "Sleep chart" },
            { href: "/food", icon: "🍎", label: "Food chart" },
            { href: "/nappy", icon: "🧷", label: "Nappy chart" },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center gap-2 rounded-xl border border-coral-light px-3 py-2.5 text-sm font-medium text-ink/70 hover:border-coral hover:text-coral-dark transition-colors"
            >
              <span aria-hidden>{action.icon}</span>
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Recent observations */}
      {recentObs.length > 0 && (
        <div className={`mt-4 ${cardClass}`}>
          <div className="flex items-center justify-between border-b border-coral-light px-4 py-3">
            <h2 className="font-display text-sm font-semibold text-ink">Recent observations</h2>
            <Link href="/observations" className="text-xs text-coral-dark hover:underline">All →</Link>
          </div>
          <ul className="divide-y divide-coral-light">
            {recentObs.slice(0, 5).map((o) => (
              <li key={o.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink">{o.child_name}</p>
                  <p className="shrink-0 text-xs text-ink/40">{new Date(o.observed_at).toLocaleDateString()}</p>
                </div>
                <p className="mt-0.5 line-clamp-2 text-sm text-ink/70">{o.note_text}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
