import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { ownerUserId, type, context, questions, responses, keyLearning } = body;

  if (
    typeof ownerUserId !== "string" ||
    typeof type !== "string" ||
    typeof context !== "string" ||
    !Array.isArray(questions) ||
    !Array.isArray(responses)
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!["post_incident", "end_of_day", "general"].includes(type)) {
    return NextResponse.json({ error: "Invalid reflection type" }, { status: 400 });
  }

  if (context.trim().length < 10 || context.trim().length > 3000) {
    return NextResponse.json({ error: "Context must be 10–3000 characters" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("staff_reflections")
    .insert({
      owner_user_id: ownerUserId,
      author_user_id: user.id,
      reflection_type: type as "post_incident" | "end_of_day" | "general",
      context_text: context.trim(),
      ai_questions: questions,
      responses,
      key_learning: typeof keyLearning === "string" && keyLearning.trim() ? keyLearning.trim() : null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("save-reflection error:", error);
    return NextResponse.json({ error: "Failed to save reflection" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
