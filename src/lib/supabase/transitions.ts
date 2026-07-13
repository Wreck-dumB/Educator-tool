import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";

export interface TransitionStatement {
  id: string;
  owner_user_id: string;
  child_id: string;
  transition_type: "to_school" | "between_rooms" | "between_services";
  draft_text: string | null;
  finalized_at: string | null;
  finalized_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransitionStatementWithChild extends TransitionStatement {
  child_first_name: string;
  child_date_of_birth: string | null;
  child_current_interests: string | null;
}

export async function getTransitionStatements(): Promise<TransitionStatementWithChild[]> {
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return [];

  const supabase = await createClient();
  const { data: statements } = await supabase
    .from("transition_statements")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("updated_at", { ascending: false });

  if (!statements || statements.length === 0) return [];

  const childIds = [...new Set(statements.map((s) => s.child_id))];
  const { data: children } = await supabase
    .from("children")
    .select("id, first_name, date_of_birth, current_interests")
    .in("id", childIds);

  const childMap = new Map((children ?? []).map((c) => [c.id, c]));

  return statements.map((s) => {
    const child = childMap.get(s.child_id);
    return {
      ...(s as TransitionStatement),
      child_first_name: child?.first_name ?? "Unknown",
      child_date_of_birth: child?.date_of_birth ?? null,
      child_current_interests: child?.current_interests ?? null,
    };
  });
}

export async function getTransitionStatement(id: string): Promise<TransitionStatementWithChild | null> {
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("transition_statements")
    .select("*")
    .eq("id", id)
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();

  if (!data) return null;

  const { data: child } = await supabase
    .from("children")
    .select("id, first_name, date_of_birth, current_interests")
    .eq("id", data.child_id)
    .maybeSingle();

  return {
    ...(data as TransitionStatement),
    child_first_name: child?.first_name ?? "Unknown",
    child_date_of_birth: child?.date_of_birth ?? null,
    child_current_interests: child?.current_interests ?? null,
  };
}
