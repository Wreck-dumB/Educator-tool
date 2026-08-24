import { NextResponse } from "next/server";
import sharp from "sharp";
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
    "A black-and-white hand-drawn ink illustration of one single {subject}, centered on a completely white background. Only one isolated subject, nothing else. Full-body children's-book mascot design, like a cartoon character on a cereal box or storybook cover — NOT a portrait, NOT a headshot, NOT a close-up face, NOT photorealistic, NOT a photograph, NOT a 3D render. Simple rounded proportions (big head, small body) typical of a young-kids illustration. Bold clean outlines with some interior detail lines for facial features, patterns, and clothing, so the subject is clearly recognisable, not a flat blank silhouette. No shading, no grey fills, no color, no gradients, no background details, no other objects. Simple and bold enough for a young child to colour in or cut out with scissors.",
  colour:
    "A bright cheerful flat cartoon illustration of one single {subject}, centered on a pure white background. Only this one subject, nothing else in the image at all. Children's picture-book cartoon illustration style — NOT a photograph, NOT a 3D render, NOT realistic. Bold simple colors, no background scenery, no other objects, no decorations. Suitable for early childhood education ages 3 to 6.",
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
  let contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
  let buf = Buffer.from(await imgRes.arrayBuffer());

  // The prompt asks for flat black-and-white line art with a hollow (blank)
  // interior, but the free model doesn't reliably obey that — it routinely
  // returns a fully shaded/photorealistic-looking image instead, which reads
  // as "scary" rather than a colouring page a child can actually use.
  // Grayscaling alone doesn't fix this - it only removes hue, the shading and
  // gradients stay. So for "outline" this now runs a real edge-detect +
  // threshold pipeline: greyscale -> slight blur (denoise) -> Laplacian edge
  // kernel -> invert -> normalise -> hard threshold. The result is a genuine
  // hollow-interior line drawing (a real coloring-book page) regardless of
  // how the source image was shaded, tested against several very different
  // source styles (photorealistic 3D render, painterly cartoon, product
  // photo) with consistently good results. PNG (not JPEG) to keep the lines
  // crisp — JPEG compression artefacts blur fine linework on print.
  if (style === "outline") {
    try {
      buf = await sharp(buf)
        .greyscale()
        .blur(0.5)
        .convolve({ width: 3, height: 3, kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1] })
        .negate()
        .normalise()
        .threshold(190)
        .png()
        .toBuffer();
      contentType = "image/png";
    } catch {
      // Fall through with the original image rather than fail the request -
      // an unprocessed image still beats no image at all.
    }
  }

  const imageUrl = `data:${contentType};base64,${buf.toString("base64")}`;

  return NextResponse.json({ imageUrl });
}
