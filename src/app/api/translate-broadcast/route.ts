import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { translateBroadcast, SUPPORTED_LANGUAGES } from "@/lib/anthropic";
import { isRateLimited } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (isRateLimited(`translate:${user.id}`, 30, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Translation limit reached — try again in an hour." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const { title, text, language } = body ?? {};

  if (typeof title !== "string" || typeof text !== "string" || typeof language !== "string") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!SUPPORTED_LANGUAGES[language]) {
    return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
  }

  try {
    const result = await translateBroadcast(title, text, language);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Translation failed", err);
    return NextResponse.json({ error: "Translation failed" }, { status: 502 });
  }
}
