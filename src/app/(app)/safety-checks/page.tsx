import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { getRooms } from "@/lib/supabase/rooms";
import { cardClass, primaryButtonClass, errorBannerClass } from "@/lib/ui";
import { saveSafetyCheck } from "./actions";
import PrintButton from "@/components/PrintButton";

// Standard checklist items keyed by category
const CHECK_ITEMS: { category: string; key: string; label: string }[] = [
  // Physical environment
  { category: "Physical environment", key: "playground_hazard_free", label: "Outdoor play area inspected and free of hazards" },
  { category: "Physical environment", key: "indoor_space_clear", label: "Indoor spaces clear of trip hazards and obstructions" },
  { category: "Physical environment", key: "equipment_safe", label: "Equipment and furniture in good condition (no broken/sharp edges)" },
  { category: "Physical environment", key: "gates_fences_secure", label: "Gates, fences, and entry points secure" },
  { category: "Physical environment", key: "sun_protection", label: "Shade/sun protection available in outdoor areas" },
  // Health and hygiene
  { category: "Health & hygiene", key: "nappy_change_area_clean", label: "Nappy changing area clean and stocked" },
  { category: "Health & hygiene", key: "handwashing_accessible", label: "Handwashing facilities accessible and stocked (soap, paper towels)" },
  { category: "Health & hygiene", key: "food_storage_safe", label: "Food stored appropriately (temperature, labelling, allergen separation)" },
  { category: "Health & hygiene", key: "medication_secured", label: "Medications stored securely and correctly labelled" },
  { category: "Health & hygiene", key: "sleep_area_safe", label: "Sleep/rest area set up safely (appropriate bedding, supervision)" },
  // Emergency preparedness
  { category: "Emergency preparedness", key: "first_aid_kit_stocked", label: "First aid kit stocked and in-date" },
  { category: "Emergency preparedness", key: "fire_extinguisher_accessible", label: "Fire extinguisher accessible and in-date" },
  { category: "Emergency preparedness", key: "evacuation_route_clear", label: "Evacuation routes and exits clear and unobstructed" },
  { category: "Emergency preparedness", key: "emergency_contacts_posted", label: "Emergency contact numbers displayed (000, Poison Info 13 11 26)" },
  { category: "Emergency preparedness", key: "emergency_procedure_accessible", label: "Emergency procedures accessible to all staff on duty" },
  // Supervision
  { category: "Supervision", key: "ratios_met", label: "Educator-to-child ratios met at start of session" },
  { category: "Supervision", key: "sign_in_completed", label: "Sign-in/out register completed for children on site" },
  { category: "Supervision", key: "health_plans_accessible", label: "Children's health/allergy management plans accessible to all educators" },
  { category: "Supervision", key: "water_supervision", label: "Water play/aquatics supervised at all times (if applicable today)" },
];

const CATEGORIES = [...new Set(CHECK_ITEMS.map((i) => i.category))];

