import type { Metadata } from "next";
import Link from "next/link";
import { getMyConversations } from "@/lib/supabase/messaging";
import { cardClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Messages · DR. SparkPlay" };

export default async function MessagesPage() {
  const conversations = await getMyConversations();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Messages</h1>
      <p className="mt-1 text-sm text-ink/60">
        Private conversations with linked parents — one thread per child.
      </p>

      {conversations.length === 0 ? (
        <p className={`mt-6 p-5 text-sm text-ink/50 ${cardClass}`}>
          No conversations yet. They&apos;ll appear here once parents accept your child invites.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {conversations.map((conv) => (
            <li key={conv.id}>
              <Link
                href={`/messages/${conv.id}`}
                className={`flex items-center justify-between gap-3 p-4 transition-colors hover:border-coral ${cardClass}`}
              >
                <div>
                  <p className="font-medium text-ink">{conv.child_first_name}</p>
                  <p className="text-xs text-ink/50">
                    Conversation opened {new Date(conv.created_at).toLocaleDateString("en-AU")}
                  </p>
                </div>
                {conv.unread_count > 0 && (
                  <span className="shrink-0 rounded-full bg-coral px-2.5 py-0.5 text-xs font-bold text-white">
                    {conv.unread_count}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
