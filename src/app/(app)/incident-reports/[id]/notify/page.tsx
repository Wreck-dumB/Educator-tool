import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import PrintButton from "@/app/(app)/invoices/[id]/PrintButton";

const RECORD_TYPE_LABELS: Record<string, string> = {
  incident: "Incident",
  injury: "Injury",
  trauma: "Trauma",
  illness: "Illness",
};

export default async function IncidentNotifyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/incident-reports");

  const [{ data: report }, { data: service }, { data: children }] = await Promise.all([
    supabase
      .from("child_incident_reports")
      .select("*")
      .eq("id", id)
      .single(),
    supabase
      .from("services")
      .select("name, display_name")
      .eq("director_user_id", ownerUserId)
      .maybeSingle(),
    supabase.from("children").select("id, first_name").eq("owner_user_id", ownerUserId),
  ]);

  if (!report) notFound();

  const serviceName = service?.display_name ?? service?.name ?? "Service";
  const childName = children?.find((c) => c.id === report.child_id)?.first_name ?? "Child";
  const occurredDate = new Date(report.occurred_at);
  const notify24hDeadline = new Date(occurredDate.getTime() + 24 * 60 * 60 * 1000);
  const recordTypeLabel = RECORD_TYPE_LABELS[report.record_type] ?? report.record_type;

  const fmtDateTime = (d: Date) =>
    d.toLocaleString("en-AU", { timeZone: "Australia/Sydney", dateStyle: "full", timeStyle: "short" });
  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-AU", { timeZone: "Australia/Sydney", dateStyle: "full" });

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-4 print:hidden">
        <a href="/incident-reports" className="text-sm font-medium text-ink/50 hover:text-coral-dark">
          ← Incident reports
        </a>
        <PrintButton />
      </div>

      {/* Warning banner */}
      <div className="mb-6 rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 print:hidden">
        <p className="font-semibold text-amber-800">
          This is a pre-filled draft — review and complete before submitting to your regulatory authority.
        </p>
        <p className="mt-1 text-sm text-amber-700">
          Serious incidents must be notified within 24 hours (by{" "}
          <strong>{fmtDateTime(notify24hDeadline)}</strong>). The exact form and submission method depends on your state/territory regulator.
        </p>
      </div>

      <div className="rounded-3xl border border-ink/10 bg-white p-8 shadow-sm print:border-none print:p-0 print:shadow-none">
        {/* Header */}
        <div className="border-b-2 border-ink pb-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink/50">Education and Care Services</p>
          <h1 className="font-display mt-1 text-xl font-bold text-ink">Serious Incident Notification</h1>
          <p className="mt-0.5 text-xs text-ink/40">
            Prepared under the Education and Care Services National Law and National Regulations
          </p>
        </div>

        {/* Section A: Service */}
        <section className="mt-6">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink/50">Section A: Service details</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Service name" value={serviceName} />
            <Field label="Service approval number" value="[Insert approval number]" placeholder />
            <Field label="Service address" value="[Insert service address]" placeholder />
            <Field label="Service phone" value="[Insert phone]" placeholder />
            <Field label="Nominated supervisor" value="[Insert name]" placeholder />
            <Field label="Date of notification" value={fmtDate(new Date())} />
          </div>
        </section>

        {/* Section B: Incident */}
        <section className="mt-6 border-t border-ink/10 pt-6">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink/50">Section B: Incident details</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type of incident" value={recordTypeLabel} />
            <Field label="Date and time of incident" value={fmtDateTime(occurredDate)} />
            <Field label="Location of incident" value={report.location ?? "[Not recorded]"} />
            <Field label="Child's name" value={childName} />
          </div>
          <div className="mt-4">
            <Field label="Description of what happened" value={report.description} multiline />
          </div>
        </section>

        {/* Section C: People involved */}
        <section className="mt-6 border-t border-ink/10 pt-6">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink/50">Section C: People involved</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Witness(es)" value={report.witness_name ?? "None recorded"} />
            <Field label="Number of children present" value="[Insert number]" placeholder />
            <Field label="Number of educators present" value="[Insert number]" placeholder />
          </div>
        </section>

        {/* Section D: Immediate actions */}
        <section className="mt-6 border-t border-ink/10 pt-6">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink/50">Section D: Immediate actions taken</h2>
          <Field
            label="Action taken (first aid, medical treatment, etc.)"
            value={report.action_taken ?? "Not recorded"}
            multiline
          />
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Field
              label="Parent / guardian notified"
              value={
                report.parent_notified_at
                  ? `Yes — ${fmtDateTime(new Date(report.parent_notified_at))} (${report.parent_notification_method ?? "method not recorded"})`
                  : "Not yet notified"
              }
            />
            <Field
              label="Nominated supervisor notified"
              value={report.nominated_supervisor_notified ? "Yes" : "No"}
            />
          </div>
          {report.monitoring_plan && (
            <div className="mt-4">
              <Field label="Monitoring / follow-up plan" value={report.monitoring_plan} multiline />
            </div>
          )}
        </section>

        {/* Section E: Declaration */}
        <section className="mt-6 border-t border-ink/10 pt-6">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink/50">Section E: Declaration</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name of person completing this notification" value={report.completed_by_name} />
            <Field label="Role / position" value={report.completed_by_role ?? "[Role]"} placeholder={!report.completed_by_role} />
            <Field label="Signature" value="" placeholder />
            <Field label="Date signed" value="" placeholder />
          </div>
        </section>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-ink/30">
          Pre-filled by SparkPlay from incident record #{id.slice(0, 8)} · Review all details before submitting
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  multiline = false,
  placeholder = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  placeholder?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-ink/40">{label}</p>
      {multiline ? (
        <p className={`mt-1 whitespace-pre-wrap rounded-xl border px-3 py-2 text-sm ${placeholder ? "border-dashed border-ink/20 text-ink/30 italic" : "border-ink/10 text-ink"}`}>
          {value || "[Complete this field]"}
        </p>
      ) : (
        <p className={`mt-1 border-b pb-1 text-sm ${placeholder ? "border-dashed border-ink/20 text-ink/30 italic" : "border-ink/20 text-ink"}`}>
          {value || "[Complete this field]"}
        </p>
      )}
    </div>
  );
}