export default async function SafetyChecksPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; error?: string; room?: string }>;
}) {
  const { date: dateParam, error, room: roomParam } = await searchParams;
  const today = new Date().toISOString().substring(0, 10);
  const selectedDate = dateParam ?? today;

  const ownerUserId = await getMyServiceOwnerId();
  const supabase = await createClient();
  const rooms = await getRooms();

  // Fetch existing check for selected date + room
  const roomId = roomParam || null;
  let existingCheck: Record<string, boolean> | null = null;
  if (ownerUserId) {
    const query = supabase
      .from("environment_safety_checks")
      .select("*")
      .eq("owner_user_id", ownerUserId)
      .eq("check_date", selectedDate);
    if (roomId) {
      query.eq("room_id", roomId);
    } else {
      query.is("room_id", null);
    }
    const { data } = await query.maybeSingle();
    existingCheck = data?.items ?? null;
  }

  // Fetch last 14 days of checks for history
  const { data: history } = ownerUserId
    ? await supabase
        .from("environment_safety_checks")
        .select("check_date, room_id, items")
        .eq("owner_user_id", ownerUserId)
        .gte("check_date", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10))
        .order("check_date", { ascending: false })
    : { data: [] };

  const completedDates = new Set((history ?? []).map((h) => h.check_date));
  const totalItems = CHECK_ITEMS.length;
  const checkedCount = existingCheck ? Object.values(existingCheck).filter(Boolean).length : 0;
  const allDone = checkedCount === totalItems;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="font-display text-3xl font-semibold text-coral-dark">
            Environment Safety Check
          </h1>
          <p className="mt-1 text-sm text-ink/60">
            Daily walkthrough checklist — NQS Quality Area 2 (Children&apos;s health and safety).
            Completed checks are dated evidence for your assessment and rating visit.
          </p>
        </div>
        <PrintButton />
      </div>

      {error && <p className={`mt-4 ${errorBannerClass}`}>{error}</p>}

      {/* Date + room selector */}
      <form method="GET" className="mt-5 flex flex-wrap items-end gap-3 print:hidden">
        <div>
          <label className="block text-xs font-medium text-ink/50 mb-1">Check date</label>
          <input
            type="date"
            name="date"
            defaultValue={selectedDate}
            max={today}
            className="rounded-xl border border-coral-light px-3 py-2 text-sm text-ink focus:border-coral focus:outline-none"
          />
        </div>
        {rooms.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-ink/50 mb-1">Room / area</label>
            <select
              name="room"
              defaultValue={roomId ?? ""}
              className="rounded-xl border border-coral-light px-3 py-2 text-sm text-ink focus:border-coral focus:outline-none"
            >
              <option value="">Whole service</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        )}
        <button
          type="submit"
          className="rounded-full border border-coral-light px-4 py-2 text-sm font-medium text-coral-dark hover:bg-coral-light"
        >
          View
        </button>
      </form>

      {/* Status banner */}
      {existingCheck ? (
        <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${allDone ? "border-sage bg-sage-light/40 text-sage-dark" : "border-amber-300 bg-amber-50 text-amber-800"}`}>
          {allDone
            ? `All ${totalItems} checks completed for ${new Date(selectedDate + "T00:00:00").toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "short" })}.`
            : `${checkedCount} of ${totalItems} checks completed — ${totalItems - checkedCount} outstanding.`}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No check recorded for {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "short" })}.
        </div>
      )}

      {/* Checklist form */}
      <form action={saveSafetyCheck} className={`mt-6 ${cardClass}`}>
        <div className="border-b border-coral-light px-5 py-4 print:hidden">
          <p className="text-sm font-semibold text-ink">Complete the checklist</p>
          <p className="text-xs text-ink/50">Check each item as confirmed safe. Save when done.</p>
        </div>
        <input type="hidden" name="check_date" value={selectedDate} />
        {roomId && <input type="hidden" name="room_id" value={roomId} />}

        <div className="px-5 py-4 space-y-6">
          {CATEGORIES.map((cat) => {
            const items = CHECK_ITEMS.filter((i) => i.category === cat);
            return (
              <div key={cat}>
                <p className="text-xs font-bold uppercase tracking-wide text-ink/40 mb-2">{cat}</p>
                <div className="space-y-2">
                  {items.map((item) => {
                    const checked = existingCheck?.[item.key] ?? false;
                    return (
                      <label key={item.key} className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="hidden"
                          name={`item_${item.key}`}
                          value="0"
                        />
                        <input
                          type="checkbox"
                          name={`item_${item.key}`}
                          value="1"
                          defaultChecked={checked}
                          className="mt-0.5 h-4 w-4 rounded border-coral-light accent-coral shrink-0"
                        />
                        <span className={`text-sm ${checked ? "text-ink/70" : "text-ink"}`}>
                          {item.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div>
            <label className="block text-xs font-medium text-ink/50 mb-1">
              Notes (hazards identified, actions taken, follow-up required)
            </label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={existingCheck ? undefined : ""}
              placeholder="E.g. 'Swing chain loose — reported to coordinator, closed off until repaired.'"
              className="w-full rounded-xl border border-coral-light px-3 py-2 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none"
            />
          </div>
        </div>

        <div className="border-t border-coral-light px-5 py-4 print:hidden">
          <button type="submit" className={`w-full ${primaryButtonClass}`}>
            {existingCheck ? "Update check" : "Save check"}
          </button>
        </div>
      </form>

      {/* 14-day history */}
      <div className={`mt-6 p-5 print:hidden ${cardClass}`}>
        <h2 className="font-display text-sm font-semibold text-ink mb-3">Last 14 days</h2>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 14 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const ds = d.toISOString().substring(0, 10);
            const done = completedDates.has(ds);
            return (
              <a
                key={ds}
                href={`/safety-checks?date=${ds}${roomId ? `&room=${roomId}` : ""}`}
                className={`flex flex-col items-center rounded-xl border px-2.5 py-1.5 text-xs transition-colors ${
                  ds === selectedDate
                    ? "border-coral bg-coral text-white"
                    : done
                    ? "border-sage-light bg-sage-light text-sage-dark hover:bg-sage-light/70"
                    : "border-coral-light text-ink/40 hover:border-coral"
                }`}
              >
                <span className="font-semibold">{d.getDate()}</span>
                <span>{d.toLocaleDateString("en-AU", { month: "short" })}</span>
                {done && <span className="text-[9px] mt-0.5">✓</span>}
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
