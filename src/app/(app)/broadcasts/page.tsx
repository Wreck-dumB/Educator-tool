import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { getMyStaffRole } from "@/lib/supabase/staff";
import { sendBroadcast, deleteBroadcast } from "./actions";
import { cardClass, inputClass, primaryButtonClass, errorBannerClass } from "@/lib/ui";
import TranslatePanel from "./TranslatePanel";

export default async function BroadcastsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/onboarding");

  const myRole = await getMyStaffRole();
  const canSend = myRole === "director" || myRole === "2ic";

  const { data: broadcasts } = await supabase
    .from("broadcast_messages")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: false })
    .limit(50);

  // Count linked parents
  const { data: links } = await supabase
    .from("parent_child_links")
    .select("parent_user_id")
    .eq("educator_user_id", ownerUserId);
  const uniqueParentCount = new Set((links ?? []).map((l) => l.parent_user_id)).size;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Broadcasts</h1>
        <p className="mt-1 text-sm text-ink/50">
          Send a message to all linked parents at once. Appears in their parent portal notifications.
          {uniqueParentCount > 0 && (
            <span className="ml-1 font-medium text-sage-dark">{uniqueParentCount} parent{uniqueParentCount !== 1 ? "s" : ""} will receive this.</span>
          )}
        </p>
      </div>

      {canSend && (
        <div className={cardClass + " p-5"}>
          <h2 className="font-display text-base font-semibold text-ink mb-4">New broadcast</h2>
          {error && <p className={`mb-3 ${errorBannerClass}`}>{error}</p>}
          {uniqueParentCount === 0 && (
            <p className="mb-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              No linked parents yet. Invite families via the Children page first.
            </p>
          )}
          <form action={async (fd: FormData) => { await sendBroadcast(fd); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink/70 mb-1">Subject / title</label>
              <input
                type="text"
                name="title"
                required
                placeholder="e.g. Upcoming pupil-free day"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink/70 mb-1">Message</label>
              <textarea
                name="body"
                required
                rows={5}
                placeholder="Write your message to families…"
                className={inputClass + " resize-none"}
              />
            </div>
            <button
              type="submit"
              disabled={uniqueParentCount === 0}
              className={primaryButtonClass + " disabled:opacity-50"}
            >
              Send to {uniqueParentCount} parent{uniqueParentCount !== 1 ? "s" : ""}
            </button>
          </form>
        </div>
      )}

      <div className={cardClass + " p-5"}>
        <h2 className="font-display text-base font-semibold text-ink mb-4">Sent broadcasts</h2>
        {(broadcasts ?? []).length === 0 ? (
          <p className="text-sm text-ink/40">No broadcasts sent yet.</p>
        ) : (
          <ul className="divide-y divide-coral-light/50">
            {(broadcasts ?? []).map((b) => (
              <li key={b.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{b.title}</p>
                    <p className="mt-1 text-sm text-ink/70 line-clamp-3">{b.body}</p>
                    <p className="mt-1 text-xs text-ink/40">
                      {new Date(b.created_at).toLocaleString("en-AU")}
                    </p>
                    <TranslatePanel
                      broadcastId={b.id}
                      title={b.title}
                      body={b.body}
                    />
                  </div>
                  {myRole === "director" && (
                    <form action={async () => { "use server"; await deleteBroadcast(b.id); }}>
                      <button type="submit" className="shrink-0 text-xs text-coral-dark hover:underline">
                        Remove
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
