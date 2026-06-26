import Link from "next/link";
import { getChildren } from "@/lib/supabase/children";
import { createChild } from "@/app/(app)/children/actions";
import { inputClass, cardClass, primaryButtonClass, errorBannerClass } from "@/lib/ui";

export default async function ChildrenPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const children = await getChildren();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Children</h1>
      <p className="mt-1 text-sm text-ink/60">
        Profiles you manage on behalf of the children in your care &mdash; no login for them,
        just a name, age, and what they&apos;re currently into.
      </p>

      {error && <p className={errorBannerClass}>{error}</p>}

      <div className={`mt-6 ${cardClass}`}>
        <div className="border-b border-coral-light px-4 py-3">
          <h2 className="font-display text-sm font-semibold text-ink">All children</h2>
        </div>
        {children.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink/50">No children added yet.</p>
        ) : (
          <ul className="divide-y divide-coral-light">
            {children.map((child) => (
              <li key={child.id} className="px-4 py-3">
                <Link
                  href={`/children/${child.id}`}
                  className="font-medium text-ink hover:text-coral-dark"
                >
                  🧒 {child.first_name}
                </Link>
                {child.current_interests && (
                  <p className="mt-0.5 text-sm text-ink/50">{child.current_interests}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={`mt-6 p-5 ${cardClass}`}>
        <h2 className="font-display text-sm font-semibold text-ink">Add a child</h2>
        <form action={createChild} className="mt-4 space-y-4">
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-ink/70">
              First name
            </label>
            <input id="first_name" name="first_name" type="text" required className={inputClass} />
          </div>
          <div>
            <label htmlFor="date_of_birth" className="block text-sm font-medium text-ink/70">
              Date of birth (optional)
            </label>
            <input id="date_of_birth" name="date_of_birth" type="date" className={inputClass} />
          </div>
          <div>
            <label htmlFor="current_interests" className="block text-sm font-medium text-ink/70">
              Current interests (optional)
            </label>
            <input
              id="current_interests"
              name="current_interests"
              type="text"
              placeholder="e.g. dinosaurs, trucks, drawing"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-ink/50">
              Feeds into activity generation when you pick this child.
            </p>
          </div>
          <div>
            <label htmlFor="additional_needs" className="block text-sm font-medium text-ink/70">
              Additional needs (optional)
            </label>
            <textarea
              id="additional_needs"
              name="additional_needs"
              rows={2}
              placeholder="e.g. uses a wheelchair, sensory sensitivity to loud noise, recent family change at home"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-ink/50">
              Any physical, emotional, disability, neurodiversity, family, environmental, or legal
              needs/constraints worth the generator knowing about, to adapt activities respectfully.
            </p>
          </div>
          <button type="submit" className={`w-full ${primaryButtonClass}`}>
            Add child
          </button>
        </form>
      </div>
    </div>
  );
}
