import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlatformOwner } from "@/lib/supabase/serviceAccess";
import { getCentreOperationsSnapshot } from "@/lib/supabase/ownerCentreView";

export const metadata: Metadata = { title: "Centre · DR. SparkPlay" };

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-5">
      <h2 className="font-semibold text-ink">{title}</h2>
      <div className="mt-3 space-y-1.5 text-sm text-ink/70">{children}</div>
    </div>
  );
}

export default async function OwnerCentrePage({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  const { serviceId } = await params;

  // Re-checked here, not just in the layout — never trust the parent gate alone.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isPlatformOwner(user.email)) redirect("/dashboard");

  const admin = createAdminClient();
  const snapshot = await getCentreOperationsSnapshot(admin, serviceId);
  if (!snapshot) notFound();

  const { service, staff, rooms, programs, activities, policies, safeWorkProcedures, riskAssessments, staffCompliance } =
    snapshot;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/owner/businesses" className="text-sm text-coral-dark hover:underline">
          ← All businesses
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-ink">{service.displayName || service.name}</h1>
        <p className="mt-1 text-sm text-ink/60">
          Read-only operational view for support/debugging. Child records are deliberately not shown
          here — use the demo mode to test anything involving child data.
        </p>
      </div>

      <Section title="Overview">
        <p>Director: {service.directorEmail}</p>
        <p>Jurisdiction: {service.jurisdiction.toUpperCase()}</p>
        <p>Approved provider number: {service.approvedProviderNumber ?? "—"}</p>
        <p>Service approval number: {service.serviceApprovalNumber ?? "—"}</p>
        <p>Nominated supervisor: {service.nominatedSupervisorName ?? "—"}</p>
        <p>
          Created: {fmtDate(service.createdAt)}
          {service.isDemo ? " · demo centre" : ""}
        </p>
      </Section>

      <Section title={`Staff (${staff.length})`}>
        {staff.length === 0 ? (
          <p className="text-ink/40">No staff.</p>
        ) : (
          staff.map((s) => (
            <p key={s.id}>
              {s.email} — {s.role} · {s.status}
              {s.removedAt ? ` (removed ${fmtDate(s.removedAt)})` : ""}
            </p>
          ))
        )}
      </Section>

      <Section title={`Rooms (${rooms.length})`}>
        {rooms.length === 0 ? (
          <p className="text-ink/40">No rooms.</p>
        ) : (
          rooms.map((r) => (
            <p key={r.id}>
              {r.name}
              {r.capacity != null ? ` — capacity ${r.capacity}` : ""}
            </p>
          ))
        )}
      </Section>

      <Section title={`Recent programs (${programs.length})`}>
        {programs.length === 0 ? (
          <p className="text-ink/40">No programs.</p>
        ) : (
          programs.map((p) => (
            <p key={p.id}>
              {p.title} — {fmtDate(p.startDate)} to {fmtDate(p.endDate)} · {p.status}
            </p>
          ))
        )}
      </Section>

      <Section title={`Recent activities / worksheets (${activities.length})`}>
        {activities.length === 0 ? (
          <p className="text-ink/40">No activities.</p>
        ) : (
          activities.map((a) => (
            <p key={a.id}>
              {a.title}
              {a.suggestedTemplate ? ` — ${a.suggestedTemplate}` : ""} · {fmtDate(a.createdAt)}
            </p>
          ))
        )}
      </Section>

      <Section title={`Policies (${policies.length})`}>
        {policies.length === 0 ? (
          <p className="text-ink/40">No policies.</p>
        ) : (
          policies.map((p) => (
            <p key={p.id}>
              {p.title} — {p.category} · reviewed {fmtDate(p.reviewedAt)}
            </p>
          ))
        )}
      </Section>

      <Section title={`Safe work procedures (${safeWorkProcedures.length})`}>
        {safeWorkProcedures.length === 0 ? (
          <p className="text-ink/40">None.</p>
        ) : (
          safeWorkProcedures.map((s) => (
            <p key={s.id}>
              {s.taskTitle} — reviewed {fmtDate(s.reviewedAt)}
            </p>
          ))
        )}
      </Section>

      <Section title={`Risk assessments (${riskAssessments.length})`}>
        {riskAssessments.length === 0 ? (
          <p className="text-ink/40">None.</p>
        ) : (
          riskAssessments.map((r) => (
            <p key={r.id}>
              {r.title} — reviewed {fmtDate(r.reviewedAt)}
            </p>
          ))
        )}
      </Section>

      <Section title={`Staff compliance (${staffCompliance.length})`}>
        {staffCompliance.length === 0 ? (
          <p className="text-ink/40">None.</p>
        ) : (
          staffCompliance.map((c) => (
            <p key={c.id}>
              {c.label} ({c.complianceType}) — issued {fmtDate(c.issuedDate)}, expires {fmtDate(c.expiryDate)}
            </p>
          ))
        )}
      </Section>
    </div>
  );
}
