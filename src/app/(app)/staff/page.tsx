import { createClient } from "@/lib/supabase/server";
import { getMyService, getStaffMembers, getStaffInvites } from "@/lib/supabase/staff";
import { inputClass, cardClass, primaryButtonClass, errorBannerClass } from "@/lib/ui";
import { createStaffInvite, revokeStaffInvite, setStaffMemberStatus } from "./actions";
import RoleSelect from "./RoleSelect";

const ROLE_LABELS: Record<string, string> = {
  director: "Director",
  "2ic": "2IC",
  staff: "Staff",
};

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const service = await getMyService();
  if (!service || !user) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-ink/50">No active service membership.</p>
      </div>
    );
  }

  const members = await getStaffMembers(service.id);
  const myMembership = members.find((m) => m.user_id === user.id);
  const canManage = myMembership?.role === "director" || myMembership?.role === "2ic";
  const isDirector = myMembership?.role === "director";
  const invites = canManage ? await getStaffInvites(service.id) : [];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-coral-dark">{service.name} — Staff</h1>
      <p className="mt-1 text-sm text-ink/60">
        {canManage
          ? "Invite staff, change roles, or remove access. Removing someone keeps their historical records exactly as attributed — it only revokes future access."
          : "Your role at this service."}
      </p>

      {error && <p className={errorBannerClass}>{error}</p>}

      <div className={`mt-6 ${cardClass}`}>
        <div className="border-b border-coral-light px-4 py-3">
          <h2 className="font-display text-sm font-semibold text-ink">Team</h2>
        </div>
        <ul className="divide-y divide-coral-light">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-ink">{m.displayName}</p>
                <p className="text-xs text-ink/50">
                  {ROLE_LABELS[m.role]} · {m.status === "active" ? "Active" : "Removed"}
                </p>
              </div>
              {isDirector && m.role !== "director" && (
                <div className="flex items-center gap-2">
                  <RoleSelect membershipId={m.id} role={m.role} />
                  <form action={setStaffMemberStatus}>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="status" value={m.status === "active" ? "removed" : "active"} />
                    <button type="submit" className="text-xs font-medium text-coral-dark hover:underline">
                      {m.status === "active" ? "Remove" : "Reinstate"}
                    </button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {canManage && (
        <div className={`mt-6 p-4 ${cardClass}`}>
          <h2 className="font-display text-sm font-semibold text-ink">Invite staff</h2>
          <form action={createStaffInvite} className="mt-3 flex gap-2">
            <input type="hidden" name="service_id" value={service.id} />
            <input
              name="invited_email"
              type="email"
              required
              placeholder="staff@example.com"
              className={`${inputClass} mt-0 flex-1`}
            />
            <select name="invited_role" defaultValue="staff" className={`${inputClass} mt-0 w-32`}>
              <option value="staff">Staff</option>
              {isDirector && <option value="2ic">2IC</option>}
            </select>
            <button type="submit" className={`shrink-0 ${primaryButtonClass}`}>
              Invite
            </button>
          </form>

          {invites.length > 0 && (
            <ul className="mt-4 divide-y divide-coral-light">
              {invites.map((invite) => (
                <li key={invite.id} className="flex items-center justify-between gap-3 py-2">
                  <div>
                    <p className="text-sm text-ink/80">{invite.invited_email}</p>
                    <p className="text-xs text-ink/40">{ROLE_LABELS[invite.invited_role]} · {invite.status}</p>
                  </div>
                  {invite.status === "pending" && (
                    <form action={revokeStaffInvite}>
                      <input type="hidden" name="id" value={invite.id} />
                      <button type="submit" className="text-xs font-medium text-coral-dark hover:underline">
                        Revoke
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
