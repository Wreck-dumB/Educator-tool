import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rateLimit";

// Pollinations.ai is free and generates images on-demand from a prompt in the
// URL. Anonymous/unauthenticated callers are capped at 1 request per 15s per
// IP and get an immediate 429 ("Queue full for IP") on any overlap — which a
// browser <img> fetching directly from Pollinations hits constantly (retries,
// a card set's multiple images, two people printing at once all share the
// server's/proxy's apparent IP in some setups). Fetching server-side with our
// registered app's Bearer token instead avoids depending on the browser
// correctly relaying a matching referrer header at all.
// Generation can take 15-20s — matches the maxDuration used by the other
// long-running AI routes in this app (document-review/route.ts).
export const maxDuration = 60;

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

  // Pollinations is free and keyless (no real per-call cost) — this is just an
  // abuse guard, not a cost control. Raised from 20 so a single printable card
  // set (up to 16 items × 2 for pairs = 32 images) doesn't hit the ceiling.
  if (await isRateLimited(`img:${user.id}`, 100, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Image generation limit reached — try again in an hour." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const subject = typeof body?.prompt === "string" ? body.prompt.trim().slice(0, 300) : "";
  const style: "outline" | "colour" = body?.style === "colour" ? "colour" : "outline";

  if (!subject) return NextResponse.json({ error: "prompt is required" }, { status: 400 });

  const prompt = PROMPTS[style].replace("{subject}", subject);
  const seed = Math.floor(Math.random() * 999999);

  // nofeed=true prevents the image appearing in Pollinations' public gallery.
  // model=flux requires Pollinations auth and times out/429s for anonymous
  // callers; every other model name (including omitting it) currently
  // resolves to their free "sana" model, so request that explicitly.
  const pollinationsUrl =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=1024&height=1024&nologo=true&nofeed=true&model=sana&seed=${seed}`;

  const token = process.env.POLLINATIONS_API_TOKEN;
  let imgRes: Response;
  try {
    imgRes = await fetch(pollinationsUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  } catch {
    return NextResponse.json({ error: "Could not reach the image service" }, { status: 502 });
  }

  if (!imgRes.ok) {
    const status = imgRes.status === 429 ? 429 : 502;
    return NextResponse.json(
      { error: imgRes.status === 429 ? "Image service is busy — try again shortly." : "Image generation failed" },
      { status },
    );
  }

  // Proxied as a data URL rather than a raw Pollinations URL so the browser's
  // <img> tag never talks to Pollinations directly — every request goes
  // through this authenticated server-side fetch, every time.
  const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
  const buf = Buffer.from(await imgRes.arrayBuffer());
  const imageUrl = `data:${contentType};base64,${buf.toString("base64")}`;

  return NextResponse.json({ imageUrl });
}
