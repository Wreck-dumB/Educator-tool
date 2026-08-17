import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateGroupActivity } from "@/lib/anthropic";
import { getEylfOutcomes } from "@/lib/supabase/eylf";
import { isRateLimited } from "@/lib/rateLimit";
import { redactEnrolledChildNames } from "@/lib/childNameGuard";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (await isRateLimited(`group-activity:${user.id}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Rate limit reached — try again shortly." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const followUpNotes = Array.isArray(body?.followUpNotes)
    ? (body.followUpNotes as unknown[])
        .filter((n): n is string => typeof n === "string")
        .slice(0, 20)
        .map((n) => n.slice(0, 1000))
    : [];

  if (followUpNotes.length < 2) {
    return NextResponse.json({ error: "Select at least 2 follow-ups to suggest a group activity." }, { status: 400 });
  }

  // Each note routinely names the child it's about — redact before this
  // reaches the AI prompt. See childNameGuard.ts.
  const redactedNotes = await Promise.all(followUpNotes.map((n) => redactEnrolledChildNames(n)));

  const outcomes = await getEylfOutcomes();
  const activity = await generateGroupActivity(redactedNotes, outcomes);

  return NextResponse.json(activity);
}
