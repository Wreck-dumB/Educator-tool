import { getChildren } from "@/lib/supabase/children";
import { cardClass } from "@/lib/ui";

export default async function ParentDashboardPage() {
  // RLS scopes this to children the current parent is linked to -- the
  // same helper the educator side uses, no separate query needed.
  const children = await getChildren();

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Your children</h1>
      <p className="mt-1 text-sm text-ink/60">
        Linked profiles for the children your account has been invited to.
      </p>

      {children.length === 0 ? (
        <p className={`mt-6 p-5 text-sm text-ink/50 ${cardClass}`}>
          No children are linked to your account yet. Ask your child&apos;s educator for an invite
          link to get started.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {children.map((child) => (
            <li key={child.id} className={`p-4 ${cardClass}`}>
              <p className="font-display text-lg font-semibold text-ink">🧒 {child.first_name}</p>
              {child.current_interests && (
                <p className="mt-1 text-sm text-ink/60">Interests: {child.current_interests}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
