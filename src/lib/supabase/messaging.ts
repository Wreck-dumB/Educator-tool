import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";

type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"];
type MessageRow = Database["public"]["Tables"]["messages"]["Row"];

export interface ConversationWithChild extends ConversationRow {
  child_first_name: string;
  unread_count: number;
}

export interface MessageWithSender extends MessageRow {
  is_mine: boolean;
}

export async function getMyConversations(): Promise<ConversationWithChild[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Supabase doesn't support complex aggregates via the PostgREST client for
  // unread counts, so fetch conversations and messages separately.
  const { data: convs } = await supabase
    .from("conversations")
    .select("*")
    .order("created_at", { ascending: false }) as { data: ConversationRow[] | null };

  if (!convs || convs.length === 0) return [];

  const childIds = [...new Set(convs.map((c) => c.child_id))];
  const { data: children } = await supabase.from("children").select("id, first_name").in("id", childIds);
  const childNameById = new Map((children ?? []).map((c) => [c.id, c.first_name]));

  // Unread = messages in this conversation where sender != me and read_at is null
  const convIds = convs.map((c) => c.id);
  const { data: unreadRows } = await supabase
    .from("messages")
    .select("conversation_id")
    .in("conversation_id", convIds)
    .neq("sender_user_id", user.id)
    .is("read_at", null) as { data: { conversation_id: string }[] | null };

  const unreadByConv = new Map<string, number>();
  for (const row of unreadRows ?? []) {
    unreadByConv.set(row.conversation_id, (unreadByConv.get(row.conversation_id) ?? 0) + 1);
  }

  return convs.map((c) => ({
    ...c,
    child_first_name: childNameById.get(c.child_id) ?? "Unknown",
    unread_count: unreadByConv.get(c.id) ?? 0,
  }));
}

export async function getConversationById(
  id: string,
): Promise<{ conversation: ConversationWithChild; messages: MessageWithSender[] } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: conv } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .single() as { data: ConversationRow | null };

  if (!conv) return null;

  const { data: child } = await supabase.from("children").select("first_name").eq("id", conv.child_id).single();
  const { data: msgs } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true }) as { data: MessageRow[] | null };

  // Mark unread messages from the other party as read
  const unreadIds = (msgs ?? [])
    .filter((m) => m.sender_user_id !== user.id && !m.read_at)
    .map((m) => m.id);

  if (unreadIds.length > 0) {
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds);
  }

  return {
    conversation: {
      ...conv,
      child_first_name: child?.first_name ?? "Unknown",
      unread_count: 0,
    },
    messages: (msgs ?? []).map((m) => ({ ...m, is_mine: m.sender_user_id === user.id })),
  };
}
