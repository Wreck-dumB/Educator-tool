import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getExcursion, getExcursionAttendees } from "@/lib/supabase/excursions";
import { getChildren } from "@/lib/supabase/children";
import { getMyStaffRole } from "@/lib/supabase/staff";
import { cardClass, inputClass, errorBannerClass } from "@/lib/ui";
import PrintButton from "@/components/PrintButton";
import { updateExcursion, deleteExcursion, toggleAttendee } from "../actions";

export default async function ExcursionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const [excursion, attendeeIds, children, myRole] = await Promise.all([
    getExcursion(id),
    getExcursionAttendees(id),
    getChildren(),
    getMyStaffRole(),
  ]);
  if (!excursion) notFound();

  const supabase = await createClient();
  const [{ data: riskAssessments }, { data: permissionSlips }] = await Promise.all([
    supabase.from("risk_assessments").select("id, title").eq("owner_user_id", excursion.owner_user_id),
    supabase.from("permission_slips").select("id, title, slip_type").eq("educator_user_id", excursion.owner_user_id).eq("slip_type", "excursion_consent"),
  ]);

  const canManage = myRole === "director" || myRole === "2ic";
  const attendeeSet = new Set(attendeeIds);
  const attendingChildren = children.filter((c) => attendeeSet.has(c.id));
  const notAttending = children.filter((c) => !attendeeSet.has(c.id));

  const dateLabel = new Date(excursion.excursion_date + "T12:00:00").toLocaleDateString("en-AU", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  // Check health plans for attendees
  const { data: healthPlans } = await supabase
    .from("child_health_plans")
    .select("child_id, plan_name, plan_type, emergency_steps, emergency_medication")
    .in("child_id", attendeeIds.length > 0 ? attendeeIds : ["00000000-0000-0000-0000-000000000000"])
    .eq("is_active", true);

  const plansByChild = new Map<string, typeof healthPlans>();
  for (const plan of healthPlans ?? []) {
    const existing = plansByChild.get(plan.child_id) ?? [];
    existing.push(plan);
    plansByChild.set(plan.child_id, existing);
  }

  return (
    <div className="mx-auto max-w-2xl print:max-w-none">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/excursions" className="text-sm text-coral-dark hover:underline">← Excursions</Link>
        <PrintButton />
      </div>

      <h1 className="font-display mt-2 text-2xl font-semibold text-coral-dark print:text-3xl print:mt-0">
        {excursion.title}
      </h1>
      <p className="text-sm text-ink/60">{dateLabel} · {excursion.destination}</p>

      {error && <p className={errorBannerClass}>{error}</p>}

      {/* Details card */}
      <div className={`mt-4 p-5 ${cardClass} print:border print:border-black`}>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {excursion.departure_time && (
            <>
              <dt className="text-ink/50">Departure</dt>
              <dd className="text-ink">{excursion.departure_time.slice(0, 5)}</dd>
            </>
          )}
          {excursion.return_time && (
            <>
              <dt className="text-ink/50">Return</dt>
              <dd className="text-ink">{excursion.return_time.slice(0, 5)}</dd>
            </>
          )}
          {excursion.transport_method && (
            <>
              <dt className="text-ink/50">Transport</dt>
              <dd className="text-ink">{excursion.transport_method}</dd>
            </>
          )}
          {excursion.supervisor_ratio && (
            <>
              <dt className="text-ink/50">Supervisor ratio</dt>
              <dd className="text-ink">{excursion.supervisor_ratio}</dd>
            </>
          )}
        </dl>
        {excursion.notes && <p className="mt-3 text-sm text-ink/70">{excursion.notes}</p>}
      </div>

      {/* Linked documents */}
      <div className={`mt-4 p-4 ${cardClass} print:hidden`}>
        <h2 className="font-display text-sm font-semibold text-ink mb-3">Linked documents</h2>
        <div className="flex flex-wrap gap-3">
          {excursion.linked_risk_assessment_id ? (
            <Link href={`/risk-assessments`} className="rounded-full bg-sage-light px-3 py-1.5 text-xs font-semibold text-sage-dark hover:bg-sage/20 transition-colors">
              ✓ Risk assessment linked
            </Link>
          ) : (
            <Link href="/risk-assessments" className="rounded-full border border-dashed border-sage-light px-3 py-1.5 text-xs text-ink/40 hover:border-sage hover:text-sage-dark transition-colors">
              + Link risk assessment
            </Link>
          )}
          {excursion.linked_permission_slip_id ? (
            <Link href={`/permission-slips`} className="rounded-full bg-sage-light px-3 py-1.5 text-xs font-semibold text-sage-dark hover:bg-sage/20 transition-colors">
              ✓ Permission slip linked
            </Link>
          ) : (
            <Link href="/permission-slips" className="rounded-full border border-dashed border-sage-light px-3 py-1.5 text-xs text-ink/40 hover:border-sage hover:text-sage-dark transition-colors">
              + Link permission slip
            </Link>
          )}
        </div>

        {/* Link selector (2IC+) */}
        {canManage && (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-coral-dark hover:underline">Link existing documents…</summary>
            <form action={updateExcursion} className="mt-3 space-y-3">
              <input type="hidden" name="id" value={excursion.id} />
              <input type="hidden" name="title" value={excursion.title} />
              <input type="hidden" name="destination" value={excursion.destination} />
              <input type="hidden" name="excursion_date" value={excursion.excursion_date} />
              <input type="hidden" name="departure_time" value={excursion.departure_time ?? ""} />
              <input type="hidden" name="return_time" value={excursion.return_time ?? ""} />
              <input type="hidden" name="transport_method" value={excursion.transport_method ?? ""} />
              <input type="hidden" name="supervisor_ratio" value={excursion.supervisor_ratio ?? ""} />
              <input type="hidden" name="notes" value={excursion.notes ?? ""} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink/60">Risk assessment</label>
                  <select name="linked_risk_assessment_id" defaultValue={excursion.linked_risk_assessment_id ?? ""} className={inputClass}>
                    <option value="">— None —</option>
                    {(riskAssessments ?? []).map((r) => (
                      <option key={r.id} value={r.id}>{r.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink/60">Permission slip</label>
                  <select name="linked_permission_slip_id" defaultValue={excursion.linked_permission_slip_id ?? ""} className={inputClass}>
                    <option value="">— None —</option>
                    {(permissionSlips ?? []).map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" className="rounded-full bg-sage px-4 py-1.5 text-xs font-semibold text-white hover:bg-sage-dark">Save links</button>
            </form>
          </details>
        )}
      </div>

      {/* Attendee list */}
      <div className={`mt-4 ${cardClass}`}>
        <div className="border-b border-coral-light px-4 py-3">
          <h2 className="font-display text-sm font-semibold text-ink">
            Attending children ({attendingChildren.length})
          </h2>
        </div>

        {attendingChildren.length === 0 ? (
          <p className="px-4 py-3 text-sm text-ink/40">No children added yet.</p>
        ) : (
          <ul className="divide-y divide-coral-light">
            {attendingChildren.map((child) => {
              const plans = plansByChild.get(child.id) ?? [];
              return (
                <li key={child.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">{child.first_name}</p>
                      {plans.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {plans.map((p, i) => (
                            <span key={i} className="rounded-full bg-coral-light px-2 py-0.5 text-xs font-semibold text-coral-dark">
                              {p.plan_type} plan
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {canManage && (
                      <form action={toggleAttendee}>
                        <input type="hidden" name="excursion_id" value={excursion.id} />
                        <input type="hidden" name="child_id" value={child.id} />
                        <input type="hidden" name="attending" value="true" />
                        <button type="submit" className="text-xs text-coral-dark hover:underline">Remove</button>
                      </form>
                    )}
                  </div>
                  {/* Show health plan emergency steps on print */}
                  {plans.length > 0 && (
                    <div className="mt-2 hidden print:block space-y-1.5">
                      {plans.map((p, i) => (
                        <div key={i} className="rounded border border-gray-300 p-2 text-xs">
                          <p className="font-bold">{p.plan_name}</p>
                          <p className="mt-0.5">{p.emergency_steps}</p>
                          {p.emergency_medication && <p className="mt-0.5 font-semibold">Medication: {p.emergency_medication}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {canManage && notAttending.length > 0 && (
          <div className="border-t border-coral-light px-4 py-3 print:hidden">
            <form action={toggleAttendee} className="flex items-center gap-2">
              <input type="hidden" name="excursion_id" value={excursion.id} />
              <input type="hidden" name="attending" value="false" />
              <select name="child_id" required className="flex-1 rounded-xl border border-coral-light bg-white px-3 py-1.5 text-sm focus:border-coral focus:outline-none">
                <option value="">Add a child…</option>
                {notAttending.map((c) => (
                  <option key={c.id} value={c.id}>{c.first_name}</option>
                ))}
              </select>
              <button type="submit" className="shrink-0 rounded-full bg-sage px-3 py-1.5 text-xs font-semibold text-white hover:bg-sage-dark">Add</button>
            </form>
          </div>
        )}
      </div>

      {/* Health plan summary for print */}
      {healthPlans && healthPlans.length > 0 && (
        <div className="mt-4 hidden print:block">
          <h2 className="text-lg font-bold">Medical plans — attending children</h2>
          <p className="text-xs text-gray-500 mb-2">Keep this with the attending educator at all times.</p>
        </div>
      )}

      {/* Delete */}
      {myRole === "director" && (
        <div className="mt-6 print:hidden">
          <form action={deleteExcursion}
            onSubmit={(e) => { if (!confirm("Delete this excursion?")) e.preventDefault(); }}>
            <input type="hidden" name="id" value={excursion.id} />
            <button type="submit" className="text-xs text-coral-dark hover:underline">Delete excursion</button>
          </form>
        </div>
      )}
    </div>
  );
}
