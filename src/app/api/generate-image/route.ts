import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rateLimit";

export const maxDuration = 60;

const PROMPTS = {
  outline:
    "Coloring book style outline illustration of: {subject}. Thick clean black outlines only, completely white interior with no shading or color fills, simple bold shapes suitable for young children to cut out with scissors or color in, white background, children's coloring book style.",
  colour:
    "Bright cheerful children's illustration of: {subject}. Flat cartoon style, bold simple colors, friendly and welcoming, white background, suitable for early childhood education ages 3-6, clean and clear.",
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  if (isRateLimited(`img:${user.id}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Image generation limit reached — try again in an hour." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const subject = typeof body?.prompt === "string" ? body.prompt.trim().slice(0, 300) : "";
  const style: "outline" | "colour" = body?.style === "colour" ? "colour" : "outline";

  if (!subject) return NextResponse.json({ error: "prompt is required" }, { status: 400 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Image generation is not configured — contact your administrator." }, { status: 503 });
  }

  const prompt = PROMPTS[style].replace("{subject}", subject);

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json",
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("DALL-E error", err);
    return NextResponse.json({ error: "Image generation failed — please try again." }, { status: 502 });
  }

  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) return NextResponse.json({ error: "No image returned" }, { status: 502 });

  return NextResponse.json({ dataUrl: `data:image/png;base64,${b64}` });
}
