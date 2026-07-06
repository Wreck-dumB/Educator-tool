import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePosterCopy } from "@/lib/anthropic";
import { isRateLimited } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (isRateLimited(`poster-copy:${user.id}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "You've hit the generation limit for now — try again in a bit." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const userInput = typeof body?.userInput === "string" ? body.userInput.trim().slice(0, 2000) : "";
  if (!userInput) {
    return NextResponse.json({ error: "Describe the poster first" }, { status: 400 });
  }

  let raw;
  try {
    raw = await generatePosterCopy(userInput);
  } catch (err) {
    console.error("Poster copy generation failed", err);
    return NextResponse.json({ error: "Failed to generate poster wording" }, { status: 502 });
  }

  return NextResponse.json({
    copy: {
      title: raw.title,
      subtitle: raw.subtitle ?? null,
      bodyText: raw.body_text ?? null,
      footerText: raw.footer_text ?? null,
      imageSearchSuggestion: raw.image_search_suggestion ?? null,
    },
  });
}
