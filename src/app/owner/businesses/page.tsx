import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateServiceAccess } from "./actions";
import type { AccessStatus } from "@/lib/supabase/serviceAccess";

export const metadata: Metadata = { title: "Businesses · DR. SparkPlay" };

const STATUS_STYLES: Record<AccessStatus, string> = {
  active: "bg-green-100 text-green-800",
  trial: "bg-amber-100 text-amber-800",
  suspended: "bg-red-100 text-red-800",
  expired: "bg-ink/10 text-ink/60",
};

const STATUS_OPTIONS: AccessStatus[] = ["trial", "active", "suspended", "expired"];

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function OwnerBusinessesPage() {
  const admin = createAdminClient();

  const [servicesRes, accessRes, childrenRes, usersRes] = await Promise.all([
    admin.from("services").select("id, name, display_name, director_user_id, created_at"),
    admin.from("service_access").select("service_id, status, trial_ends_at, notes, updated_at"),
    admin.from("children").select("owner_user_id"),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const services = servicesRes.data ?? [];
  const accessByService = new Map(
    (accessRes.data ?? []).map((a) => [a.service_id, a]),
  );
  const emailByUserId = new Map(
    (usersRes.data?.users ?? []).map((u) => [u.id, u.email ?? ""]),
  );
  const childCountByOwner = new Map<string, number>();
  for (const c of childrenRes.data ?? []) {
    childCountByOwner.set(c.owner_user_id, (childCountByOwner.get(c.owner_user_id) ?? 0) + 1);
  }

  const rows = services
    .map((s) => {
      const access = accessByService.get(s.id);
      return {
        id: s.id,
        name: s.display_name || s.name,
        email: emailByUserId.get(s.director_user_id) || "—",
        createdAt: s.created_at,
        childCount: childCountByOwner.get(s.director_user_id) ?? 0,
        status: (access?.status ?? "trial") as AccessStatus,
        trialEndsAt: access?.trial_ends_at ?? null,
        notes: access?.notes ?? "",
        updatedAt: access?.updated_at ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Businesses</h1>
        <p className="mt-1 text-sm text-ink/60">
          Every centre with a DR. SparkPlay account and its access status. Change a status to switch
          a centre on or off — suspended and expired centres (and lapsed trials) are locked out of
          the app until you reactivate them.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-white border border-ink/10 px-3 py-1 text-ink/70">
            {rows.length} total
          </span>
          {STATUS_OPTIONS.map((s) => (
            <span key={s} className={`rounded-full px-3 py-1 capitalize ${STATUS_STYLES[s]}`}>
              {counts[s] ?? 0} {s}
            </span>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-ink/10 bg-white p-6 text-sm text-ink/60">
          No businesses yet.
        </p>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <form
              key={r.id}
              action={updateServiceAccess}
              className="rounded-2xl border border-ink/10 bg-white p-5"
            >
              <input type="hidden" name="service_id" value={r.id} />
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-ink truncate">{r.name}</h2>
                    <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${STATUS_STYLES[r.status]}`}>
                      {r.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-ink/50">
                    {r.email} · {r.childCount} {r.childCount === 1 ? "child" : "children"} · joined{" "}
                    {fmtDate(r.createdAt)}
                    {r.updatedAt ? ` · updated ${fmtDate(r.updatedAt)}` : ""}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[10rem_11rem_1fr_auto] sm:items-end">
                <label className="text-xs text-ink/60">
                  Status
                  <select
                    name="status"
                    defaultValue={r.status}
                    className="mt-1 w-full rounded-lg border border-ink/15 bg-cream px-2 py-1.5 text-sm text-ink capitalize"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s} className="capitalize">
                        {s}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-xs text-ink/60">
                  Trial ends (optional)
                  <input
                    type="date"
                    name="trial_ends_at"
                    defaultValue={r.trialEndsAt ? r.trialEndsAt.slice(0, 10) : ""}
                    className="mt-1 w-full rounded-lg border border-ink/15 bg-cream px-2 py-1.5 text-sm text-ink"
                  />
                </label>

                <label className="text-xs text-ink/60">
                  Notes
                  <input
                    type="text"
                    name="notes"
                    defaultValue={r.notes}
                    placeholder="e.g. paid to Aug, 2 rooms"
                    className="mt-1 w-full rounded-lg border border-ink/15 bg-cream px-2 py-1.5 text-sm text-ink"
                  />
                </label>

                <button
                  type="submit"
                  className="rounded-lg bg-coral px-4 py-1.5 text-sm font-medium text-white hover:bg-coral-dark"
                >
                  Save
                </button>
              </div>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}
