import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { getMyStaffRole } from "@/lib/supabase/staff";
import { cardClass, inputClass, primaryButtonClass, errorBannerClass } from "@/lib/ui";
import type { WaitingListStatus } from "@/lib/types/database.types";
import { addEnquiry, updateEnquiryStatus, deleteEnquiry } from "./actions";

export const metadata: Metadata = { title: "Waiting List · DR. SparkPlay" };

function todayAEST() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
}

const STATUS_ORDER = ["enquiry", "waitlisted", "offered", "enrolled", "declined", "withdrawn"];

const STATUS_META: Record<string, { label: string; cls: string; next?: string[] }> = {
  enquiry:   { label: "Enquiry",    cls: "bg-amber-100 text-amber-700", next: ["waitlisted", "declined", "withdrawn"] },
  waitlisted: { label: "Waitlisted", cls: "bg-blue-100 text-blue-700",  next: ["offered", "declined", "withdrawn"] },
  offered:    { label: "Offered",    cls: "bg-sage-light text-sage-dark", next: ["enrolled", "declined", "withdrawn"] },
  enrolled:   { label: "Enrolled",   cls: "bg-sage text-white",           next: ["withdrawn"] },
  declined:   { label: "Declined",   cls: "bg-coral-light text-coral-dark", next: ["enquiry"] },
  withdrawn:  { label: "Withdrawn",  cls: "bg-ink/10 text-ink/50",         next: ["enquiry"] },
};

const SESSION_LABELS: Record<string, string> = {
  full_day: "Full day",
  morning: "Morning",
  afternoon: "Afternoon",
  flexible: "Flexible",
};

