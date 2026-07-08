import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { getMyReflections } from "@/lib/supabase/reflections";
import ReflectionSection from "@/components/ReflectionSection";

const TYPE_LABELS: Record<string, string> = {
  post_incident: "Post-incident",
  end_of_day: "End of day",
  general: "General",
};

export default async function ReflectionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/");

  const reflections = await getMyReflections();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Reflective Practice</h1>
        <p className="mt-1 text-sm text-ink/60">
          Describe a situation and get tailored reflective questions to support your professional growth.
        </p>
      </div>

      {/* New reflection form */}
      <section className="rounded-2xl border border-coral-light bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-display text-base font-semibold text-ink">New reflection</h2>
        <ReflectionSection ownerUserId={ownerUserId} />
      </section>

      {/* Past reflections */}
      {reflections.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-base font-semibold text-ink">Past reflections</h2>
          <div className="space-y-4">
            {reflections.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-coral-light bg-white p-5 shadow-sm"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-coral-light px-2.5 py-0.5 text-xs font-medium text-coral-dark">
                    {TYPE_LABELS[r.reflection_type] ?? r.reflection_type}
                  </span>
                  <span className="text-xs text-ink/40">
                    {new Date(r.created_at).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <p className="text-sm text-ink/70">{r.context_text}</p>

                {Array.isArray(r.ai_questions) && (r.ai_questions as string[]).length > 0 && (
                  <div className="mt-4 space-y-3">
                    {(r.ai_questions as string[]).map((q, i) => (
                      <div key={i} className="border-t border-coral-light pt-3">
                        <p className="text-xs font-medium text-ink/60">{q}</p>
                        <p className="mt-1 text-sm text-ink">
                          {(r.responses as string[])[i] || (
                            <span className="text-ink/30 italic">No answer recorded</span>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {r.key_learning && (
                  <div className="mt-4 rounded-xl bg-sage-light px-4 py-3">
                    <p className="text-xs font-medium text-sage-dark">Key learning</p>
                    <p className="mt-0.5 text-sm text-sage-dark">{r.key_learning}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {reflections.length === 0 && (
        <p className="text-center text-sm text-ink/40">
          Your reflections will appear here after you save your first one.
        </p>
      )}
    </div>
  );
}
