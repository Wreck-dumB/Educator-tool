import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMyStaffRole } from "@/lib/supabase/staff";
import { getAuditLog } from "@/lib/supabase/auditLog";
import { cardClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Audit Log · DR. SparkPlay" };

const ACTION_LABELS: Record<string, string> = {
  view_incident_reports: "Viewed incident reports",
  view_child_record: "Viewed child record",
  view_child_documents: "Viewed child documents",
  view_permission_slip_signatures: "Viewed permission slip signatures",
  export_child_portfolio: "Exported child portfolio",
};

function fmt(ts: string) {
  return new Date(ts).toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default async function AuditLogPage() {
  const myRole = await getMyStaffRole();
  if (myRole !== "director") redirect("/dashboard");

  const entries = await getAuditLog(500);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Audit log</h1>
      <p className="mt-1 text-sm text-ink/60">
        Record of who accessed sensitive records and when. Director-only. Entries are permanent and
        cannot be edited or deleted. Retained for 7 years.
      </p>

      {entries.length === 0 && (
        <p className="mt-8 text-center text-sm text-ink/40">No audit entries yet.</p>
      )}

      {entries.length > 0 && (
        <div className={`mt-6 ${cardClass} overflow-hidden`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 bg-ink/5">
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink/50">
                  When
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink/50">
                  Action
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink/50 hidden sm:table-cell">
                  Target
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink/50 hidden md:table-cell">
                  Staff member
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-ink/3">
                  <td className="px-4 py-2.5 text-xs text-ink/50 whitespace-nowrap">
                    {fmt(entry.created_at)}
                  </td>
                  <td className="px-4 py-2.5 text-xs font-medium text-ink">
                    {ACTION_LABELS[entry.action] ?? entry.action}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-ink/60 hidden sm:table-cell">
                    {entry.target_label ?? entry.target_type ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-ink/50 hidden md:table-cell font-mono">
                    {entry.actor_user_id.slice(0, 8)}&hellip;
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-ink/30">
        Showing last {entries.length} entries. Staff IDs are shown rather than names to remain accurate
        even if a staff member&apos;s display name changes.
      </p>
    </div>
  );
}
