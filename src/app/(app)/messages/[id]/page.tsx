import { notFound } from "next/navigation";
import Link from "next/link";
import { getConversationById } from "@/lib/supabase/messaging";
import { cardClass, inputClass, errorBannerClass } from "@/lib/ui";
import { sendMessage } from "../actions";

export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const result = await getConversationById(id);

  if (!result) notFound();

  const { conversation, messages } = result;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/messages" className="text-sm text-coral-dark hover:underline">
          ← Messages
        </Link>
      </div>

      <h1 className="font-display mt-2 text-2xl font-semibold text-coral-dark">
        {conversation.child_first_name}
      </h1>

      {error && <p className={errorBannerClass}>{error}</p>}

      {/* Message thread */}
      <div className={`mt-4 ${cardClass}`}>
        {messages.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-ink/50">
            No messages yet. Send the first one below.
          </p>
        ) : (
          <ul className="divide-y divide-coral-light/50">
            {messages.map((m) => (
              <li
                key={m.id}
                className={`px-4 py-3 ${m.is_mine ? "bg-sage-light/30" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-ink/80">{m.body}</p>
                  <p className="shrink-0 text-xs text-ink/40">
                    {new Date(m.created_at).toLocaleTimeString("en-AU", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <p className="mt-0.5 text-xs text-ink/40">
                  {m.is_mine ? "You" : "Parent"} ·{" "}
                  {new Date(m.created_at).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                  })}
                  {!m.is_mine && m.read_at && (
                    <span className="ml-1 text-sage-dark">✓ Read</span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Send message */}
      <form action={sendMessage} className={`mt-4 p-4 ${cardClass} space-y-3`}>
        <input type="hidden" name="conversation_id" value={id} />
        <textarea
          name="body"
          rows={3}
          required
          placeholder="Write a message…"
          maxLength={4000}
          className={`${inputClass} mt-0 resize-none`}
        />
        <button
          type="submit"
          className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white hover:bg-coral-dark transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
