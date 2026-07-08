import type { Metadata } from "next";
import { getWallPostsForEducator } from "@/lib/supabase/wall";
import { cardClass, inputClass, errorBannerClass } from "@/lib/ui";
import { postToWall, approvePost, rejectPost, deletePost } from "./actions";

export const metadata: Metadata = { title: "Community Wall · SparkPlay" };

const STATUS_LABELS: Record<string, { text: string; cls: string }> = {
  pending: { text: "Pending review", cls: "text-amber-dark bg-amber-light" },
  approved: { text: "Approved", cls: "text-sage-dark bg-sage-light" },
  rejected: { text: "Rejected", cls: "text-coral-dark bg-coral-light" },
};

export default async function WallPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const posts = await getWallPostsForEducator();

  const pending = posts.filter((p) => p.status === "pending");
  const approved = posts.filter((p) => p.status === "approved");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Community Wall</h1>
      <p className="mt-1 text-sm text-ink/60">
        Approved posts are visible to all linked parents. Parent posts require your approval before
        going live.
      </p>

      {error && <p className={errorBannerClass}>{error}</p>}

      {/* New post from educator */}
      <div className={`mt-6 p-5 ${cardClass}`}>
        <h2 className="font-display text-sm font-semibold text-ink">Post an update</h2>
        <form action={postToWall} className="mt-3 space-y-3">
          <textarea
            name="body"
            rows={3}
            required
            placeholder="Share a note with all linked families…"
            maxLength={2000}
            className={`${inputClass} mt-0 resize-none`}
          />
          <button
            type="submit"
            className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white hover:bg-coral-dark transition-colors"
          >
            Post
          </button>
        </form>
      </div>

      {/* Pending approval queue */}
      {pending.length > 0 && (
        <div className="mt-6">
          <h2 className="font-display mb-3 text-sm font-semibold uppercase tracking-widest text-amber-dark">
            Awaiting review ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((p) => (
              <div key={p.id} className={`p-4 border-l-4 border-amber-dark ${cardClass}`}>
                <p className="text-sm text-ink/80">{p.body}</p>
                <p className="mt-1 text-xs text-ink/40">
                  Parent · {new Date(p.created_at).toLocaleDateString("en-AU")}
                </p>
                <div className="mt-3 flex gap-2">
                  <form action={approvePost}>
                    <input type="hidden" name="post_id" value={p.id} />
                    <button
                      type="submit"
                      className="rounded-full bg-sage px-4 py-1.5 text-xs font-semibold text-white hover:bg-sage-dark transition-colors"
                    >
                      Approve
                    </button>
                  </form>
                  <form action={rejectPost} className="flex items-center gap-2">
                    <input type="hidden" name="post_id" value={p.id} />
                    <input
                      name="reason"
                      type="text"
                      placeholder="Reason (optional)"
                      className="rounded-xl border border-coral-light px-2 py-1 text-xs focus:border-coral focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="rounded-full border border-coral-light px-4 py-1.5 text-xs font-semibold text-coral-dark hover:bg-coral-light transition-colors"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved posts */}
      <div className="mt-6">
        <h2 className="font-display mb-3 text-sm font-semibold uppercase tracking-widest text-ink/40">
          Live posts ({approved.length})
        </h2>
        {approved.length === 0 ? (
          <p className="text-sm text-ink/50">No live posts yet.</p>
        ) : (
          <div className="space-y-3">
            {approved.map((p) => {
              const badge = STATUS_LABELS[p.status];
              return (
                <div key={p.id} className={`p-4 ${cardClass}`}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-ink/80">{p.body}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${badge.cls}`}>
                      {p.author_role === "educator" ? "You" : "Parent"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink/40">
                    {new Date(p.created_at).toLocaleDateString("en-AU")}
                  </p>
                  <form action={deletePost} className="mt-2">
                    <input type="hidden" name="post_id" value={p.id} />
                    <button
                      type="submit"
                      className="text-xs text-ink/30 hover:text-coral-dark"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
