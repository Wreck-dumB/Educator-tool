import { notFound } from "next/navigation";
import { getActivity } from "@/lib/supabase/activities";
import { getChildren } from "@/lib/supabase/children";
import { getObservations, getSignedPhotoUrl } from "@/lib/supabase/observations";
import { getEylfOutcomes } from "@/lib/supabase/eylf";
import { getRiskAssessments } from "@/lib/supabase/riskAssessments";
import { getMaterials } from "@/lib/supabase/materials";
import { logObservation } from "@/app/(app)/observations/actions";
import { addActivityToProgram } from "@/app/(app)/programs/actions";
import { getPrograms } from "@/lib/supabase/programs";
import { archiveActivity, unarchiveActivity } from "../actions";
import { getMaterialIcon, getEnergyIcon, getGroupIcon, getEnergyBadgeClass } from "@/lib/icons";
import { cardClass, errorBannerClass } from "@/lib/ui";
import { getServiceObservationTypes } from "@/lib/supabase/services";
import { getMaterialStatuses } from "@/lib/materialsMatch";
import RiskAssessmentPanel from "./RiskAssessmentPanel";
import PersonalisePanel from "./PersonalisePanel";
import ObservationForm, { ObservationTypeName } from "@/components/ObservationForm";
import ObservationList from "@/components/ObservationList";
import { detectPrintTemplate, buildWorksheetUrl, TEMPLATE_LABELS } from "@/lib/utils/printable";
import DeleteActivityButton from "./DeleteActivityButton";

