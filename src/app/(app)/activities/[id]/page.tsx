import { notFound } from "next/navigation";
import { getActivity } from "@/lib/supabase/activities";
import { getChildren } from "@/lib/supabase/children";
import { getObservations, getSignedPhotoUrl } from "@/lib/supabase/observations";
import { getEylfOutcomes } from "@/lib/supabase/eylf";
import { getRiskAssessments } from "@/lib/supabase/riskAssessments";
import { logObservation } from "@/app/(app)/observations/actions";
import { archiveActivity, unarchiveActivity } from "../actions";
import { getMaterialIcon, getEnergyIcon, getGroupIcon, getEnergyBadgeClass } from "@/lib/icons";
import { cardClass, errorBannerClass } from "@/lib/ui";
import RiskAssessmentPanel from "./RiskAssessmentPanel";
import PersonalisePanel from "./PersonalisePanel";
import ObservationForm from "@/components/ObservationForm";
import ObservationList from "@/components/ObservationList";

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

  const [children, allObservations, riskAssessments, outcomes] = await Promise.all([
    getChildren(),
    getObservations(),
    getRiskAssessments(activity.id),
    getEylfOutcomes(),
  ]);
  const observations = allObservations.filter((o) => o.activity_id === activity.id);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold text-coral-dark">{activity.title}</h1>
        <form action={activity.is_archived ? unarchiveActivity : archiveActivity} className="mt-1 shrink-0">
          <input type="hidden" name="id" value={activity.id} />
          <button type="submit" className="rounded-full border border-ink/20 px-3 py-1.5 text-sm text-ink/50 hover:text-ink/70">
            {activity.is_archived ? "Unarchive" : "Archive"}
          </button>
        </form>
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

      <a
        href={`/worksheet?type=name_trace&title=${encodeURIComponent(activity.title)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-coral-light px-4 py-2 text-sm font-medium text-coral-dark hover:bg-coral-light"
      >
        🖨 Print name stencils
      </a>

      {activity.steps.length > 0 && (
        <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-ink/80">
          {activity.steps.map((step, idx) => (
            <li key={idx}>{step}</li>
          ))}
        </ol>
      )}

      {activity.materials_used.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink/70">
          <span className="font-medium">Materials:</span>
          {activity.materials_used.map((m, idx) => (
            <span key={idx} className="inline-flex items-center gap-1">
              <span aria-hidden>{getMaterialIcon(m)}</span>
              {m}
            </span>
          ))}
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
            />
          </div>
        )}
      </div>

      {observations.length > 0 && (
        <ObservationList observations={observations} />
      )}
    </div>
  );
}
