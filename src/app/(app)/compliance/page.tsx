import type { Metadata } from "next";
import type { Database } from "@/lib/types/database.types";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { getMyStaffRole } from "@/lib/supabase/staff";
import { cardClass, inputClass, primaryButtonClass, errorBannerClass } from "@/lib/ui";
import { addComplianceRecord, deleteComplianceRecord } from "./actions";

export const metadata: Metadata = { title: "Staff Compliance · DR. SparkPlay" };

const TYPE_LABELS: Record<string, string> = {
  wwcc: "Working With Children Check",
  first_aid: "First Aid Certificate",
  anaphylaxis: "Anaphylaxis Management",
  asthma: "Asthma First Aid",
  child_protection: "Child Protection Training",
  fire_safety: "Fire Safety / Warden",
  food_safety: "Food Safety Certificate",
  other: "Other",
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function expiryBadge(days: number | null) {
  if (days === null) return null;
  if (days < 0) return { label: `Expired ${Math.abs(days)}d ago`, cls: "bg-coral text-white" };
  if (days <= 30) return { label: `${days}d`, cls: "bg-amber-200 text-amber-800" };
  if (days <= 90) return { label: `${days}d`, cls: "bg-amber-100 text-amber-700" };
  return { label: `${days}d`, cls: "bg-sage-light text-sage-dark" };
}

export default async function CompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;
  const ownerUserId = await getMyServiceOwnerId();
  const myRole = await getMyStaffRole();
  const canManage = myRole === "director" || myRole === "2ic";

  const [{ data: records }, { data: memberships }, { data: profiles }] = await Promise.all([
    ownerUserId
      ? supabase
          .from("staff_compliance")
          .select("*")
          .eq("owner_user_id", ownerUserId)
          .order("expiry_date", { ascending: true, nullsFirst: false })
      : { data: [] },
    ownerUserId
      ? supabase
          .from("staff_memberships")
          .select("user_id, role")
          .eq("service_id", (await supabase.from("services").select("id").maybeSingle()).data?.id ?? "")
          .eq("status", "active")
      : { data: [] },
    supabase.from("profiles").select("id, display_name"),
  ]);

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
  const staffList = (memberships ?? []).map((m) => ({
    user_id: m.user_id,
    display_name: nameById.get(m.user_id) ?? "Unknown",
    role: m.role,
  }));

  // Group records by staff member
  type CompRow = Database["public"]["Tables"]["staff_compliance"]["Row"];
  const byStaff = new Map<string, CompRow[]>();
  (records ?? []).forEach((r) => {
    if (!byStaff.has(r.staff_user_id)) byStaff.set(r.staff_user_id, []);
    byStaff.get(r.staff_user_id)!.push(r);
  });

  const now = new Date();
  const expiringSoon = (records ?? []).filter((r) => {
    if (!r.expiry_date) return false;
    const days = daysUntil(r.expiry_date);
    return days !== null && days <= 60;
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Staff Compliance</h1>
      <p className="mt-1 text-sm text-ink/60">
        Track WWCC, First Aid, Anaphylaxis, and other mandatory certifications.
      </p>

      {params.error && <p className={`mt-4 ${errorBannerClass}`}>{params.error}</p>}

      {/* Expiry alerts */}
      {expiringSoon.length > 0 && (
        <div className="mt-4 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
          <p className="mb-2 text-sm font-semibold text-amber-800">Certificates expiring within 60 days</p>
          <ul className="space-y-1.5">
            {expiringSoon.map((r) => {
              const days = daysUntil(r.expiry_date);
              const badge = expiryBadge(days);
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-ink">{nameById.get(r.staff_user_id) ?? "Unknown"}</span>
                  <span className="text-ink/60">{r.label}</span>
                  {badge && <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${badge.cls}`}>{badge.label}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Add form */}
      {canManage && (
        <details className={`mt-6 ${cardClass}`}>
          <summary className="cursor-pointer px-4 py-3 font-display text-sm font-semibold text-ink hover:text-coral-dark">
            + Add certification record
          </summary>
          <form action={addComplianceRecord} className="flex flex-col gap-3 border-t border-coral-light px-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">Staff member</label>
                <select name="staff_user_id" required className={inputClass}>
                  {staffList.map((s) => (
                    <option key={s.user_id} value={s.user_id}>{s.display_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">Type</label>
                <select name="compliance_type" required className={inputClass}>
                  {Object.entries(TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Certificate label / description</label>
              <input type="text" name="label" required placeholder="e.g. HLTAID012 First Aid" className={inputClass} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">Reference / number</label>
                <input type="text" name="reference_number" placeholder="Optional" className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">Issued date</label>
                <input type="date" name="issued_date" className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">Expiry date</label>
                <input type="date" name="expiry_date" className={inputClass} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Notes (optional)</label>
              <input type="text" name="notes" placeholder="Provider, renewal reminder, etc." className={inputClass} />
            </div>
            <button type="submit" className={primaryButtonClass}>Save record</button>
          </form>
        </details>
      )}

      {/* Records by staff member */}
      <div className="mt-6 flex flex-col gap-4">
        {staffList.length === 0 && (
          <p className={`p-5 text-sm text-ink/50 ${cardClass}`}>No staff members found. Add staff via the Staff page.</p>
        )}
        {staffList.map((s) => {
          const recs = byStaff.get(s.user_id) ?? [];
          const hasIssues = recs.some((r) => {
            const d = daysUntil(r.expiry_date);
            return d !== null && d <= 60;
          });
          return (
            <div key={s.user_id} className={`${cardClass} overflow-hidden`}>
              <div className={`flex items-center justify-between border-b border-coral-light px-4 py-3 ${hasIssues ? "bg-amber-50" : ""}`}>
                <div>
                  <p className="font-display text-sm font-semibold text-ink">{s.display_name}</p>
                  <p className="text-xs capitalize text-ink/40">{s.role}</p>
                </div>
                <span className="text-xs text-ink/40">{recs.length} record{recs.length !== 1 ? "s" : ""}</span>
              </div>
              {recs.length === 0 ? (
                <p className="px-4 py-3 text-sm text-ink/40">No compliance records yet.</p>
              ) : (
                <ul className="divide-y divide-coral-light">
                  {recs.map((r) => {
                    const days = daysUntil(r.expiry_date);
                    const badge = expiryBadge(days);
                    return (
                      <li key={r.id} className="flex items-start justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 text-sm font-medium text-ink">
                            <span className="shrink-0 rounded bg-ink/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink/50">
                              {TYPE_LABELS[r.compliance_type]?.split(" ")[0]}
                            </span>
                            {r.label}
                          </p>
                          <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-ink/40">
                            {r.reference_number && <span>#{r.reference_number}</span>}
                            {r.issued_date && <span>Issued {new Date(r.issued_date + "T00:00:00").toLocaleDateString("en-AU")}</span>}
                            {r.expiry_date && <span>Expires {new Date(r.expiry_date + "T00:00:00").toLocaleDateString("en-AU")}</span>}
                          </div>
                          {r.notes && <p className="mt-0.5 text-xs text-ink/50">{r.notes}</p>}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {badge && <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${badge.cls}`}>{badge.label}</span>}
                          {canManage && (
                            <form action={async () => { "use server"; await deleteComplianceRecord(r.id); }}>
                              <button type="submit" className="text-xs text-ink/30 hover:text-coral-dark">Delete</button>
                            </form>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
