import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { cardClass } from "@/lib/ui";
import { addFollowUp, markFollowUpDone, reopenFollowUp } from "./actions";
import GroupSuggestionPanel from "@/components/GroupSuggestionPanel";
import type { FollowUpForGroup } from "@/components/GroupSuggestionPanel";
import Link from "next/link";

export const metadata: Metadata = { title: "Follow-ups · SparkPlay" };

export default async function FollowUpsPage() {
  const supabase = await createClient();
  const ownerUserId = await getMyServiceOwnerId();

  const [{ data: followUps }, { data: children }] = await Promise.all([
    ownerUserId
      ? supabase
          .from("child_follow_ups")
          .select("*")
          .eq("owner_user_id", ownerUserId)
          .order("created_at", { ascending: false })
      : { data: [] as never[] },
    ownerUserId
      ? supabase
          .from("children")
          .select("id, first_name")
          .eq("owner_user_id", ownerUserId)
          .order("first_name")
      : { data: [] as never[] },
  ]);

  const childMap = new Map((children ?? []).map((c) => [c.id, c.first_name as string]));
  const openFollowUps = (followUps ?? []).filter((f) => f.status === "open");
  const doneFollowUps = (followUps ?? []).filter((f) => f.status === "done");

  const followUpsForGroup: FollowUpForGroup[] = openFollowUps.map((f) => ({
    id: f.id,
    childName: childMap.get(f.child_id) ?? "Child",
    note: f.note,
  }));

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-coral-dark">Follow-ups</h1>
          <p className="mt-1 text-sm text-ink/60">
            Notes on what to explore next with each child — select similar ones to get a group activity.
          </p>
        </div>
        <Link
          href="/observations"
          className="mt-1 shrink-0 rounded-full border border-coral-light px-3 py-1.5 text-xs font-medium text-coral-dark hover:bg-coral-light"
        >
          + Log observation
        </Link>
      </div>

      {/* Quick add form */}
      <details className={`mt-6 group ${cardClass}`}>
        <summary className="flex cursor-pointer items-center justify-between p-4">
          <span className="text-sm font-semibold text-ink">Add a follow-up note</span>
          <span className="text-xs text-ink/40 group-open:hidden">Click to expand</span>
        </summary>
        <div className="border-t border-coral-light px-4 pb-4 pt-3">
          <form action={addFollowUp} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Child</label>
              <select name="child_id" required className="w-full rounded-xl border border-coral-light bg-white px-3 py-2 text-sm text-ink focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral">
                <option value="">Select child…</option>
                {(children ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.first_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Follow-up note</label>
              <textarea
                name="note"
                rows={2}
                required
                placeholder="e.g. Wants to explore mixing more colours — try secondary colour experiments"
                className="w-full resize-none rounded-xl border border-coral-light bg-white px-3 py-2 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
              />
            </div>
            <input type="hidden" name="return_to" value="/follow-ups" />
            <button
              type="submit"
              className="rounded-full bg-coral-light px-4 py-1.5 text-xs font-semibold text-coral-dark hover:bg-coral/20 transition-colors"
            >
              Save follow-up
            </button>
          </form>
        </div>
      </details>

      {/* Open follow-ups */}
      <div className="mt-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink/40">
          Open ({openFollowUps.length})
        </h2>

        {openFollowUps.length === 0 && (
          <div className={`p-6 text-center ${cardClass}`}>
            <p className="text-sm text-ink/50">No open follow-ups yet.</p>
            <p className="mt-1 text-xs text-ink/40">
              Add one above, or use the &ldquo;Note a follow-up&rdquo; option after logging an observation.
            </p>
          </div>
        )}

        <div className="space-y-2">
          {openFollowUps.map((f) => (
            <div key={f.id} className={`flex items-start gap-3 p-4 ${cardClass}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-coral-light px-2 py-0.5 text-xs font-semibold text-coral-dark">
                    {childMap.get(f.child_id) ?? "Child"}
                  </span>
                  <span className="text-xs text-ink/40">
                    {new Date(f.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-ink/80">{f.note}</p>
                {f.observation_id && (
                  <p className="mt-1 text-xs text-ink/40">From an observation</p>
                )}
              </div>
              <form action={markFollowUpDone}>
                <input type="hidden" name="id" value={f.id} />
                <input type="hidden" name="return_to" value="/follow-ups" />
                <button
                  type="submit"
                  className="shrink-0 rounded-full border border-sage-light px-3 py-1.5 text-xs font-medium text-sage-dark hover:bg-sage-light transition-colors"
                >
                  Mark done
                </button>
              </form>
            </div>
          ))}
        </div>
      </div>

      {/* Group suggestion panel — only shows when there are 2+ open follow-ups */}
      {openFollowUps.length >= 2 && (
        <div className="mt-6">
          <GroupSuggestionPanel followUps={followUpsForGroup} />
        </div>
      )}

      {/* Done follow-ups */}
      {doneFollowUps.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-widest text-ink/40">
            Done ({doneFollowUps.length})
          </summary>
          <div className="mt-3 space-y-2">
            {doneFollowUps.map((f) => (
              <div key={f.id} className={`flex items-start gap-3 p-4 opacity-60 ${cardClass}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-ink/10 px-2 py-0.5 text-xs font-semibold text-ink/50">
                      {childMap.get(f.child_id) ?? "Child"}
                    </span>
                    <span className="text-xs text-ink/40">
                      {f.resolved_at
                        ? new Date(f.resolved_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })
                        : "Done"}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-ink/60 line-through">{f.note}</p>
                </div>
                <form action={reopenFollowUp}>
                  <input type="hidden" name="id" value={f.id} />
                  <button
                    type="submit"
                    className="shrink-0 text-xs text-ink/30 hover:text-coral-dark transition-colors"
                  >
                    Reopen
                  </button>
                </form>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
