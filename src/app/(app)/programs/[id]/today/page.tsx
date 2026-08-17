import Link from "next/link";
import { notFound } from "next/navigation";
import { getProgram } from "@/lib/supabase/programs";
import { getActivitiesByIds } from "@/lib/supabase/activities";
import { getChildren } from "@/lib/supabase/children";
import { getEylfOutcomes } from "@/lib/supabase/eylf";
import { getServiceObservationTypes } from "@/lib/supabase/services";
import { isWeekday, eachDateInRange } from "@/lib/programDates";
import { DEFAULT_PROGRAM_BLOCKS } from "@/lib/programBlocks";
import { logObservation } from "@/app/(app)/observations/actions";
import ObservationForm, { ObservationTypeName } from "@/components/ObservationForm";
import { cardClass } from "@/lib/ui";
import type { ProgramEntry } from "@/lib/types/domain";
import type { ActivityWithOutcomes } from "@/lib/supabase/activities";

function formatDateLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default async function ProgramTodayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { id } = await params;
  const { date: dateParam } = await searchParams;
  const program = await getProgram(id);
  if (!program) notFound();

  const weekdayDates = eachDateInRange(program.start_date, program.end_date).filter(isWeekday);
  const today = new Date().toISOString().slice(0, 10);
  const selectedDate =
    dateParam && weekdayDates.includes(dateParam)
      ? dateParam
      : weekdayDates.includes(today)
      ? today
      : weekdayDates[0];

  const [children, outcomes, enabledObsTypes] = await Promise.all([
    getChildren(),
    getEylfOutcomes(),
    getServiceObservationTypes(),
  ]);

  const dayEntries = selectedDate ? program.entries.filter((e) => e.day_date === selectedDate) : [];
  const activityIds = [...new Set(dayEntries.filter((e) => e.activity_id).map((e) => e.activity_id!))];
  const activities = activityIds.length > 0 ? await getActivitiesByIds(activityIds) : [];
  const activityById = new Map(activities.map((a) => [a.id, a]));

  const blocks = program.blocks.length > 0 ? program.blocks : DEFAULT_PROGRAM_BLOCKS;
  const groups = [
    ...blocks.map((b) => ({
      label: b.label,
      entries: dayEntries.filter((e) => e.block_key === b.key).sort((a, b2) => a.order_index - b2.order_index),
    })),
    {
      label: "Other activities today",
      entries: dayEntries.filter((e) => !e.block_key).sort((a, b2) => a.order_index - b2.order_index),
    },
  ].filter((g) => g.entries.length > 0);

  const returnTo = `/programs/${id}/today?date=${selectedDate}`;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/programs/${id}`} className="text-sm text-coral-dark hover:underline">
          ← Back to editor
        </Link>
      </div>

      <h1 className="mt-4 font-display text-2xl font-semibold text-coral-dark">{program.title}</h1>
      <p className="mt-1 text-sm text-ink/60">
        The room&rsquo;s plan for the day — open an activity for what to actually do, so it&rsquo;s easy to follow even if you&rsquo;re not usually in this room.
      </p>

      {weekdayDates.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {weekdayDates.map((date) => {
            const isSelected = date === selectedDate;
            return (
              <Link
                key={date}
                href={`/programs/${id}/today?date=${date}`}
                className={
                  isSelected
                    ? "rounded-full bg-coral px-4 py-1.5 text-sm font-semibold text-white"
                    : "rounded-full border border-coral-light px-4 py-1.5 text-sm font-medium text-ink/60 hover:bg-coral-light/40"
                }
              >
                {formatDateLabel(date)}
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-6 space-y-6">
        {groups.length === 0 && (
          <p className="text-sm text-ink/50">Nothing planned for this day yet.</p>
        )}
        {groups.map((group) => (
          <div key={group.label}>
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink/50">{group.label}</h2>
            <div className="mt-2 space-y-3">
              {group.entries.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  activity={entry.activity_id ? activityById.get(entry.activity_id) ?? null : null}
                  programId={id}
                  children={children}
                  outcomes={outcomes}
                  enabledObsTypes={enabledObsTypes}
                  returnTo={returnTo}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EntryCard({
  entry,
  activity,
  programId,
  children,
  outcomes,
  enabledObsTypes,
  returnTo,
}: {
  entry: ProgramEntry;
  activity: ActivityWithOutcomes | null;
  programId: string;
  children: { id: string; first_name: string }[];
  outcomes: { id: string; code: string; sub_outcome_text: string }[];
  enabledObsTypes: string[];
  returnTo: string;
}) {
  const hasCustomSteps = !activity && entry.steps.length > 0;

  return (
    <details className={`group ${cardClass}`}>
      <summary className="flex cursor-pointer items-start justify-between gap-3 p-4">
        <div>
          <p className="font-display text-base font-semibold text-ink">{entry.title}</p>
          {entry.notes && <p className="mt-0.5 text-sm text-ink/60">{entry.notes}</p>}
        </div>
        <span className="shrink-0 text-xs text-ink/40 group-open:hidden">Tap for directions</span>
      </summary>

      <div className="border-t border-coral-light px-4 pb-4 pt-4">
        {activity ? (
          <>
            {activity.steps.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">What to do</p>
                <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-ink">
                  {activity.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
            {activity.materials_used.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">Materials</p>
                <p className="mt-1 text-sm text-ink/70">{activity.materials_used.join(", ")}</p>
              </div>
            )}
            {activity.reflection_prompts.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">Reflect afterward</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink/70">
                  {activity.reflection_prompts.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
            <Link href={`/activities/${activity.id}`} className="mt-3 inline-block text-xs font-medium text-coral-dark hover:underline">
              Open full activity →
            </Link>
          </>
        ) : hasCustomSteps ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">What to do</p>
            <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-ink">
              {entry.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
        ) : (
          <p className="text-sm text-ink/50">
            No step-by-step directions added yet.{" "}
            <Link href={`/programs/${programId}`} className="text-coral-dark hover:underline">
              Add some in the editor →
            </Link>
          </p>
        )}

        {children.length > 0 && (
          <details className="mt-4 group/obs">
            <summary className="cursor-pointer list-none text-sm font-medium text-coral-dark">
              Log an observation for this activity
            </summary>
            <div className="mt-3">
              <ObservationForm
                action={logObservation}
                children={children}
                outcomes={outcomes}
                activityId={activity?.id}
                programEntryId={entry.id}
                defaultEylfCodes={entry.eylf_codes}
                returnTo={returnTo}
                enabledTypes={enabledObsTypes as ObservationTypeName[]}
              />
            </div>
          </details>
        )}
      </div>
    </details>
  );
}
