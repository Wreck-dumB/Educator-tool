import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

// Provisions a brand-new, fully isolated demo centre: its own auth user,
// service, staff membership, and a small set of realistic-but-fictional
// sample data. Every "Try the demo" click calls this once, so no two
// visitors ever share data -- isolation comes from the normal per-owner
// RLS model (has_service_role/owner_user_id), not anything demo-specific.

function randomPassword(): string {
  return `Demo-${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

const DEMO_CHILDREN = [
  { first_name: "Ruby", date_of_birth: "2023-03-12", current_interests: "Water play, animal sounds" },
  { first_name: "Kai", date_of_birth: "2021-07-04", current_interests: "Building blocks, dinosaurs" },
  { first_name: "Amara", date_of_birth: "2020-11-19", current_interests: "Drawing, storytime" },
] as const;

export async function createDemoAccount(admin: SupabaseClient<Database>) {
  const email = `demo-${crypto.randomUUID()}@drsparkplay-demo.internal`;
  const password = randomPassword();

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: "Demo", last_name: "Director" },
  });
  if (authError || !authData.user) {
    throw new Error(`Failed to create demo user: ${authError?.message}`);
  }
  const userId = authData.user.id;

  try {
    // terms/media-consent are pre-accepted here rather than routing through
    // /accept-terms + /accept-media-consent -- those gates exist for real
    // signups where a human is agreeing to something; a synthetic demo
    // account has no photos/data to consent about and skipping them is what
    // makes the demo a single click instead of three screens.
    const now = new Date().toISOString();
    const { error: profileError } = await admin.from("profiles").insert({
      id: userId,
      role: "educator",
      display_name: "Demo Director",
      terms_accepted_at: now,
      terms_version: "1.0",
      media_consent_at: now,
      media_consent_version: "1.0",
    });
    if (profileError) throw new Error(`profiles: ${profileError.message}`);

    const { data: service, error: serviceError } = await admin
      .from("services")
      .insert({ director_user_id: userId, name: "Sunny Days Demo Centre", is_demo: true })
      .select("id")
      .single();
    if (serviceError || !service) throw new Error(`services: ${serviceError?.message}`);

    const { error: membershipError } = await admin.from("staff_memberships").insert({
      service_id: service.id,
      user_id: userId,
      role: "director",
    });
    if (membershipError) throw new Error(`staff_memberships: ${membershipError.message}`);

    const { data: rooms, error: roomsError } = await admin
      .from("rooms")
      .insert([
        { owner_user_id: userId, name: "Nursery", sort_order: 0 },
        { owner_user_id: userId, name: "Kindy", sort_order: 1 },
      ])
      .select("id, name");
    if (roomsError || !rooms) throw new Error(`rooms: ${roomsError?.message}`);
    const roomIdByName = new Map(rooms.map((r) => [r.name, r.id]));

    const { data: children, error: childrenError } = await admin
      .from("children")
      .insert(
        DEMO_CHILDREN.map((c) => ({
          owner_user_id: userId,
          first_name: c.first_name,
          date_of_birth: c.date_of_birth,
          current_interests: c.current_interests,
          room_id: c.first_name === "Ruby" ? roomIdByName.get("Nursery") : roomIdByName.get("Kindy"),
        })),
      )
      .select("id, first_name");
    if (childrenError || !children) throw new Error(`children: ${childrenError?.message}`);
    const childIdByName = new Map(children.map((c) => [c.first_name, c.id]));

    const { data: activities, error: activitiesError } = await admin
      .from("generated_activities")
      .insert([
        {
          owner_user_id: userId,
          title: "Rainbow Water Pouring Station",
          summary: "A sensory pouring activity using coloured water and stacking cups.",
          steps: ["Fill jugs with coloured water", "Set out cups on a tray", "Invite pouring and stacking"],
          materials_used: ["Jugs", "Plastic cups", "Food colouring"],
          age_range: "1-2 years",
          duration_minutes: 20,
          energy_level: "calm",
          group_size_fit: "small_group",
          generation_mode: "materials",
        },
        {
          owner_user_id: userId,
          title: "Dinosaur Fossil Dig",
          summary: "A pretend excavation activity using toy dinosaurs buried in kinetic sand.",
          steps: ["Bury dinosaurs in the sand tray", "Give out brushes and tools", "Dig and discover"],
          materials_used: ["Kinetic sand", "Toy dinosaurs", "Paintbrushes"],
          age_range: "3-5 years",
          duration_minutes: 30,
          energy_level: "moderate",
          group_size_fit: "small_group",
          generation_mode: "interest",
        },
      ])
      .select("id, title");
    if (activitiesError || !activities) throw new Error(`generated_activities: ${activitiesError?.message}`);

    function must<T>(value: T | undefined, what: string): T {
      if (value === undefined) throw new Error(`demo seed: expected ${what} to exist`);
      return value;
    }

    const rubyId = must(childIdByName.get("Ruby"), "Ruby's id");
    const kaiId = must(childIdByName.get("Kai"), "Kai's id");
    const amaraId = must(childIdByName.get("Amara"), "Amara's id");
    const waterActivityId = must(activities.find((a) => a.title.startsWith("Rainbow"))?.id, "water activity id");
    const dinoActivityId = must(activities.find((a) => a.title.startsWith("Dinosaur"))?.id, "dino activity id");

    const { error: obsError } = await admin.from("observations").insert([
      {
        owner_user_id: userId,
        child_id: rubyId,
        activity_id: waterActivityId,
        note_text: "Ruby explored pouring water between cups, watching the colours mix with delight.",
      },
      {
        owner_user_id: userId,
        child_id: kaiId,
        activity_id: dinoActivityId,
        note_text: "Kai carefully brushed sand away from each dinosaur, naming them as he found them.",
      },
      {
        owner_user_id: userId,
        child_id: amaraId,
        note_text: "Amara drew a detailed picture of her family and talked through each person with a friend.",
      },
    ]);
    if (obsError) throw new Error(`observations: ${obsError.message}`);

    const today = new Date().toISOString().slice(0, 10);
    const { error: attendanceError } = await admin.from("attendance_records").insert(
      children.map((c) => ({
        owner_user_id: userId,
        child_id: c.id,
        date: today,
        status: "signed_in" as const,
        signed_in_at: new Date().toISOString(),
        signed_in_by: "Demo Parent",
      })),
    );
    if (attendanceError) throw new Error(`attendance_records: ${attendanceError.message}`);

    return { email, password, userId, serviceId: service.id };
  } catch (err) {
    // Best-effort cleanup if seeding fails partway -- deleting the auth user
    // cascades away everything owner_user_id-keyed, but the services row
    // has ON DELETE RESTRICT on director_user_id, so it must go first.
    await admin.from("services").delete().eq("director_user_id", userId);
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    throw err;
  }
}

export async function deleteDemoAccount(admin: SupabaseClient<Database>, userId: string) {
  // services.director_user_id is ON DELETE RESTRICT -- must delete the
  // service first so the auth user delete (which cascades everything else
  // owner_user_id-keyed) doesn't hit a foreign key violation.
  await admin.from("services").delete().eq("director_user_id", userId);
  await admin.auth.admin.deleteUser(userId);
}
