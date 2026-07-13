import type { Metadata } from "next";
import Link from "next/link";
import { getRooms } from "@/lib/supabase/rooms";
import { getChildren } from "@/lib/supabase/children";
import { getChildIncidentReports } from "@/lib/supabase/incidents";
import { cardClass, inputClass, primaryButtonClass, errorBannerClass } from "@/lib/ui";
import { createRoom, renameRoom, deleteRoom, assignChildToRoom } from "./actions";

export const metadata: Metadata = { title: "Rooms · DR. SparkPlay" };

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [rooms, children, allIncidents] = await Promise.all([getRooms(), getChildren(), getChildIncidentReports()]);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentIncidentCountByChild = new Map<string, number>();
  for (const inc of allIncidents) {
    if (new Date(inc.occurred_at) >= thirtyDaysAgo) {
      recentIncidentCountByChild.set(inc.child_id, (recentIncidentCountByChild.get(inc.child_id) ?? 0) + 1);
    }
  }

  const childrenByRoom = new Map<string | null, typeof children>();
  childrenByRoom.set(null, []);
  for (const room of rooms) childrenByRoom.set(room.id, []);
  for (const child of children) {
    const key = child.room_id ?? null;
    if (!childrenByRoom.has(key)) childrenByRoom.set(key, []);
    childrenByRoom.get(key)!.push(child);
  }

  const unassigned = childrenByRoom.get(null) ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Rooms</h1>
      <p className="mt-1 text-sm text-ink/60">
        Organise children into rooms or groups. Attendance is grouped by room and ratios are
        calculated from each child&apos;s age.
      </p>

      {error && <p className={errorBannerClass}>{error}</p>}

      {/* Create new room */}
      <div className={`mt-6 p-5 ${cardClass}`}>
        <h2 className="font-display text-sm font-semibold text-ink">Add a room</h2>
        <form action={createRoom} className="mt-3 flex gap-2">
          <input
            name="name"
            type="text"
            required
            placeholder="e.g. Nursery, Toddlers, Kindy"
            className={`${inputClass} mt-0 flex-1`}
          />
          <button type="submit" className={`shrink-0 ${primaryButtonClass}`}>
            Add
          </button>
        </form>
      </div>

      {/* Room list */}
      {rooms.length === 0 ? (
        <p className="mt-4 text-sm text-ink/50">No rooms yet — add one above.</p>
      ) : (
        <div className="mt-4 space-y-4">
          {rooms.map((room) => {
            const roomChildren = childrenByRoom.get(room.id) ?? [];
            return (
              <div key={room.id} className={cardClass}>
                {/* Room header */}
                <div className="flex items-center gap-3 border-b border-coral-light px-4 py-3">
                  <form action={renameRoom} className="flex flex-1 items-center gap-2">
                    <input type="hidden" name="id" value={room.id} />
                    <input
                      name="name"
                      type="text"
                      defaultValue={room.name}
                      className="flex-1 rounded-lg border border-coral-light bg-white px-3 py-1 text-sm font-semibold text-ink focus:border-coral focus:outline-none"
                    />
                    <button type="submit" className="text-xs font-medium text-sage-dark hover:underline">
                      Save
                    </button>
                  </form>
                  <Link
                    href={`/rooms/${room.id}/daily-report`}
                    className="text-xs font-medium text-sage-dark hover:underline"
                  >
                    Daily report
                  </Link>
                  <form action={deleteRoom}>
                    <input type="hidden" name="id" value={room.id} />
                    <button
                      type="submit"
                      className="text-xs text-coral-dark hover:underline"
                      onClick={(e) => {
                        if (!confirm(`Delete "${room.name}"? Children will be unassigned.`)) e.preventDefault();
                      }}
                    >
                      Delete
                    </button>
                  </form>
                </div>

                {/* Children in this room */}
                <ul className="divide-y divide-coral-light/50">
                  {roomChildren.length === 0 && (
                    <li className="px-4 py-3 text-sm text-ink/40">No children assigned yet</li>
                  )}
                  {roomChildren.map((child) => {
                    const incCount = recentIncidentCountByChild.get(child.id) ?? 0;
                    return (
                      <li key={child.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <Link href={`/children/${child.id}`} className="text-sm font-medium text-ink hover:text-coral-dark">
                            {child.first_name}
                          </Link>
                          {incCount > 0 && (
                            <Link
                              href={`/children/${child.id}/support`}
                              className="rounded-full bg-coral-light px-2 py-0.5 text-xs font-semibold text-coral-dark hover:bg-coral hover:text-white transition-colors"
                              title={`${incCount} incident${incCount === 1 ? "" : "s"} in last 30 days`}
                            >
                              {incCount} inc
                            </Link>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <Link href={`/children/${child.id}/support`} className="text-xs text-ink/40 hover:text-coral-dark">
                            Support
                          </Link>
                          <form action={assignChildToRoom}>
                            <input type="hidden" name="child_id" value={child.id} />
                            <input type="hidden" name="room_id" value="" />
                            <button type="submit" className="text-xs text-ink/40 hover:text-coral-dark">
                              Remove
                            </button>
                          </form>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Add child to room */}
                {unassigned.length > 0 && (
                  <div className="border-t border-coral-light/50 px-4 py-3">
                    <form action={assignChildToRoom} className="flex items-center gap-2">
                      <input type="hidden" name="room_id" value={room.id} />
                      <select
                        name="child_id"
                        required
                        className="flex-1 rounded-xl border border-coral-light bg-white px-3 py-1.5 text-sm focus:border-coral focus:outline-none"
                      >
                        <option value="">Add a child to this room…</option>
                        {unassigned.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.first_name}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="shrink-0 rounded-full bg-sage px-3 py-1.5 text-xs font-semibold text-white hover:bg-sage-dark">
                        Add
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Unassigned children */}
      {unassigned.length > 0 && (
        <div className={`mt-4 ${cardClass}`}>
          <div className="border-b border-coral-light px-4 py-3">
            <h2 className="font-display text-sm font-semibold text-ink/50">
              Unassigned ({unassigned.length})
            </h2>
            <p className="text-xs text-ink/40">These children will appear in an &ldquo;Unassigned&rdquo; group on the attendance register.</p>
          </div>
          <ul className="divide-y divide-coral-light/50">
            {unassigned.map((child) => (
              <li key={child.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="text-sm font-medium text-ink">{child.first_name}</span>
                {rooms.length > 0 && (
                  <form action={assignChildToRoom} className="flex items-center gap-2">
                    <input type="hidden" name="child_id" value={child.id} />
                    <select
                      name="room_id"
                      className="rounded-lg border border-coral-light bg-white px-2 py-1 text-xs focus:border-coral focus:outline-none"
                    >
                      <option value="">Move to room…</option>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                    <button type="submit" className="text-xs font-medium text-sage-dark hover:underline">
                      Move
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