export default async function WaitingListPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; status?: string; add?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/generate");

  const myRole = await getMyStaffRole();
  const canDelete = myRole === "director" || myRole === "2ic";
  const today = todayAEST();
  const statusFilter = params.status ?? "active";
  const showAdd = params.add === "1";

  // Fetch rooms for the add form
  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, name")
    .eq("owner_user_id", ownerUserId)
    .order("sort_order");

  // Fetch enquiries
  const activeStatuses: WaitingListStatus[] = ["enquiry", "waitlisted", "offered"];
  const archivedStatuses: WaitingListStatus[] = ["enrolled", "declined", "withdrawn"];
  let query = supabase
    .from("waiting_list_enquiries")
    .select("*")
    .eq("owner_user_id", ownerUserId);

  if (statusFilter === "active") {
    query = query.in("status", activeStatuses);
  } else if (statusFilter === "archived") {
    query = query.in("status", archivedStatuses);
  } else {
    query = query.eq("status", statusFilter as WaitingListStatus);
  }

  const { data: enquiries } = await query.order("enquiry_date").order("created_at");

  const roomNameById = new Map((rooms ?? []).map((r) => [r.id, r.name]));
  const activeCount = (await supabase
    .from("waiting_list_enquiries")
    .select("id", { count: "exact", head: true })
    .eq("owner_user_id", ownerUserId)
    .in("status", activeStatuses)).count ?? 0;

  const tabs = [
    { key: "active", label: `Active (${activeCount})` },
    { key: "enrolled", label: "Enrolled" },
    { key: "archived", label: "Archived" },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-coral-dark">Waiting List</h1>
          <p className="mt-1 text-sm text-ink/60">Track enquiries from new families through to enrolment.</p>
        </div>
        <a
          href="/waiting-list?add=1"
          className={`${primaryButtonClass} no-underline`}
        >
          + Add enquiry
        </a>
      </div>

      {params.error && <p className={`mt-4 ${errorBannerClass}`}>{params.error}</p>}

      {/* Add enquiry form */}
      {showAdd && (
        <div className={`mt-5 ${cardClass}`}>
          <div className="border-b border-coral-light px-4 py-3">
            <h2 className="font-display text-sm font-semibold text-ink">New enquiry</h2>
          </div>
          <form action={addEnquiry} className="flex flex-col gap-4 p-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">Child&apos;s first name *</label>
                <input type="text" name="child_first_name" required className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">Date of birth</label>
                <input type="date" name="child_date_of_birth" className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">Parent / guardian name *</label>
                <input type="text" name="parent_name" required className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">Phone</label>
                <input type="tel" name="parent_phone" className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">Email</label>
                <input type="email" name="parent_email" className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">Enquiry date</label>
                <input type="date" name="enquiry_date" defaultValue={today} className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">Preferred start</label>
                <input type="date" name="preferred_start_date" className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">Session</label>
                <select name="session_preference" className={inputClass}>
                  <option value="flexible">Flexible</option>
                  <option value="full_day">Full day</option>
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">Room interest</label>
                <select name="room_id" className={inputClass}>
                  <option value="">Any room</option>
                  {(rooms ?? []).map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Notes</label>
              <input type="text" name="notes" placeholder="Allergies, siblings, referral source, etc." className={inputClass} />
            </div>
            <div className="flex gap-3">
              <button type="submit" className={primaryButtonClass}>Save enquiry</button>
              <a href="/waiting-list" className="rounded-xl border border-coral-light px-4 py-2 text-sm font-semibold text-ink/60 hover:bg-coral-light">
                Cancel
              </a>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="mt-5 flex gap-2 border-b border-coral-light">
        {tabs.map((t) => (
          <a
            key={t.key}
            href={`/waiting-list?status=${t.key}`}
            className={`-mb-px rounded-t-lg border border-b-0 px-4 py-2 text-sm font-semibold transition-colors ${
              statusFilter === t.key
                ? "border-coral-light bg-white text-coral-dark"
                : "border-transparent text-ink/40 hover:text-coral-dark"
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>

      {/* List */}
      {!enquiries || enquiries.length === 0 ? (
        <p className={`mt-6 p-5 text-sm text-ink/50 ${cardClass}`}>
          {statusFilter === "active" ? "No active enquiries." : "Nothing here yet."}
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {enquiries.map((e) => {
            const meta = STATUS_META[e.status] ?? { label: e.status, cls: "bg-ink/5 text-ink/50" };
            const ageMonths = e.child_date_of_birth
              ? Math.floor((Date.now() - new Date(e.child_date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 30.5))
              : null;
            return (
              <div key={e.id} className={`${cardClass} p-4`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink">{e.child_first_name}</p>
                      {ageMonths !== null && (
                        <span className="text-xs text-ink/40">
                          {ageMonths >= 12
                            ? `${Math.floor(ageMonths / 12)}y ${ageMonths % 12}m`
                            : `${ageMonths}m`}
                        </span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${meta.cls}`}>
                        {meta.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-ink/70">{e.parent_name}</p>
                    <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-ink/40">
                      {e.parent_phone && <span>{e.parent_phone}</span>}
                      {e.parent_email && <span>{e.parent_email}</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-ink/50">
                      {e.preferred_start_date && (
                        <span>Start: {new Date(e.preferred_start_date + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</span>
                      )}
                      {e.room_id && roomNameById.get(e.room_id) && (
                        <span>Room: {roomNameById.get(e.room_id)}</span>
                      )}
                      <span>{SESSION_LABELS[e.session_preference] ?? e.session_preference}</span>
                      <span>Enquired: {new Date(e.enquiry_date + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</span>
                    </div>
                    {e.notes && <p className="mt-1 text-xs text-ink/50 italic">{e.notes}</p>}
                  </div>

                  {/* Status actions */}
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {(meta.next ?? []).map((nextStatus) => {
                      const nextMeta = STATUS_META[nextStatus];
                      return (
                        <form
                          key={nextStatus}
                          action={async () => {
                            "use server";
                            await updateEnquiryStatus(e.id, nextStatus as WaitingListStatus);
                          }}
                        >
                          <button
                            type="submit"
                            className="rounded-xl border border-coral-light px-3 py-1 text-xs font-semibold text-ink/60 hover:bg-coral-light"
                          >
                            → {nextMeta?.label ?? nextStatus}
                          </button>
                        </form>
                      );
                    })}
                    {canDelete && (
                      <form
                        action={async () => {
                          "use server";
                          await deleteEnquiry(e.id);
                        }}
                      >
                        <button type="submit" className="rounded-xl px-2 py-1 text-xs text-ink/20 hover:text-coral-dark">
                          Delete
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
