import Link from "next/link";
import { getFormTemplates } from "@/lib/supabase/forms";
import { getMyStaffRole } from "@/lib/supabase/staff";
import { cardClass } from "@/lib/ui";
import FormBuilderForm from "./FormBuilderForm";

export default async function FormsPage() {
  const [templates, myRole] = await Promise.all([getFormTemplates(), getMyStaffRole()]);
  const canManage = myRole === "director" || myRole === "2ic";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Document Templates</h1>
      <p className="mt-1 text-sm text-ink/60">
        Describe what you need — a permission slip, consent form, or any other one-off notice — and
        get a drafted template back, plus a gap-check of anything your description didn&apos;t cover.
        For enrolment records and incident reports, use their dedicated pages instead — those have
        specific mandatory fields under the National Regulations, not free-text drafting.
      </p>

      {canManage && (
        <div className="mt-6">
          <FormBuilderForm />
        </div>
      )}

      <div className="mt-6 space-y-3">
        {templates.length === 0 && <p className="text-sm text-ink/50">No forms drafted yet.</p>}
        {templates.map((t) => (
          <Link key={t.id} href={`/forms/${t.id}`} className={`block p-4 ${cardClass} transition-colors hover:border-coral`}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display font-semibold text-ink">{t.title}</h2>
              <div className="flex shrink-0 items-center gap-1.5">
                {!t.is_finalised && (
                  <span className="rounded-full bg-amber-light px-2 py-0.5 text-xs font-medium text-amber-dark">
                    Draft
                  </span>
                )}
                <span className="rounded-full bg-sage-light px-2 py-0.5 text-xs font-medium text-sage-dark">
                  {t.category}
                </span>
              </div>
            </div>
            <p className="mt-1 text-xs text-ink/40">{new Date(t.created_at).toLocaleDateString()}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
