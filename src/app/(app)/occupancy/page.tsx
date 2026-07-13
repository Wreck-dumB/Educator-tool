import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { cardClass } from "@/lib/ui";
import SetCapacityForm from "./SetCapacityForm";

export const metadata: Metadata = { title: "Occupancy · DR. SparkPlay" };

function todayAEST() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
}

function ageLabel(months: number) {
  if (months < 12) return `${months}m`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m > 0 ? `${y}y ${m}m` : `${y}y`;
}

export default async function OccupancyPage() {
  const supabase = await createClient();
  const ownerUserId = await getMyServiceOwnerId();
  const today = todayAEST();

  const [roomsRes, childrenRes, attendanceRes] = await Promise.all([
    supabase.from("rooms").select("id, name, capacity, min_age_months, max_age_months, sort_order").order("sort_order").order("created_at"),
    supabase.from("children").select("id, first_name, date_of_birth, room_id"),
    ownerUserId
      ? supabase.from("attendance_records").select("child_id, status").eq("owner_user_id", ownerUserId).eq("date", today)
      : Promise.resolve({ data: [] }),
  ]);

  const rooms = roomsRes.data ?? [];
  const children = childrenRes.data ?? [];
  const attendance = (attendanceRes as { data: { child_id: string; status: string }[] | null }).data ?? [];

  const signedInIds = new Set(attendance.filter((a) => a.status === "signed_in").map((a) => a.child_id));
  const absentIds = new Set(attendance.filter((a) => a.status === "absent").map((a) => a.child_id));

  const enrolledByRoom = new Map<string | null, typeof children>();
  enrolledByRoom.set(null, []);
  rooms.forEach((r) => enrolledByRoom.set(r.id, []));
  children.forEach((c) => {
    const key = c.room_id ?? null;
    if (!enrolledByRoom.has(key)) enrolledByRoom.set(key, []);
    enrolledByRoom.get(key)!.push(c);
  });

  const totalEnrolled = children.length;
  const totalSignedIn = children.filter((c) => signedInIds.has(c.id)).length;
  const totalCapacity = rooms.reduce((s, r) => s + (r.capacity ?? 0), 0);
  const totalVacancies = totalCapacity > 0 ? Math.max(0, totalCapacity - totalEnrolled) : null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-coral-dark">Occupancy</h1>
          <p className="mt-1 text-sm text-ink/60">Enrolled vs capacity per room, and today&apos;s attendance.</p>
        </div>
        <Link href="/rooms" className="rounded-full border border-coral-light px-4 py-1.5 text-sm font-medium text-ink/60 hover:bg-coral-light transition-colors">
          Manage rooms →
        </Link>
      </div>

      {/* Service-level summary */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total enrolled", value: totalEnrolled, color: "text-coral-dark" },
          { label: "On site today", value: totalSignedIn, color: "text-sage-dark" },
          { label: "Total capacity", value: totalCapacity > 0 ? totalCapacity : "—", color: "text-ink" },
          { label: "Vacancies", value: totalVacancies !== null ? totalVacancies : "—", color: totalVacancies === 0 ? "text-coral-dark" : "text-sage-dark" },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-2xl border border-coral-light bg-white p-4 text-center ${cardClass}`}>
            <p className={`font-display text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-ink/40">{stat.label}</p>
          </div>
        ))}
      </div>

      {rooms.length === 0 ? (
        <div className={`mt-6 p-5 ${cardClass}`}>
          <p className="text-sm text-ink/50">No rooms set up yet.</p>
          <Link href="/rooms" className="mt-2 inline-block text-sm font-medium text-coral-dark hover:underline">
            Add rooms →
          </Link>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {rooms.map((room) => {
            const enrolled = enrolledByRoom.get(room.id) ?? [];
            const onSite = enrolled.filter((c) => signedInIds.has(c.id));
            const absent = enrolled.filter((c) => absentIds.has(c.id));
            const cap = room.capacity ?? null;
            const vacancies = cap !== null ? Math.max(0, cap - enrolled.length) : null;
            const fillPct = cap ? Math.min(100, Math.round((enrolled.length / cap) * 100)) : null;
            const overfull = cap !== null && enrolled.length > cap;

            return (
              <div key={room.id} className={`rounded-2xl border-2 p-4 ${overfull ? "border-coral bg-coral-light/20" : "border-coral-light bg-white"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-semibold text-ink">{room.name}</h2>
                    {(room.min_age_months != null || room.max_age_months != null) && (
                      <p className="text-xs text-ink/40">
                        {room.min_age_months != null ? ageLabel(room.min_age_months) : "0m"}
                        {" – "}
                        {room.max_age_months != null ? ageLabel(room.max_age_months) : "school age"}
                      </p>
                    )}
                  </div>
                  <SetCapacityForm roomId={room.id} currentCapacity={room.capacity ?? null} />
                </div>

                {/* Stats row */}
                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">Enrolled</p>
                    <p className={`text-2xl font-bold font-display ${overfull ? "text-coral-dark" : "text-ink"}`}>
                      {enrolled.length}{cap !== null ? <span className="text-sm font-normal text-ink/40">/{cap}</span> : null}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">On site</p>
                    <p className="text-2xl font-bold font-display text-sage-dark">{onSite.length}</p>
                  </div>
                  {vacancies !== null && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">Vacancies</p>
                      <p className={`text-2xl font-bold font-display ${vacancies === 0 ? "text-coral-dark" : "text-sage-dark"}`}>
                        {vacancies}
                      </p>
                    </div>
                  )}
                  {absent.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">Absent</p>
                      <p className="text-2xl font-bold font-display text-amber-600">{absent.length}</p>
                    </div>
                  )}
                </div>

                {/* Fill bar */}
                {fillPct !== null && (
                  <div className="mt-3">
                    <div className="h-2 w-full rounded-full bg-ink/10">
                      <div
                        className={`h-2 rounded-full transition-all ${overfull ? "bg-coral" : fillPct >= 80 ? "bg-amber-400" : "bg-sage"}`}
                        style={{ width: `${Math.min(100, fillPct)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-ink/40">{fillPct}% full</p>
                  </div>
                )}

                {/* Children list */}
                {enrolled.length > 0 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-semibold text-coral-dark hover:underline">
                      Show {enrolled.length} enrolled children
                    </summary>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {enrolled.map((c) => (
                        <Link
                          key={c.id}
                          href={`/children/${c.id}`}
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            signedInIds.has(c.id)
                              ? "bg-sage-light text-sage-dark"
                              : absentIds.has(c.id)
                              ? "bg-ink/5 text-ink/40 line-through"
                              : "bg-coral-light text-coral-dark"
                          }`}
                        >
                          {c.first_name}
                        </Link>
                      ))}
                    </div>
                    <p className="mt-1 text-[10px] text-ink/30">Green = on site · Red = not yet arrived · Strikethrough = absent</p>
                  </details>
                )}

                {overfull && (
                  <p className="mt-2 text-xs font-semibold text-coral-dark">
                    Over capacity by {enrolled.length - (cap ?? 0)} — review enrolment or update capacity.
                  </p>
                )}
              </div>
            );
          })}

          {/* Unassigned */}
          {(enrolledByRoom.get(null)?.length ?? 0) > 0 && (
            <div className={`rounded-2xl border border-ink/10 bg-white p-4 ${cardClass}`}>
              <h2 className="font-display text-lg font-semibold text-ink/50">Unassigned room</h2>
              <p className="text-sm text-ink/40">{enrolledByRoom.get(null)!.length} children have no room assigned.</p>
              <Link href="/children" className="mt-1 text-xs text-coral-dark hover:underline">
                Assign rooms →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
