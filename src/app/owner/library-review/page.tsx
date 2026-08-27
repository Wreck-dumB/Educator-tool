import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPendingAdminReview } from "@/lib/supabase/sharedLibrary";
import { TEMPLATE_LABELS, type PrintTemplateType } from "@/lib/utils/printable";
import { topicTagLabel } from "@/lib/topicTags";
import { approveSubmission, rejectSubmission } from "./actions";

export const metadata: Metadata = { title: "Library review · DR. SparkPlay" };

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function LibraryReviewPage() {
  const submissions = await getPendingAdminReview();
  const admin = createAdminClient();

  const [servicesRes, usersRes] = await Promise.all([
    admin.from("services").select("director_user_id, name, display_name"),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  const emailByUserId = new Map((usersRes.data?.users ?? []).map((u) => [u.id, u.email ?? ""]));
  const serviceByOwner = new Map((servicesRes.data ?? []).map((s) => [s.director_user_id, s.display_name || s.name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Community library review</h1>
        <p className="mt-1 text-sm text-ink/60">
          Activities that passed automated copyright/personal-information review and are waiting on
          your approval before becoming visible to every other service. The AI&apos;s own note is shown
          under each one — it&apos;s a first pass, not a substitute for actually reading the content.
        </p>
        <span className="mt-3 inline-block rounded-full border border-ink/10 bg-white px-3 py-1 text-xs text-ink/70">
          {submissions.length} pending
        </span>
      </div>

      {submissions.length === 0 ? (
        <p className="rounded-2xl border border-ink/10 bg-white p-6 text-sm text-ink/60">
          Nothing waiting on review right now.
        </p>
      ) : (
        <div className="space-y-4">
          {submissions.map((s) => (
            <div key={s.id} className="rounded-2xl border border-ink/10 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold text-ink">{s.title}</h2>
                  <p className="mt-0.5 text-xs text-ink/50">
                    From {serviceByOwner.get(s.origin_owner_user_id) ?? "unknown service"} (
                    {emailByUserId.get(s.origin_owner_user_id) ?? "—"}) · submitted {fmtDate(s.submitted_at)}
                  </p>
                  {s.summary && <p className="mt-2 text-sm text-ink/70">{s.summary}</p>}
                </div>
                {s.suggested_template && (
                  <span className="shrink-0 rounded-full bg-cream-dark px-2.5 py-1 text-xs font-medium text-ink/70">
                    {TEMPLATE_LABELS[s.suggested_template as PrintTemplateType] ?? s.suggested_template}
                  </span>
                )}
              </div>

              {s.steps.length > 0 && (
                <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-ink/80">
                  {s.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              )}

              <div className="mt-3 flex flex-wrap gap-1.5">
                {s.topic_tags.map((t) => (
                  <span key={t} className="rounded-full bg-sage-light px-2 py-0.5 text-xs text-sage-dark">
                    {topicTagLabel(t)}
                  </span>
                ))}
                {s.eylf_codes.map((code) => (
                  <span key={code} className="rounded-full bg-coral-light px-2 py-0.5 text-xs text-coral-dark">
                    EYLF {code}
                  </span>
                ))}
              </div>

              {s.ai_review_notes && (
                <p className="mt-3 rounded-lg bg-amber-light px-3 py-2 text-xs text-amber-dark">
                  🤖 {s.ai_review_notes}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <form action={approveSubmission}>
                  <input type="hidden" name="id" value={s.id} />
                  <button
                    type="submit"
                    className="rounded-lg bg-sage px-4 py-1.5 text-sm font-medium text-white hover:bg-sage-dark"
                  >
                    Approve
                  </button>
                </form>
                <form action={rejectSubmission} className="flex flex-1 flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={s.id} />
                  <input
                    type="text"
                    name="reason"
                    placeholder="Reason (shown to the submitting centre)"
                    className="min-w-[16rem] flex-1 rounded-lg border border-ink/15 bg-cream px-2 py-1.5 text-sm text-ink"
                  />
                  <button
                    type="submit"
                    className="rounded-lg border border-coral-light px-4 py-1.5 text-sm font-medium text-coral-dark hover:bg-coral-light"
                  >
                    Reject
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
