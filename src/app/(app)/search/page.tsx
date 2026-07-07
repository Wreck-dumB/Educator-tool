import type { Metadata } from "next";
import Link from "next/link";
import { globalSearch } from "@/lib/supabase/search";
import { cardClass, inputClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Search · SparkPlay" };

function highlight(text: string, query: string): string {
  if (!query.trim()) return text;
  return text;
}

function excerpt(text: string, query: string, max = 120): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase().trim());
  if (idx === -1 || text.length <= max) return text.slice(0, max) + (text.length > max ? "…" : "");
  const start = Math.max(0, idx - 30);
  const end = Math.min(text.length, idx + max - 30);
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const results = await globalSearch(q);

  const totalCount =
    results.children.length +
    results.observations.length +
    results.activities.length +
    results.policies.length +
    results.forms.length;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Search</h1>

      {/* Search form */}
      <form method="GET" action="/search" className="mt-4 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search children, observations, activities, policies…"
          autoFocus
          className={`${inputClass} mt-0 flex-1`}
        />
        <button
          type="submit"
          className="rounded-xl bg-coral px-4 py-2 text-sm font-semibold text-white hover:bg-coral-dark transition-colors"
        >
          Search
        </button>
      </form>

      {q && (
        <p className="mt-3 text-sm text-ink/50">
          {totalCount === 0
            ? `No results for "${q}"`
            : `${totalCount} result${totalCount === 1 ? "" : "s"} for "${q}"`}
        </p>
      )}

      {q && totalCount > 0 && (
        <div className="mt-5 space-y-6">
          {/* Children */}
          {results.children.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink/40">
                Children
              </h2>
              <div className={cardClass}>
                <ul className="divide-y divide-coral-light">
                  {results.children.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/children/${c.id}`}
                        className="flex items-center gap-2 px-4 py-3 hover:bg-coral-light/30 transition-colors"
                      >
                        <span className="text-sm">🧒</span>
                        <span className="text-sm font-medium text-ink hover:text-coral-dark">
                          {c.name}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Activities */}
          {results.activities.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink/40">
                Activities
              </h2>
              <div className={cardClass}>
                <ul className="divide-y divide-coral-light">
                  {results.activities.map((a) => (
                    <li key={a.id}>
                      <Link
                        href={`/activities/${a.id}`}
                        className="block px-4 py-3 hover:bg-coral-light/30 transition-colors"
                      >
                        <p className="text-sm font-medium text-ink hover:text-coral-dark">
                          {a.title}
                        </p>
                        <p className="mt-0.5 text-xs text-ink/50">{excerpt(a.summary, q)}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Observations */}
          {results.observations.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink/40">
                Observations
              </h2>
              <div className={cardClass}>
                <ul className="divide-y divide-coral-light">
                  {results.observations.map((o) => (
                    <li key={o.id}>
                      <Link
                        href={`/observations?child=${o.childId}`}
                        className="block px-4 py-3 hover:bg-coral-light/30 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-coral-dark">{o.childName}</p>
                          <p className="text-xs text-ink/40">
                            {new Date(o.date).toLocaleDateString("en-AU")}
                          </p>
                        </div>
                        <p className="mt-0.5 text-sm text-ink/70">{excerpt(o.note, q)}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Policies */}
          {results.policies.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink/40">
                Policies
              </h2>
              <div className={cardClass}>
                <ul className="divide-y divide-coral-light">
                  {results.policies.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/policies`}
                        className="block px-4 py-3 text-sm font-medium text-ink hover:bg-coral-light/30 hover:text-coral-dark transition-colors"
                      >
                        {p.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Form templates */}
          {results.forms.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink/40">
                Document templates
              </h2>
              <div className={cardClass}>
                <ul className="divide-y divide-coral-light">
                  {results.forms.map((f) => (
                    <li key={f.id}>
                      <Link
                        href={`/forms/${f.id}`}
                        className="block px-4 py-3 text-sm font-medium text-ink hover:bg-coral-light/30 hover:text-coral-dark transition-colors"
                      >
                        {f.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </div>
      )}

      {!q && (
        <div className="mt-8 text-center text-sm text-ink/40">
          Search across children, observations, activities, policies, and document templates.
        </div>
      )}
    </div>
  );
}
