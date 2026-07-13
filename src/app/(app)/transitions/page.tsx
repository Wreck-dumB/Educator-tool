import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { getTransitionStatements } from "@/lib/supabase/transitions";
import { cardClass, primaryButtonClass } from "@/lib/ui";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Transition Statements · DR. SparkPlay" };

const TYPE_LABELS: Record<string, string> = {
  to_school: "To school",
  between_rooms: "Room transition",
  between_services: "Service transition",
};

export default async function TransitionsPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string; type?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/onboarding");

  const { child: preselectedChildId, type: preselectedType } = await searchParams;

  const [statements, { data: children }] = await Promise.all([
    getTransitionStatements(),
    supabase
      .from("children")
      .select("id, first_name, date_of_birth")
      .eq("owner_user_id", ownerUserId)
      .is("enrolment_ended_at", null)
      .order("first_name"),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Transition Statements</h1>
        <p className="mt-1 text-sm text-ink/50">
          AI-assisted, strengths-based transition statements for children moving to school, a new
          room, or another service. Drafts are editable; finalise when ready to share.
        </p>
      </div>

      {/* New statement form */}
      <div className={cardClass + " p-5"}>
        <h2 className="font-display text-base font-semibold text-ink mb-4">New statement</h2>
        <form
          method="GET"
          action="/transitions/edit"
          className="flex flex-wrap gap-3 items-end"
        >
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-ink/70 mb-1">Child</label>
            <select
              name="child"
              required
              defaultValue={preselectedChildId ?? ""}
              className="mt-1 block w-full rounded-xl border border-coral-light bg-white px-3 py-2 shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral text-sm"
            >
              <option value="" disabled>Select a child…</option>
              {(children ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.first_name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-ink/70 mb-1">Transition type</label>
            <select
              name="type"
              defaultValue={preselectedType ?? "to_school"}
              className="mt-1 block w-full rounded-xl border border-coral-light bg-white px-3 py-2 shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral text-sm"
            >
              <option value="to_school">To primary school</option>
              <option value="between_rooms">Between rooms</option>
              <option value="between_services">Between services</option>
            </select>
          </div>
          <button type="submit" className={primaryButtonClass}>
            Open / create
          </button>
        </form>
      </div>

      {/* Existing statements */}
      <div className={cardClass + " p-5"}>
        <h2 className="font-display text-base font-semibold text-ink mb-4">Saved statements</h2>
        {statements.length === 0 ? (
          <p className="text-sm text-ink/40">No transition statements yet.</p>
        ) : (
          <ul className="divide-y divide-coral-light/50">
            {statements.map((s) => (
              <li key={s.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">
                      {s.child_first_name}
                      <span className="ml-2 text-xs font-normal text-ink/40">
                        {TYPE_LABELS[s.transition_type] ?? s.transition_type}
                      </span>
                    </p>
                    {s.draft_text ? (
                      <p className="mt-1 text-xs text-ink/60 line-clamp-2">{s.draft_text}</p>
                    ) : (
                      <p className="mt-1 text-xs text-ink/30 italic">No text yet</p>
                    )}
                    <p className="mt-1 text-xs text-ink/30">
                      {s.finalized_at ? (
                        <span className="text-sage-dark font-medium">
                          Finalised {new Date(s.finalized_at).toLocaleDateString("en-AU")}
                        </span>
                      ) : (
                        `Updated ${new Date(s.updated_at).toLocaleDateString("en-AU")}`
                      )}
                    </p>
                  </div>
                  <Link
                    href={`/transitions/edit?child=${s.child_id}&type=${s.transition_type}`}
                    className="shrink-0 text-xs font-medium text-coral-dark hover:underline"
                  >
                    {s.finalized_at ? "View" : "Edit"}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
