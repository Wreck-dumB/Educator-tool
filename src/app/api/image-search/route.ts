import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchStockImages } from "@/lib/imageSearch";
import { isRateLimited } from "@/lib/rateLimit";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (isRateLimited(`image-search:${user.id}`, 60, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "You've hit the image search limit for now — try again in a bit." },
      { status: 429 },
    );
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().slice(0, 100);
  if (!q) {
    return NextResponse.json({ error: "Type what kind of picture you're after first" }, { status: 400 });
  }

  try {
    const images = await searchStockImages(q);
    return NextResponse.json({ images });
  } catch (err) {
    console.error("Image search failed", err);
    const message = err instanceof Error ? err.message : "Image search failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
