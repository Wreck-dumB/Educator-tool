import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { getMyStaffRole } from "@/lib/supabase/staff";
import { logPdHours, deletePdEntry } from "./actions";
import { cardClass, inputClass, primaryButtonClass, errorBannerClass } from "@/lib/ui";

const PD_TYPE_LABELS: Record<string, string> = {
  first_aid:        "First Aid / CPR",
  child_protection: "Child Protection",
  curriculum:       "Curriculum & Pedagogy",
  leadership:       "Leadership & Management",
  nqs:              "NQS / Regulatory",
  wellbeing:        "Staff Wellbeing",
  other:            "Other",
};

const PD_TYPE_COLOURS: Record<string, string> = {
  first_aid:        "bg-coral/15 text-coral-dark",
  child_protection: "bg-amber-100 text-amber-800",
  curriculum:       "bg-sage-light text-sage-dark",
  leadership:       "bg-purple-100 text-purple-800",
  nqs:              "bg-blue-100 text-blue-800",
  wellbeing:        "bg-pink-100 text-pink-800",
  other:            "bg-ink/10 text-ink/70",
};

export default async function PdHoursPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; year?: string }>;
}) {
  const { error, year: yearParam } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/onboarding");

  const myRole = await getMyStaffRole();
  const canViewAll = myRole === "director" || myRole === "2ic";

  const currentYear = new Date().getFullYear();
  const selectedYear = yearParam ? parseInt(yearParam, 10) : currentYear;
  const yearStart = `${selectedYear}-01-01`;
  const yearEnd   = `${selectedYear}-12-31`;

  // Director/2IC sees all staff; regular staff sees own entries only
  const query = supabase
    .from("staff_pd_hours")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .gte("completed_date", yearStart)
    .lte("completed_date", yearEnd)
    .order("completed_date", { ascending: false });

  if (!canViewAll) query.eq("staff_user_id", user.id);

  const { data: entries } = await query;

  // Group by staff_user_id for the director view
  const byStaff = new Map<string, typeof entries>();
  for (const entry of entries ?? []) {
    const existing = byStaff.get(entry.staff_user_id) ?? [];
    existing.push(entry);
    byStaff.set(entry.staff_user_id, existing);
  }

  const totalHours = (entries ?? []).reduce((sum, e) => sum + e.hours, 0);
  const myEntries = (entries ?? []).filter((e) => e.staff_user_id === user.id);
  const myHours   = myEntries.reduce((sum, e) => sum + e.hours, 0);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Professional Development Hours</h1>
          <p className="mt-1 text-sm text-ink/50">
            Track training and PD completed by staff. NQS Element 4.2.
          </p>
        </div>
        {/* Year selector */}
        <form method="GET" id="year-form">
          <select
            name="year"
            defaultValue={selectedYear}
            className={inputClass + " text-sm"}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button type="submit" className="ml-2 rounded-lg border border-ink/20 px-3 py-1.5 text-sm hover:bg-ink/5">Go</button>
        </form>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className={cardClass + " p-4 text-center"}>
          <p className="text-2xl font-bold text-coral-dark">{myHours.toFixed(1)}</p>
          <p className="text-xs text-ink/50">My hours ({selectedYear})</p>
        </div>
        {canViewAll && (
          <div className={cardClass + " p-4 text-center"}>
            <p className="text-2xl font-bold text-sage-dark">{totalHours.toFixed(1)}</p>
            <p className="text-xs text-ink/50">All staff hours ({selectedYear})</p>
          </div>
        )}
        <div className={cardClass + " p-4 text-center"}>
          <p className="text-2xl font-bold text-ink">{(entries ?? []).length}</p>
          <p className="text-xs text-ink/50">{canViewAll ? "Total entries" : "My entries"}</p>
        </div>
      </div>

      {/* Log form */}
      <div className={cardClass + " p-5"}>
        <h2 className="font-display text-base font-semibold text-ink mb-4">Log PD hours</h2>
        {error && <p className={`mb-3 ${errorBannerClass}`}>{error}</p>}
        <form action={logPdHours} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-ink/70 mb-1">Course / Training name</label>
              <input type="text" name="course_name" required placeholder="e.g. Anaphylaxis Management" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink/70 mb-1">Provider (optional)</label>
              <input type="text" name="provider" placeholder="e.g. St John Ambulance" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink/70 mb-1">Date completed</label>
              <input type="date" name="completed_date" required max={today} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink/70 mb-1">Hours</label>
              <input type="number" name="hours" required min="0.5" max="100" step="0.5" placeholder="e.g. 4" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink/70 mb-1">PD type</label>
              <select name="pd_type" className={inputClass}>
                {Object.entries(PD_TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-ink/70 mb-1">Notes (optional)</label>
              <input type="text" name="notes" placeholder="e.g. Certificate attached to compliance folder" className={inputClass} />
            </div>
          </div>
          <button type="submit" className={primaryButtonClass}>Save entry</button>
        </form>
      </div>

      {/* Entries */}
      {canViewAll ? (
        // Director view: grouped by staff member
        byStaff.size === 0 ? (
          <div className={cardClass + " p-5"}>
            <p className="text-sm text-ink/40">No PD hours logged for {selectedYear}.</p>
          </div>
        ) : (
          Array.from(byStaff.entries()).map(([staffId, staffEntries]) => {
            const staffTotal = staffEntries!.reduce((sum, e) => sum + e.hours, 0);
            const isMe = staffId === user.id;
            return (
              <div key={staffId} className={cardClass + " p-5"}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display text-sm font-semibold text-ink">
                    {isMe ? "My entries" : `Staff: ${staffId.slice(0, 8)}…`}
                  </h2>
                  <span className="text-sm font-bold text-sage-dark">{staffTotal.toFixed(1)} hrs</span>
                </div>
                <EntryList entries={staffEntries!} currentUserId={user.id} canViewAll={canViewAll} />
              </div>
            );
          })
        )
      ) : (
        <div className={cardClass + " p-5"}>
          <h2 className="font-display text-base font-semibold text-ink mb-4">My entries — {selectedYear}</h2>
          {myEntries.length === 0 ? (
            <p className="text-sm text-ink/40">No entries yet for {selectedYear}.</p>
          ) : (
            <EntryList entries={myEntries} currentUserId={user.id} canViewAll={false} />
          )}
        </div>
      )}
    </div>
  );
}

function EntryList({
  entries,
  currentUserId,
  canViewAll,
}: {
  entries: { id: string; course_name: string; provider: string | null; completed_date: string; hours: number; pd_type: string; notes: string | null; staff_user_id: string }[];
  currentUserId: string;
  canViewAll: boolean;
}) {
  return (
    <ul className="divide-y divide-coral-light/50">
      {entries.map((e) => (
        <li key={e.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-ink">{e.course_name}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PD_TYPE_COLOURS[e.pd_type] ?? PD_TYPE_COLOURS.other}`}>
                {PD_TYPE_LABELS[e.pd_type] ?? e.pd_type}
              </span>
            </div>
            <p className="text-xs text-ink/50 mt-0.5">
              {new Date(e.completed_date).toLocaleDateString("en-AU")}
              {e.provider && ` · ${e.provider}`}
              {" · "}<span className="font-medium">{e.hours} hr{e.hours !== 1 ? "s" : ""}</span>
            </p>
            {e.notes && <p className="text-xs text-ink/50 mt-0.5 italic">{e.notes}</p>}
          </div>
          {(canViewAll || e.staff_user_id === currentUserId) && (
            <form action={deletePdEntry.bind(null, e.id)}>
              <button type="submit" className="text-xs text-coral-dark hover:underline shrink-0">
                Remove
              </button>
            </form>
          )}
        </li>
      ))}
    </ul>
  );
}
