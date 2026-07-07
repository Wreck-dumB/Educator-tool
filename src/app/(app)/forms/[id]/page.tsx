import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormTemplate } from "@/lib/supabase/forms";
import PrintButton from "@/components/PrintButton";
import { deleteFormTemplate, finaliseFormTemplate, revertFormToDraft } from "../actions";

export default async function FormTemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await getFormTemplate(id);
  if (!template) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 print:px-0 print:py-0">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link href="/forms" className="text-sm text-coral-dark hover:underline">
          ← Back
        </Link>
        <PrintButton />
      </div>

      <div className="mt-4 print:mt-0">
        <p className="text-xs font-medium uppercase tracking-wide text-sage-dark print:text-black">{template.category}</p>
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-semibold text-coral-dark print:text-black">{template.title}</h1>
          {template.is_finalised && (
            <span className="rounded-full bg-sage-light px-2.5 py-0.5 text-xs font-semibold text-sage-dark print:hidden">
              Final
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-ink/60 print:text-black">
          Drafted {new Date(template.created_at).toLocaleDateString()}
        </p>

        {!template.is_finalised && (
          <p className="mt-4 rounded-xl bg-amber-light p-3 text-xs text-amber-dark print:hidden">
            This is a <strong>starting draft</strong>. Review and customise before giving it to families
            or staff.
          </p>
        )}

        {template.purpose && (
          <>
            <p className="mt-4 text-sm font-medium text-ink print:text-black">Purpose</p>
            <p className="mt-1 text-sm text-ink/80 print:text-black">{template.purpose}</p>
          </>
        )}

        {template.body_text && (
          <>
            <p className="mt-4 text-sm font-medium text-ink print:text-black">Details</p>
            <p className="mt-1 whitespace-pre-line text-sm text-ink/80 print:text-black">{template.body_text}</p>
          </>
        )}

        {template.fields_to_complete.length > 0 && (
          <>
            <p className="mt-4 text-sm font-medium text-ink print:text-black">Fields to complete</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink/80 print:text-black">
              {template.fields_to_complete.map((f, idx) => (
                <li key={idx}>{f}</li>
              ))}
            </ul>
          </>
        )}

        {template.requires_signature && (
          <div className="mt-10 break-inside-avoid border-t border-ink/20 pt-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              <div>
                <p className="border-b border-ink/40 pb-6"></p>
                <p className="mt-1 text-xs text-ink/50 print:text-black">Name</p>
              </div>
              <div>
                <p className="border-b border-ink/40 pb-6"></p>
                <p className="mt-1 text-xs text-ink/50 print:text-black">Signature</p>
              </div>
              <div>
                <p className="border-b border-ink/40 pb-6"></p>
                <p className="mt-1 text-xs text-ink/50 print:text-black">Date</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-5 print:hidden">
          {template.is_finalised ? (
            <form action={revertFormToDraft}>
              <input type="hidden" name="id" value={template.id} />
              <button type="submit" className="text-sm font-medium text-ink/50 hover:underline">
                Revert to draft
              </button>
            </form>
          ) : (
            <form action={finaliseFormTemplate}>
              <input type="hidden" name="id" value={template.id} />
              <button type="submit" className="rounded-full bg-sage px-4 py-1.5 text-sm font-semibold text-white hover:bg-sage-dark">
                Mark as final
              </button>
            </form>
          )}
          <form action={deleteFormTemplate}>
            <input type="hidden" name="id" value={template.id} />
            <button type="submit" className="text-sm font-medium text-coral-dark hover:underline">
              Delete this form
            </button>
          </form>
        </div>

        {/* Educator reflection notes — screen only, never printed */}
        {(template.suggested_additions.length > 0 || template.your_input) && (
          <div className="mt-8 border-t-2 border-dashed border-ink/10 pt-6 print:hidden">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink/30">
              Educator notes — not printed
            </p>

            {template.suggested_additions.length > 0 && (
              <div className="rounded-xl bg-amber-light p-4">
                <p className="text-sm font-semibold text-amber-dark">
                  Worth considering — things not yet in this draft
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-amber-dark/90">
                  {template.suggested_additions.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-ink/40">What was originally described</summary>
              <p className="mt-1 text-xs text-ink/50">{template.your_input}</p>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
