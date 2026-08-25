import { NextResponse } from "next/server";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rateLimit";
import { CLIPART_ITEMS } from "@/lib/clipart";

// Edge-detect + threshold pipeline: greyscale -> slight blur (denoise) ->
// Laplacian edge kernel -> invert -> normalise -> hard threshold. Produces a
// genuine hollow-interior black-and-white line drawing regardless of the
// source's own shading. Used for both a clean pre-made clipart SVG (where it
// reliably produces a crisp result — this is why the clipart path exists at
// all) and as a fallback on an AI-generated photo (where results vary with
// how the model happened to shade that particular image — tested against
// several very different source styles with mixed results, hence preferring
// the clipart path whenever a match exists).
async function toLineArt(imageBuf: Buffer): Promise<Buffer> {
  return sharp(imageBuf, { density: 300 })
    .resize(1024, 1024, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .greyscale()
    .blur(0.5)
    .convolve({ width: 3, height: 3, kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1] })
    .negate()
    .normalise()
    .threshold(190)
    .png()
    .toBuffer();
}

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

// Gemini's free tier (2.5 Flash Image, aka "Nano Banana") is being A/B tested
// against Pollinations — better prompt adherence in early testing, may solve
// the outline-style reliability issues documented alongside toLineArt above.
// Toggle with IMAGE_BACKEND=gemini; anything else keeps using Pollinations.
async function generateWithGemini(prompt: string): Promise<{ buf: Buffer; contentType: string } | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    },
  );
  if (!res.ok) return null;

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData);
  if (!imagePart?.inlineData) return null;

  return {
    buf: Buffer.from(imagePart.inlineData.data, "base64"),
    contentType: imagePart.inlineData.mimeType || "image/png",
  };
}

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
  const clipartId = typeof body?.clipartId === "string" ? body.clipartId : "";

  if (!subject) return NextResponse.json({ error: "prompt is required" }, { status: 400 });

  // A curated pre-made icon beats gambling on live AI generation every time —
  // see src/lib/clipart.ts. Only applies to "outline": these SVGs are already
  // exactly the flat cartoon style "colour" asks for, so colour keeps using
  // Pollinations directly for that style. Clean vector art run through the
  // same edge-detect pipeline below gave consistently good, recognisable
  // hollow-interior line art in testing — unlike AI photos, which ranged from
  // fine to illegible/scary depending on the subject.
  if (style === "outline" && clipartId) {
    const item = CLIPART_ITEMS.find((i) => i.id === clipartId);
    if (item) {
      try {
        const svgPath = path.join(process.cwd(), "public", item.src);
        const svgBuf = await readFile(svgPath);
        const lineArt = await toLineArt(svgBuf);
        return NextResponse.json({ imageUrl: `data:image/png;base64,${lineArt.toString("base64")}` });
      } catch (err) {
        // Fall through to AI generation below rather than fail the request.
        console.error(`clipart svgToLineArt failed for "${clipartId}"`, err);
      }
    }
  }

  const prompt = PROMPTS[style].replace("{subject}", subject);
  const seed = Math.floor(Math.random() * 999999);

  let contentType: string;
  let buf: Buffer;

  if (process.env.IMAGE_BACKEND === "gemini") {
    let gemini: Awaited<ReturnType<typeof generateWithGemini>>;
    try {
      gemini = await generateWithGemini(prompt);
    } catch {
      return NextResponse.json({ error: "Could not reach the image service" }, { status: 502 });
    }
    if (!gemini) {
      return NextResponse.json({ error: "Image generation failed" }, { status: 502 });
    }
    ({ buf, contentType } = gemini);
  } else {
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
    contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
    buf = Buffer.from(await imgRes.arrayBuffer());
  }

  // No clipart match — fall back to the same line-art pipeline on the AI
  // photo. Quality varies with how the model happened to shade this
  // particular image (see toLineArt's comment), but still beats a raw
  // full-colour/shaded photo for what's supposed to be a colouring page.
  if (style === "outline") {
    try {
      buf = await toLineArt(buf);
      contentType = "image/png";
    } catch {
      // Fall through with the original image rather than fail the request -
      // an unprocessed image still beats no image at all.
    }
  }

  const imageUrl = `data:${contentType};base64,${buf.toString("base64")}`;

  return NextResponse.json({ imageUrl });
}