export default async function ActivityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const activity = await getActivity(id);
  if (!activity) notFound();

  const [children, allObservations, riskAssessments, outcomes, programs, enabledObsTypes, inventory] = await Promise.all([
    getChildren(),
    getObservations(),
    getRiskAssessments(activity.id),
    getEylfOutcomes(),
    getPrograms(),
    getServiceObservationTypes(),
    getMaterials(),
  ]);

  const materialStatuses = activity.materials_used.length > 0
    ? getMaterialStatuses(activity.materials_used, inventory)
    : [];
  const observations = allObservations.filter((o) => o.activity_id === activity.id);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold text-coral-dark">{activity.title}</h1>
        <div className="mt-1 flex shrink-0 items-center gap-2">
          <form action={activity.is_archived ? unarchiveActivity : archiveActivity}>
            <input type="hidden" name="id" value={activity.id} />
            <button type="submit" className="rounded-full border border-ink/20 px-3 py-1.5 text-sm text-ink/50 hover:text-ink/70">
              {activity.is_archived ? "Unarchive" : "Archive"}
            </button>
          </form>
          <DeleteActivityButton id={activity.id} />
        </div>
      </div>
      {activity.is_archived && (
        <p className="mt-1 rounded-xl bg-ink/5 px-3 py-2 text-xs text-ink/50">
          This activity is archived — it won&apos;t appear in your active library.
        </p>
      )}
      <p className="mt-2 text-ink/70">{activity.summary}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {activity.energy_level && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${getEnergyBadgeClass(activity.energy_level)}`}
          >
            {getEnergyIcon(activity.energy_level)} {activity.energy_level} energy
          </span>
        )}
        {activity.group_size_fit && (
          <span className="inline-flex items-center gap-1 rounded-full bg-cream-dark px-2.5 py-1 text-xs font-medium text-ink/70">
            {getGroupIcon(activity.group_size_fit)} {activity.group_size_fit.replace("_", " ")}
          </span>
        )}
        {activity.duration_minutes && <span className="text-xs text-ink/50">{activity.duration_minutes} min</span>}
        {activity.age_range && <span className="text-xs text-ink/50">&middot; {activity.age_range}</span>}
      </div>

      {activity.eylf_codes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {activity.eylf_codes.map((code) => (
            <span
              key={code}
              className="rounded-full bg-sage-light px-2 py-0.5 text-xs font-medium text-sage-dark"
            >
              EYLF {code}
            </span>
          ))}
        </div>
      )}

      {(() => {
        const tpl = detectPrintTemplate(activity);
        return (
          <a
            href={buildWorksheetUrl(tpl, activity)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-coral-light px-4 py-2 text-sm font-medium text-coral-dark hover:bg-coral-light"
          >
            🖨 Print {TEMPLATE_LABELS[tpl].toLowerCase()}
          </a>
        );
      })()}

      {activity.steps.length > 0 && (
        <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-ink/80">
          {activity.steps.map((step, idx) => (
            <li key={idx}>{step}</li>
          ))}
        </ol>
      )}

      {materialStatuses.length > 0 && (
        <div className={`mt-4 ${cardClass} p-4`}>
          <p className="mb-2 text-sm font-semibold text-ink">Materials check</p>
          <ul className="space-y-1.5">
            {materialStatuses.map((s) => (
              <li key={s.name} className="flex items-center gap-2 text-sm">
                <span aria-hidden className="text-base">{getMaterialIcon(s.name)}</span>
                <span className="flex-1 text-ink">{s.name}</span>
                {s.status === "in_stock" && (
                  <span className="rounded-full bg-sage-light px-2 py-0.5 text-xs font-medium text-sage-dark">
                    ✓ In stock{s.match?.quantity != null ? ` (${s.match.quantity}${s.match.unit ? ` ${s.match.unit}` : ""})` : ""}
                  </span>
                )}
                {s.status === "low_stock" && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    ⚠ Low stock — {s.match!.quantity} {s.match!.unit ?? ""} left
                  </span>
                )}
                {s.status === "not_in_inventory" && (
                  <span className="rounded-full bg-coral-light px-2 py-0.5 text-xs font-medium text-coral-dark">
                    🛒 Not in inventory
                  </span>
                )}
              </li>
            ))}
          </ul>
          {materialStatuses.some((s) => s.status !== "in_stock") && (
            <a
              href="/materials"
              className="mt-3 block text-xs font-medium text-coral-dark hover:underline"
            >
              Update inventory →
            </a>
          )}
        </div>
      )}

      {activity.reflection_prompts.length > 0 && (
        <div className="mt-3 rounded-xl bg-amber-light p-3">
          <p className="text-sm font-medium text-amber-dark">Reflection prompts</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-amber-dark/90">
            {activity.reflection_prompts.map((p, idx) => (
              <li key={idx}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className={errorBannerClass}>{error}</p>}

      <PersonalisePanel activityId={activity.id} children={children} />

      <RiskAssessmentPanel
        activityId={activity.id}
        activityTitle={activity.title}
        savedAssessments={riskAssessments}
      />

      <div className={`mt-6 p-5 ${cardClass}`}>
        <h2 className="font-display text-sm font-semibold text-ink">Log an observation</h2>
        {children.length === 0 ? (
          <p className="mt-2 text-sm text-ink/50">
            Add a child profile first to log an observation against this activity.
          </p>
        ) : (
          <div className="mt-4">
            <ObservationForm
              action={logObservation}
              children={children}
              outcomes={outcomes}
              activityId={activity.id}
              defaultEylfCodes={activity.eylf_codes}
              returnTo={`/activities/${activity.id}`}
              enabledTypes={enabledObsTypes as ObservationTypeName[]}
            />
          </div>
        )}
      </div>

      {programs.length > 0 && (
        <details className={`mt-6 group ${cardClass}`}>
          <summary className="flex cursor-pointer items-center justify-between p-5">
            <span className="font-display text-sm font-semibold text-ink">Add to a program</span>
            <span className="text-xs text-ink/40 group-open:hidden">Click to expand</span>
          </summary>
          <div className="border-t border-coral-light px-5 pb-5 pt-4">
            <form action={addActivityToProgram} className="space-y-3">
              <input type="hidden" name="activity_id" value={activity.id} />
              <input type="hidden" name="title" value={activity.title} />
              <input type="hidden" name="eylf_codes" value={JSON.stringify(activity.eylf_codes)} />
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">Program</label>
                <select name="program_id" className="w-full rounded-xl border border-coral-light bg-white px-3 py-2 text-sm text-ink focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral">
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({new Date(p.start_date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })} – {new Date(p.end_date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">Day</label>
                <input
                  type="date"
                  name="day_date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="w-full rounded-xl border border-coral-light bg-white px-3 py-2 text-sm text-ink focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
                />
              </div>
              {materialStatuses.length > 0 && (
                <div className="rounded-xl bg-cream-dark/40 p-3">
                  <p className="mb-2 text-xs font-semibold text-ink/70">Materials you&apos;ll need before this date</p>
                  <ul className="space-y-1">
                    {materialStatuses.map((s) => (
                      <li key={s.name} className="flex items-center gap-1.5 text-xs">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          s.status === "in_stock" ? "bg-sage" : s.status === "low_stock" ? "bg-amber-400" : "bg-coral"
                        }`} />
                        <span className="text-ink/80">{s.name}</span>
                        {s.status === "in_stock" && s.match?.quantity != null && (
                          <span className="text-ink/40">— {s.match.quantity} {s.match.unit ?? ""} in stock</span>
                        )}
                        {s.status === "low_stock" && (
                          <span className="font-medium text-amber-700">— only {s.match!.quantity} left</span>
                        )}
                        {s.status === "not_in_inventory" && (
                          <span className="font-medium text-coral-dark">— not in inventory</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                type="submit"
                className="rounded-full bg-coral-light px-4 py-2 text-xs font-semibold text-coral-dark hover:bg-coral/20 transition-colors"
              >
                Add to program →
              </button>
            </form>
          </div>
        </details>
      )}

      {observations.length > 0 && (
        <ObservationList observations={observations} />
      )}
    </div>
  );
}
