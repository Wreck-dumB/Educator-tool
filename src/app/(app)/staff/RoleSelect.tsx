"use client";

import { updateStaffMemberRole } from "./actions";

export default function RoleSelect({ membershipId, role }: { membershipId: string; role: string }) {
  return (
    <form action={updateStaffMemberRole}>
      <input type="hidden" name="id" value={membershipId} />
      <select
        name="role"
        defaultValue={role}
        onChange={(e) => e.target.form?.requestSubmit()}
        className="rounded-full border border-coral-light px-2 py-0.5 text-xs text-ink/70"
      >
        <option value="2ic">2IC</option>
        <option value="staff">Staff</option>
      </select>
    </form>
  );
}
