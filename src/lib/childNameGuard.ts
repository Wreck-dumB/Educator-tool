import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";

// Confidentiality guard for the document reviewer/regenerator: policies and
// procedures must stay generic, never naming a real enrolled child or
// reproducing a real incident involving one. Checked BEFORE any document
// text is sent to the Anthropic API, so a match blocks the request
// entirely rather than relying on the model to notice and redact it.
export async function findEnrolledChildNameMentions(text: string): Promise<string[]> {
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return [];

  const supabase = await createClient();
  const { data: children } = await supabase
    .from("children")
    .select("first_name")
    .eq("owner_user_id", ownerUserId);

  if (!children || children.length === 0) return [];

  const matches = new Set<string>();
  for (const { first_name } of children) {
    const name = first_name.trim();
    if (name.length < 3) continue; // too short to match reliably without noise
    const pattern = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (pattern.test(text)) matches.add(name);
  }
  return [...matches];
}
