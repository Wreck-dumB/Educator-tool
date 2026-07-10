import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateBrainBreaks, type BrainBreakInput } from "@/lib/anthropic";
import { isRateLimited } from "@/lib/rateLimit";

const VALID_AGE_GROUPS = ["toddlers_1_2", "toddlers_2_3", "preschool_3_4", "preschool_4_5", "kindy_5_plus", "mixed"];
const VALID_ENERGIES = ["too_high", "too_low", "scattered"];
const VALID_BREAK_TYPES = ["any", "movement", "mindfulness", "cognitive", "creative", "sensory"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  if (isRateLimited(user.id, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Generation limit reached — try again in a bit." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!VALID_AGE_GROUPS.includes(body.ageGroup)) {
    return NextResponse.json({ error: "Invalid age group" }, { status: 400 });
  }
  if (!VALID_ENERGIES.includes(body.roomEnergy)) {
    return NextResponse.json({ error: "Invalid room energy" }, { status: 400 });
  }

  const durationMinutes = [2, 5, 10].includes(body.durationMinutes) ? body.durationMinutes : 5;
  const breakType = VALID_BREAK_TYPES.includes(body.breakType) ? body.breakType : "any";

  const input: BrainBreakInput = {
    ageGroup: body.ageGroup,
    roomEnergy: body.roomEnergy as BrainBreakInput["roomEnergy"],
    durationMinutes,
    breakType,
  };

  let breaks;
  try {
    breaks = await generateBrainBreaks(input, 3);
  } catch (err) {
    console.error("Brain break generation failed", err);
    return NextResponse.json({ error: "Failed to generate brain breaks" }, { status: 502 });
  }

  return NextResponse.json({ breaks });
}
