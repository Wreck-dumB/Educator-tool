import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rateLimit";

// Pollinations.ai is free, requires no API key, and generates images on-demand.
// The API accepts a prompt in the URL and returns an image directly.

const PROMPTS = {
  outline:
    "One single {subject} centered on a completely white background. Only one isolated object, nothing else. Bold thick black outline with white interior. No shading, no color fills, no gradients, no background details, no other objects. Simple clean shape a child can cut out with scissors. Children's coloring book single-object line art.",
  colour:
    "One single {subject} centered on a pure white background. Only this one subject, nothing else in the image at all. Bright cheerful flat cartoon illustration with bold simple colors. No background scenery, no other objects, no decorations. Suitable for early childhood education ages 3 to 6.",
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  if (isRateLimited(`img:${user.id}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Image generation limit reached — try again in an hour." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const subject = typeof body?.prompt === "string" ? body.prompt.trim().slice(0, 300) : "";
  const style: "outline" | "colour" = body?.style === "colour" ? "colour" : "outline";

  if (!subject) return NextResponse.json({ error: "prompt is required" }, { status: 400 });

  const prompt = PROMPTS[style].replace("{subject}", subject);
  const seed = Math.floor(Math.random() * 999999);

  // Build the Pollinations URL — no API key or account needed.
  // nofeed=true prevents the image appearing in Pollinations' public gallery.
  const imageUrl =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=1024&height=1024&nologo=true&nofeed=true&model=flux&seed=${seed}`;

  return NextResponse.json({ imageUrl });
}
