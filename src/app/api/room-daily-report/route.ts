import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rateLimit";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

const REPORT_TOOL: Anthropic.Tool = {
  name: "generate_room_daily_report",
  description: "Generate a warm, professional end-of-day summary for an early childhood room.",
  input_schema: {
    type: "object",
    required: ["attendance_summary", "highlights", "learning_and_development", "care_and_wellbeing", "closing_note"],
    properties: {
      attendance_summary: {
        type: "string",
        description: "Brief factual summary of who attended and how the day looked in terms of numbers.",
      },
      highlights: {
        type: "array",
        items: { type: "string" },
        minItems: 2,
        maxItems: 5,
        description: "Notable moments or activities from the day — specific, warm, and child-centred.",
      },
      learning_and_development: {
        type: "string",
        description:
          "1-2 sentences on the learning themes or EYLF areas most visible today, drawn from the observations provided. Be specific.",
      },
      care_and_wellbeing: {
        type: "string",
        description:
          "Brief note on how children's physical and emotional wellbeing was supported today. If incidents occurred, acknowledge them without naming children or giving details that would breach confidentiality.",
      },
      suggestions_for_tomorrow: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        maxItems: 3,
        description: "Optional educator-facing suggestions for continuity or follow-up tomorrow, based on today's data.",
      },
      closing_note: {
        type: "string",
        description: "A warm, one-sentence closing — suitable to share with families or the director.",
      },
    },
  },
};

const SYSTEM_PROMPT = `You are an early childhood education specialist helping an Australian educator summarise their room's day.

Write in a warm, professional tone that reflects the EYLF's image of the child as capable and curious.
- NEVER use any child's name — always say "a child", "the children", or use the positional label given (e.g. "Child 1") if needed to distinguish individuals
- Do NOT fabricate specific events — only describe what is evidenced by the data provided
- Protect confidentiality: if there were incidents, acknowledge care was provided without naming children or specifics
- Keep the report concise — it should be readable in under a minute

PRIVACY: This is a child safety requirement. Never repeat or include any child's real name in your response.`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (isRateLimited(`room-daily-report:${user.id}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Rate limit reached — try again later." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const roomId = typeof body?.roomId === "string" ? body.roomId : null;
  const date = typeof body?.date === "string" ? body.date : new Date().toISOString().slice(0, 10);

  if (!roomId) {
    return NextResponse.json({ error: "roomId is required" }, { status: 400 });
  }

  const dateStart = `${date}T00:00:00.000Z`;
  const dateEnd = `${date}T23:59:59.999Z`;

  // Fetch room + children in that room
  const [{ data: room }, { data: roomChildren }] = await Promise.all([
    supabase.from("rooms").select("name").eq("id", roomId).single(),
    supabase.from("children").select("id").eq("room_id", roomId),
  ]);

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const childIds = (roomChildren ?? []).map((c) => c.id);

  if (childIds.length === 0) {
    return NextResponse.json({ error: "No children are assigned to this room" }, { status: 400 });
  }

  // Fetch today's data for these children
  const [{ data: attendance }, { data: observations }, { data: incidents }] = await Promise.all([
    supabase
      .from("attendance_records")
      .select("child_id, status, signed_in_at, signed_out_at")
      .in("child_id", childIds)
      .eq("date", date),
    supabase
      .from("observations")
      .select("child_id, note_text, observed_at")
      .in("child_id", childIds)
      .gte("observed_at", dateStart)
      .lte("observed_at", dateEnd),
    supabase
      .from("child_incident_reports")
      .select("child_id, record_type, description, action_taken")
      .in("child_id", childIds)
      .gte("occurred_at", dateStart)
      .lte("occurred_at", dateEnd),
  ]);

  // Map child IDs to anonymous labels (Child 1, Child 2, ...) so the AI
  // can produce a coherent report without receiving any real child names.
  const childLabelMap = new Map(
    (roomChildren ?? []).map((c, i) => [c.id, `Child ${i + 1}`]),
  );

  const attendanceSummary = (attendance ?? [])
    .filter((a) => a.status !== "absent")
    .map((a) => {
      const label = childLabelMap.get(a.child_id) ?? "A child";
      const signIn = a.signed_in_at ? new Date(a.signed_in_at).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }) : "?";
      const signOut = a.signed_out_at ? new Date(a.signed_out_at).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }) : "still in";
      return `${label}: ${signIn}–${signOut}`;
    })
    .join("; ");

  const obsSummary = (observations ?? [])
    .map((o) => {
      const label = childLabelMap.get(o.child_id) ?? "A child";
      return `${label}: ${o.note_text}`;
    })
    .join("\n");

  const incidentCount = (incidents ?? []).length;
  const incidentSummary =
    incidentCount > 0
      ? `${incidentCount} incident/injury/illness record(s) were filed today. Details are confidential — only acknowledge that care was provided.`
      : "No incidents filed today.";

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 500 });

  const userPrompt = `Room: ${room.name}
Date: ${new Date(date).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
Children enrolled in room: ${(roomChildren ?? []).length}

Attendance today:
${attendanceSummary || "No attendance records found for today."}

Observations logged today:
${obsSummary || "No observations logged today."}

Incidents:
${incidentSummary}

Generate the daily room summary using the generate_room_daily_report tool.`;

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
      tools: [REPORT_TOOL],
      tool_choice: { type: "tool", name: "generate_room_daily_report" },
    });

    const toolUse = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    if (!toolUse) throw new Error("No tool call returned");

    return NextResponse.json({ ...toolUse.input as object, roomName: room.name, date });
  } catch (err) {
    console.error("Room daily report generation failed:", err);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 502 });
  }
}
