import type { Metadata } from "next";
import { searchApprovedLibrary } from "@/lib/supabase/sharedLibrary";
import { TOPIC_TAGS, topicTagLabel } from "@/lib/topicTags";
import { TEMPLATE_LABELS, type PrintTemplateType } from "@/lib/utils/printable";
import { copyLibraryActivityToMine } from "./actions";

export const metadata: Metadata = { title: "Community Library · DR. SparkPlay" };

interface Props {
  searchParams: Promise<{ tag?: string | string[]; q?: string }>;
}

export default async function LibraryPage({ searchParams }: Props) {
  const { tag, q } = await searchParams;
  const selectedTags = tag ? (Array.isArray(tag) ? tag : [tag]) : [];

  const results = await searchApprovedLibrary({ topicTags: selectedTags, query: q });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-semibold text-coral-dark">Community Library</h1>
      <p className="mt-1 text-sm text-ink/60">
        Activities other DR. SparkPlay educators have shared, reviewed for copyright and personal
        information and approved by the platform admin. Find something close before generating a
        fresh one from scratch.
      </p>

      <form className="mt-4 rounded-2xl border border-coral-light bg-white p-4">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by title…"
          className="w-full rounded-xl border border-coral-light bg-white px-3 py-2 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
        />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {TOPIC_TAGS.map((t) => (
            <label key={t.id} className="cursor-pointer">
              <input
                type="checkbox"
                name="tag"
                value={t.id}
                defaultChecked={selectedTags.includes(t.id)}
                className="peer sr-only"
              />
              <span className="inline-block rounded-full border border-coral-light px-3 py-1 text-xs font-medium text-coral-dark transition-colors hover:bg-coral-light peer-checked:border-coral peer-checked:bg-coral peer-checked:text-white">
                {t.label}
              </span>
            </label>
          ))}
        </div>
        <button
          type="submit"
          className="mt-3 rounded-full bg-coral px-4 py-1.5 text-sm font-semibold text-white hover:bg-coral-dark"
        >
          Search
        </button>
      </form>

      {results.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-ink/10 bg-white p-6 text-center text-sm text-ink/50">
          Nothing matches yet — try different filters, or{" "}
          <a href="/generate" className="text-coral-dark hover:underline">generate something new</a>.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {results.map((a) => (
            <div key={a.id} className="rounded-2xl border border-coral-light bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-lg font-semibold text-ink">{a.title}</h3>
                {a.suggested_template && (
                  <span className="shrink-0 rounded-full bg-cream-dark px-2.5 py-1 text-xs font-medium text-ink/70">
                    {TEMPLATE_LABELS[a.suggested_template as PrintTemplateType] ?? a.suggested_template}
                  </span>
                )}
              </div>
              {a.summary && <p className="mt-1 text-sm text-ink/70">{a.summary}</p>}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {a.duration_minutes && <span className="text-xs text-ink/50">{a.duration_minutes} min</span>}
                {a.age_range && <span className="text-xs text-ink/50">&middot; {a.age_range}</span>}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {a.topic_tags.map((t) => (
                  <span key={t} className="rounded-full bg-sage-light px-2 py-0.5 text-xs text-sage-dark">
                    {topicTagLabel(t)}
                  </span>
                ))}
                {a.eylf_codes.map((code) => (
                  <span key={code} className="rounded-full bg-coral-light px-2 py-0.5 text-xs text-coral-dark">
                    EYLF {code}
                  </span>
                ))}
              </div>

              {a.steps.length > 0 && (
                <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-ink/80">
                  {a.steps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              )}

              <form action={copyLibraryActivityToMine} className="mt-4">
                <input type="hidden" name="id" value={a.id} />
                <button
                  type="submit"
                  className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink/80"
                >
                  Use this — copy to my activities
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
