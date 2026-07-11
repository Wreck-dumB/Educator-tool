import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { getMyStaffRole, getMyService, getStaffMembers } from "@/lib/supabase/staff";
import { addShift, deleteShift } from "./actions";
import { cardClass, inputClass, primaryButtonClass, errorBannerClass } from "@/lib/ui";

function weekStart(offset = 0): string {
  const d = new Date();
  const dow = d.getDay(); // 0=Sun
  const mon = new Date(d);
  mon.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
  return mon.toLocaleDateString("en-CA"); // YYYY-MM-DD
}

function addDays(base: string, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function StaffRosterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; week?: string }>;
}) {
  const { error, week } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/onboarding");

  const myRole = await getMyStaffRole();
  const canEdit = myRole === "director" || myRole === "2ic";

  const weekOffset = week ? parseInt(week, 10) : 0;
  const monday = weekStart(weekOffset);
  const sunday = addDays(monday, 6);

  const service = await getMyService();
  const staffMembers = service ? await getStaffMembers(service.id) : [];
  const activeStaff = staffMembers.filter((m) => m.status === "active");

  const { data: shifts } = await supabase
    .from("staff_roster")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .gte("roster_date", monday)
    .lte("roster_date", sunday)
    .order("roster_date")
    .order("shift_start");

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const staffById = new Map(activeStaff.map((s) => [s.user_id, s.displayName]));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Staff Roster</h1>
          <p className="mt-1 text-sm text-ink/50">Plan and view staff shifts for the week.</p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/staff/roster?week=${weekOffset - 1}`}
            className="rounded-lg border border-ink/20 px-3 py-1.5 text-sm hover:bg-ink/5"
          >
            ← Prev
          </a>
          <a
            href="/staff/roster"
            className="rounded-lg border border-ink/20 px-3 py-1.5 text-sm hover:bg-ink/5"
          >
            Today
          </a>
          <a
            href={`/staff/roster?week=${weekOffset + 1}`}
            className="rounded-lg border border-ink/20 px-3 py-1.5 text-sm hover:bg-ink/5"
          >
            Next →
          </a>
        </div>
      </div>

      {/* Week grid */}
      <div className={cardClass + " p-4 overflow-x-auto"}>
        <p className="text-xs text-ink/40 mb-3">
          Week of {new Date(monday).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
        </p>
        <div className="grid grid-cols-7 gap-1 min-w-[480px]">
          {DAY_LABELS.map((label, i) => {
            const date = weekDates[i];
            const today = new Date().toLocaleDateString("en-CA");
            const isToday = date === today;
            const dayShifts = (shifts ?? []).filter((s) => s.roster_date === date);
            return (
              <div key={date} className={`rounded-xl p-2 ${isToday ? "bg-coral-light/40 border border-coral/30" : "bg-ink/5"}`}>
                <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${isToday ? "text-coral-dark" : "text-ink/40"}`}>
                  {label}
                  <br />
                  <span className="normal-case font-normal">{new Date(date).getDate()}</span>
                </p>
                {dayShifts.length === 0 ? (
                  <p className="text-[10px] text-ink/20">—</p>
                ) : (
                  <ul className="space-y-1">
                    {dayShifts.map((s) => (
                      <li key={s.id} className="rounded-lg bg-white px-1.5 py-1 text-[10px] leading-tight">
                        <p className="font-semibold text-ink truncate">{staffById.get(s.staff_user_id) ?? "Staff"}</p>
                        <p className="text-ink/50">{s.shift_start.slice(0, 5)}–{s.shift_end.slice(0, 5)}</p>
                        {canEdit && (
                          <form action={async () => { "use server"; await deleteShift(s.id); }}>
                            <button type="submit" className="text-coral-dark hover:underline">✕</button>
                          </form>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add shift form */}
      {canEdit && (
        <div className={cardClass + " p-5"}>
          <h2 className="font-display text-base font-semibold text-ink mb-4">Add shift</h2>
          {error && <p className={`mb-3 ${errorBannerClass}`}>{error}</p>}
          <form action={async (fd: FormData) => { await addShift(fd); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1">Staff member</label>
                <select name="staff_user_id" required className={inputClass}>
                  <option value="">Select staff…</option>
                  {activeStaff.map((s) => (
                    <option key={s.user_id} value={s.user_id}>{s.displayName} ({s.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1">Date</label>
                <input type="date" name="roster_date" required className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1">Start time</label>
                <input type="time" name="shift_start" required className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1">End time</label>
                <input type="time" name="shift_end" required className={inputClass} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-ink/70 mb-1">Notes (optional)</label>
                <input type="text" name="notes" placeholder="e.g. Covering for leave" className={inputClass} />
              </div>
            </div>
            <button type="submit" className={primaryButtonClass}>Add shift</button>
          </form>
        </div>
      )}
    </div>
  );
}
