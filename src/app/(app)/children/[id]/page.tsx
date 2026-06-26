import { notFound } from "next/navigation";
import { getChild } from "@/lib/supabase/children";
import { updateChild, deleteChild } from "@/app/(app)/children/actions";
import { getObservations } from "@/lib/supabase/observations";
import { inputClass, cardClass, primaryButtonClass, errorBannerClass } from "@/lib/ui";

export default async function ChildDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const child = await getChild(id);

  if (!child) notFound();

  const observations = await getObservations(id);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-coral-dark">🧒 {child.first_name}</h1>

      {error && <p className={errorBannerClass}>{error}</p>}

      <div className={`mt-6 p-5 ${cardClass}`}>
        <form action={updateChild} className="space-y-4">
          <input type="hidden" name="id" value={child.id} />
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-ink/70">
              First name
            </label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              required
              defaultValue={child.first_name}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="date_of_birth" className="block text-sm font-medium text-ink/70">
              Date of birth
            </label>
            <input
              id="date_of_birth"
              name="date_of_birth"
              type="date"
              defaultValue={child.date_of_birth ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="current_interests" className="block text-sm font-medium text-ink/70">
              Current interests
            </label>
            <input
              id="current_interests"
              name="current_interests"
              type="text"
              defaultValue={child.current_interests ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="additional_needs" className="block text-sm font-medium text-ink/70">
              Additional needs
            </label>
            <textarea
              id="additional_needs"
              name="additional_needs"
              rows={2}
              defaultValue={child.additional_needs ?? ""}
              placeholder="e.g. uses a wheelchair, sensory sensitivity to loud noise, recent family change at home"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-ink/50">
              Any physical, emotional, disability, neurodiversity, family, environmental, or legal
              needs/constraints worth the generator knowing about, to adapt activities respectfully.
            </p>
          </div>
          <button type="submit" className={`w-full ${primaryButtonClass}`}>
            Save changes
          </button>
        </form>
      </div>

      <div className={`mt-6 ${cardClass}`}>
        <div className="border-b border-coral-light px-4 py-3">
          <h2 className="font-display text-sm font-semibold text-ink">Observations</h2>
        </div>
        {observations.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink/50">
            Logged observations for {child.first_name} will appear here once you start saving
            them from generated activities.
          </p>
        ) : (
          <ul className="divide-y divide-coral-light">
            {observations.map((o) => (
              <li key={o.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-ink/80">{o.note_text}</p>
                  <p className="ml-3 shrink-0 text-xs text-ink/40">
                    {new Date(o.observed_at).toLocaleDateString()}
                  </p>
                </div>
                {o.eylf_codes.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {o.eylf_codes.map((code) => (
                      <span
                        key={code}
                        className="rounded-full bg-sage-light px-2 py-0.5 text-xs font-medium text-sage-dark"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <form action={deleteChild} className="mt-6">
        <input type="hidden" name="id" value={child.id} />
        <button type="submit" className="text-sm font-medium text-coral-dark hover:underline">
          Delete this child profile
        </button>
      </form>
    </div>
  );
}
