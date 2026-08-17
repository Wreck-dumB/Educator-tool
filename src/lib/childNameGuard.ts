import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";

async function enrolledChildFirstNames(): Promise<string[]> {
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return [];

  const supabase = await createClient();
  const { data: children } = await supabase
    .from("children")
    .select("first_name")
    .eq("owner_user_id", ownerUserId);

  if (!children || children.length === 0) return [];
  // Too short to match reliably without noise (e.g. "Al", "Bo").
  return children.map((c) => c.first_name.trim()).filter((name) => name.length >= 3);
}

function namePattern(name: string): RegExp {
  return new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
}

// Confidentiality guard for the document reviewer/regenerator: policies and
// procedures must stay generic, never naming a real enrolled child or
// reproducing a real incident involving one. Checked BEFORE any document
// text is sent to the Anthropic API, so a match blocks the request
// entirely rather than relying on the model to notice and redact it.
export async function findEnrolledChildNameMentions(text: string): Promise<string[]> {
  const names = await enrolledChildFirstNames();
  const matches = new Set<string>();
  for (const name of names) {
    if (namePattern(name).test(text)) matches.add(name);
  }
  return [...matches];
}

// Confidentiality guard for activity generation/personalisation: educators'
// free-text observation notes and interests routinely contain the child's
// own first name ("Emma loved the sensory bin today"), even though the
// structured fields deliberately withhold it. Unlike the document-review
// guard above, blocking the request isn't viable here — observations are
// inherently about one child — so this redacts in place instead, swapping
// every enrolled child's name for a neutral placeholder before the text
// ever reaches the Anthropic prompt builder.
export async function redactEnrolledChildNames(text: string): Promise<string> {
  if (!text) return text;
  const names = await enrolledChildFirstNames();
  let redacted = text;
  for (const name of names) {
    redacted = redacted.replace(namePattern(name), "the child");
  }
  return redacted;
}
