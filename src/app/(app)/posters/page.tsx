import Link from "next/link";
import { getPosters } from "@/lib/supabase/posters";
import { cardClass } from "@/lib/ui";
import PosterMaker from "./PosterMaker";
import { deletePoster } from "./actions";

export default async function PostersPage() {
  const posters = await getPosters();

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Poster &amp; Flier Maker</h1>
      <p className="mt-1 text-sm text-ink/60">
        Make a poster for your room or a flier for families in a couple of minutes — write it yourself or
        let SparkPlay draft the wording, add your own photo or a copyright-safe stock picture, then print it.
      </p>

      <div className="mt-6">
        <PosterMaker />
      </div>

      <h2 className="font-display mt-8 text-xl font-semibold text-ink">Saved posters</h2>
      <div className="mt-3 space-y-2">
        {posters.length === 0 && <p className="text-sm text-ink/50">No posters saved yet.</p>}
        {posters.map((p) => (
          <div key={p.id} className={`flex items-center justify-between gap-3 p-4 ${cardClass}`}>
            <div className="min-w-0">
              <Link href={`/posters/${p.id}`} className="font-display font-semibold text-ink hover:text-coral-dark">
                {p.title}
              </Link>
              {p.subtitle && <p className="truncate text-sm text-ink/60">{p.subtitle}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Link href={`/posters/${p.id}`} className="text-xs font-semibold text-sage-dark hover:underline">
                Print
              </Link>
              <form action={deletePoster}>
                <input type="hidden" name="id" value={p.id} />
                <button type="submit" className="text-xs text-coral-dark hover:underline">
                  Remove
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
