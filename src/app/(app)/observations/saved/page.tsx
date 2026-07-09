import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { shareObservation } from "@/app/(app)/observations/actions";
import { updateChildInterests } from "@/app/(app)/children/actions";
import { addActivityToProgram } from "@/app/(app)/programs/actions";
import { addFollowUp } from "@/app/(app)/follow-ups/actions";
import { cardClass, errorBannerClass, inputClass } from "@/lib/ui";

export default async function ObservationSavedPage({
  searchParams,
}: {
  searchParams: Promise<{ obs?: string; activity?: string; from?: string; error?: string }>;
}) {
  const { obs, activity: activityId, from: fromRaw, error } = await searchParams;
  const fromUrl = fromRaw ? decodeURIComponent(fromRaw) : "/observations";
  const obsIds = (obs ?? "").split(",").filter(Boolean);

  if (obsIds.length === 0) redirect("/observations");

  const supabase = await createClient();

  // Fetch saved observations
  const { data: observations } = await supabase
    .from("observations")
    .select("id, child_id, note_text, shared_with_parent_at")
    .in("id", obsIds);

  if (!observations || observations.length === 0) redirect("/observations");

  // Fetch child details
  const childIds = [...new Set(observations.map((o) => o.child_id))];
  const { data: children } = await supabase
    .from("children")
    .select("id, first_name, current_interests")
    .in("id", childIds);
  const childMap = new Map((children ?? []).map((c) => [c.id, c]));

  // Fetch activity + EYLF codes if linked
  let activityTitle = "";
  let activityEylfCodesJson = "[]";
  if (activityId) {
    const [{ data: act }, { data: links }, { data: outcomes }] = await Promise.all([
      supabase.from("generated_activities").select("title").eq("id", activityId).maybeSingle(),
      supabase.from("activity_eylf_links").select("eylf_outcome_id").eq("activity_id", activityId),
      supabase.from("eylf_outcomes").select("id, code"),
    ]);
    activityTitle = act?.title ?? "";
    if (links && outcomes) {
      const codeById = new Map((outcomes ?? []).map((o) => [o.id, o.code]));
      const codes = (links ?? []).map((l) => codeById.get(l.eylf_outcome_id)).filter(Boolean) as string[];
      activityEylfCodesJson = JSON.stringify(codes);
    }
  }

  // Fetch programs for "add to program" option
  const { data: programs } = activityId
    ? await supabase
        .from("programs")
        .select("id, title, start_date, end_date")
        .order("start_date", { ascending: false })
        .limit(8)
    : { data: null };

  const today = new Date().toISOString().slice(0, 10);
  const savedUrl = `/observations/saved?obs=${obsIds.join(",")}&from=${encodeURIComponent(fromUrl)}${activityId ? `&activity=${encodeURIComponent(activityId)}` : ""}`;

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sage-light text-xl">
          ✓
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-coral-dark">Observation saved</h1>
          <p className="text-sm text-ink/60">
            {obsIds.length > 1 ? `Logged for ${obsIds.length} children.` : "Logged and ready to share."}
          </p>
        </div>
      </div>

      {error && <p className={`mb-4 ${errorBannerClass}`}>{error}</p>}

      <div className="space-y-5">
        {observations.map((obs) => {
          const child = childMap.get(obs.child_id);
          if (!child) return null;
          const currentPage = `${savedUrl}&obs=${obs.id}`;

          return (
            <div key={obs.id} className={cardClass}>
              <div className="border-b border-coral-light px-4 py-3">
                <p className="font-display font-semibold text-ink">{child.first_name}</p>
                <p className="mt-0.5 line-clamp-2 text-sm text-ink/70">{obs.note_text}</p>
              </div>

              <div className="divide-y divide-coral-light">
                {/* Share with parent */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-ink">Share with parent</p>
                    <p className="text-xs text-ink/50">
                      {obs.shared_with_parent_at ? "Already shared" : "Send to linked parents"}
                    </p>
                  </div>
                  {obs.shared_with_parent_at ? (
                    <span className="rounded-full bg-sage-light px-3 py-1 text-xs font-semibold text-sage-dark">
                      Shared
                    </span>
                  ) : (
                    <form action={shareObservation}>
                      <input type="hidden" name="id" value={obs.id} />
                      <input type="hidden" name="return_to" value={savedUrl} />
                      <button
                        type="submit"
                        className="rounded-full bg-sage-light px-3 py-1.5 text-xs font-semibold text-sage-dark hover:bg-sage/30 transition-colors"
                      >
                        Share now
                      </button>
                    </form>
                  )}
                </div>

                {/* Update interests */}
                <details className="group px-4 py-3">
                  <summary className="cursor-pointer list-none text-sm font-medium text-ink">
                    Update {child.first_name}&apos;s interests
                    <span className="ml-2 text-xs text-ink/40 group-open:hidden">
                      {child.current_interests ? "(currently set)" : "(not set)"}
                    </span>
                  </summary>
                  <form action={updateChildInterests} className="mt-3">
                    <input type="hidden" name="child_id" value={child.id} />
                    <input type="hidden" name="return_to" value={savedUrl} />
                    <label className="mb-1 block text-xs font-medium text-ink/60">
                      Current interests — shown to AI when generating activities
                    </label>
                    <textarea
                      name="interests"
                      rows={3}
                      defaultValue={child.current_interests ?? ""}
                      placeholder="e.g. dinosaurs, painting, trucks, water play…"
                      className={`${inputClass} resize-none`}
                    />
                    <button
                      type="submit"
                      className="mt-2 rounded-full bg-coral-light px-4 py-1.5 text-xs font-semibold text-coral-dark hover:bg-coral/20 transition-colors"
                    >
                      Save interests
                    </button>
                  </form>
                </details>

                {/* Add to program */}
                {activityId && activityTitle && programs && programs.length > 0 && (
                  <details className="group px-4 py-3">
                    <summary className="cursor-pointer list-none text-sm font-medium text-ink">
                      Add &ldquo;{activityTitle}&rdquo; to a program
                    </summary>
                    <form action={addActivityToProgram} className="mt-3 space-y-3">
                      <input type="hidden" name="activity_id" value={activityId} />
                      <input type="hidden" name="title" value={activityTitle} />
                      <input type="hidden" name="eylf_codes" value={activityEylfCodesJson} />
                      <div>
                        <label className="mb-1 block text-xs font-medium text-ink/60">Program</label>
                        <select name="program_id" className={inputClass}>
                          {programs.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.title} ({new Date(p.start_date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })} –{" "}
                              {new Date(p.end_date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-ink/60">Day</label>
                        <input type="date" name="day_date" defaultValue={today} className={inputClass} />
                      </div>
                      <button
                        type="submit"
                        className="rounded-full bg-coral-light px-4 py-1.5 text-xs font-semibold text-coral-dark hover:bg-coral/20 transition-colors"
                      >
                        Add to program
                      </button>
                    </form>
                  </details>
                )}

                {activityId && activityTitle && (!programs || programs.length === 0) && (
                  <div className="px-4 py-3">
                    <p className="text-sm text-ink/50">
                      Want to add this activity to a program?{" "}
                      <Link href="/programs" className="text-coral-dark hover:underline">
                        Create a program first →
                      </Link>
                    </p>
                  </div>
                )}

                {/* Note a follow-up */}
                <details className="group px-4 py-3">
                  <summary className="cursor-pointer list-none text-sm font-medium text-ink">
                    Note a follow-up for {child.first_name}
                    <span className="ml-2 text-xs text-ink/40 group-open:hidden">What to explore next</span>
                  </summary>
                  <form action={addFollowUp} className="mt-3">
                    <input type="hidden" name="child_id" value={child.id} />
                    <input type="hidden" name="observation_id" value={obs.id} />
                    <input type="hidden" name="return_to" value={savedUrl} />
                    <textarea
                      name="note"
                      rows={2}
                      placeholder="e.g. Wants to try mixing colours with water — explore colour theory experiments"
                      className={`${inputClass} resize-none`}
                    />
                    <button
                      type="submit"
                      className="mt-2 rounded-full bg-coral-light px-4 py-1.5 text-xs font-semibold text-coral-dark hover:bg-coral/20 transition-colors"
                    >
                      Save follow-up
                    </button>
                  </form>
                </details>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Link
          href={fromUrl}
          className="rounded-full bg-coral px-5 py-2.5 text-sm font-semibold text-white hover:bg-coral-dark transition-colors"
        >
          Done
        </Link>
        <Link href="/observations" className="text-sm text-ink/50 hover:text-coral-dark">
          View all observations →
        </Link>
      </div>
    </div>
  );
}
