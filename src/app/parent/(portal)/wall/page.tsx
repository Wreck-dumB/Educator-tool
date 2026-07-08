import { createClient } from "@/lib/supabase/server";
import { getChildren } from "@/lib/supabase/children";
import { getApprovedWallPosts } from "@/lib/supabase/wall";
import { cardClass, inputClass, errorBannerClass } from "@/lib/ui";
import { submitWallPost, deleteOwnPendingPost } from "./actions";

export default async function ParentWallPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get the educator linked to one of the parent's children (any one is fine —
  // the wall is scoped to one service and all their children are at the same service).
  const children = await getChildren();
  const { data: links } = await supabase
    .from("parent_child_links")
    .select("educator_user_id")
    .limit(1)
    .maybeSingle();

  const educatorUserId = links?.educator_user_id ?? null;

  // Fetch approved wall posts
  const approvedPosts = educatorUserId ? await getApprovedWallPosts(educatorUserId) : [];

  // Fetch this parent's own pending/rejected posts
  const { data: myPosts } = await supabase
    .from("wall_posts")
    .select("*")
    .eq("author_user_id", user?.id ?? "")
    .in("status", ["pending", "rejected"])
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Community Wall</h1>
      <p className="mt-1 text-sm text-ink/60">
        Updates from your child&apos;s service and messages from other linked families.
      </p>

      {error && <p className={errorBannerClass}>{error}</p>}
      {message && (
        <p className="mt-3 rounded-xl bg-sage-light px-4 py-2 text-sm text-sage-dark">{message}</p>
      )}

      {/* Post form — only show if the parent is linked to a service */}
      {educatorUserId && (
        <div className={`mt-6 p-5 ${cardClass}`}>
          <h2 className="font-display text-sm font-semibold text-ink">Share something</h2>
          <p className="mt-0.5 text-xs text-ink/50">
            Posts are reviewed by your educator before going live.
          </p>
          <form action={submitWallPost} className="mt-3 space-y-3">
            <input type="hidden" name="educator_user_id" value={educatorUserId} />
            <textarea
              name="body"
              rows={3}
              required
              placeholder="Share a note with the community…"
              maxLength={2000}
              className={`${inputClass} mt-0 resize-none`}
            />
            <button
              type="submit"
              className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white hover:bg-coral-dark transition-colors"
            >
              Submit for review
            </button>
          </form>
        </div>
      )}

      {/* Your pending / rejected posts */}
      {(myPosts ?? []).length > 0 && (
        <div className="mt-6">
          <h2 className="font-display mb-3 text-sm font-semibold text-ink/50">Your pending posts</h2>
          <div className="space-y-3">
            {(myPosts ?? []).map((p) => (
              <div key={p.id} className={`p-4 ${cardClass}`}>
                <p className="text-sm text-ink/80">{p.body}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      p.status === "pending"
                        ? "text-amber-dark bg-amber-light"
                        : "text-coral-dark bg-coral-light"
                    }`}
                  >
                    {p.status === "pending" ? "Awaiting review" : "Not approved"}
                  </span>
                  {p.rejection_reason && (
                    <p className="text-xs text-ink/50">{p.rejection_reason}</p>
                  )}
                  {p.status === "pending" && (
                    <form action={deleteOwnPendingPost}>
                      <input type="hidden" name="post_id" value={p.id} />
                      <button type="submit" className="text-xs text-ink/30 hover:text-coral-dark">
                        Cancel
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved posts */}
      <div className="mt-6">
        {approvedPosts.length === 0 ? (
          <p className="text-sm text-ink/50">No posts on the wall yet.</p>
        ) : (
          <div className="space-y-3">
            {approvedPosts.map((p) => (
              <div key={p.id} className={`p-4 ${cardClass}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-ink/80">{p.body}</p>
                  <span className="shrink-0 text-xs text-ink/40">
                    {p.author_role === "educator" ? "Educator" : "Parent"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink/40">
                  {new Date(p.created_at).toLocaleDateString("en-AU", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {children.length === 0 && (
        <p className={`mt-6 p-5 text-sm text-ink/50 ${cardClass}`}>
          You&apos;re not linked to a service yet.
        </p>
      )}
    </div>
  );
}
