import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { getMyStaffRole } from "@/lib/supabase/staff";
import { getChildren } from "@/lib/supabase/children";
import { cardClass, inputClass, primaryButtonClass, errorBannerClass } from "@/lib/ui";
import { createInvoice } from "./actions";

export const metadata: Metadata = { title: "Invoices · SparkPlay" };

function todayAEST() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  draft:     { label: "Draft",     cls: "bg-ink/5 text-ink/50" },
  sent:      { label: "Sent",      cls: "bg-blue-100 text-blue-700" },
  paid:      { label: "Paid",      cls: "bg-sage-light text-sage-dark" },
  overdue:   { label: "Overdue",   cls: "bg-coral text-white" },
  cancelled: { label: "Cancelled", cls: "bg-ink/10 text-ink/50" },
};

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; add?: string; status?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/generate");

  const myRole = await getMyStaffRole();
  const canManage = myRole === "director" || myRole === "2ic";
  const today = todayAEST();
  const showAdd = params.add === "1";
  const statusFilter = params.status ?? "all";

  const [children, { data: rawInvoices }, { data: lineItems }] = await Promise.all([
    getChildren(),
    supabase
      .from("invoices")
      .select("id, invoice_number, bill_to_name, child_id, period_start, period_end, due_date, status, paid_at, created_at")
      .eq("owner_user_id", ownerUserId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("invoice_line_items")
      .select("invoice_id, quantity, unit_price_cents"),
  ]);

  const invoices = (rawInvoices ?? []).filter((inv) =>
    statusFilter === "all" ? true : inv.status === statusFilter
  );

  // Sum totals per invoice
  const totalByInvoice = new Map<string, number>();
  for (const li of lineItems ?? []) {
    const prev = totalByInvoice.get(li.invoice_id) ?? 0;
    totalByInvoice.set(li.invoice_id, prev + li.quantity * li.unit_price_cents);
  }

  const childNameById = new Map(children.map((c) => [c.id, c.first_name]));

  // Next invoice number
  const nextNum = `INV-${String((rawInvoices?.length ?? 0) + 1).padStart(4, "0")}`;

  const tabs = [
    { key: "all", label: "All" },
    { key: "draft", label: "Draft" },
    { key: "sent", label: "Sent" },
    { key: "overdue", label: "Overdue" },
    { key: "paid", label: "Paid" },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-coral-dark">Invoices</h1>
          <p className="mt-1 text-sm text-ink/60">Create and track fee invoices for families.</p>
        </div>
        {canManage && (
          <a href="/invoices?add=1" className={`${primaryButtonClass} no-underline`}>
            + New invoice
          </a>
        )}
      </div>

      {params.error && <p className={`mt-4 ${errorBannerClass}`}>{params.error}</p>}

      {/* Create form */}
      {showAdd && canManage && (
        <div className={`mt-5 ${cardClass}`}>
          <div className="border-b border-coral-light px-4 py-3">
            <h2 className="font-display text-sm font-semibold text-ink">New invoice</h2>
          </div>
          <form action={createInvoice} className="flex flex-col gap-4 p-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">Invoice # *</label>
                <input type="text" name="invoice_number" defaultValue={nextNum} required className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">Child</label>
                <select name="child_id" className={inputClass}>
                  <option value="">— select child —</option>
                  {children.map((c) => (
                    <option key={c.id} value={c.id}>{c.first_name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Bill to (name) *</label>
              <input type="text" name="bill_to_name" required className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Bill to (email)</label>
              <input type="email" name="bill_to_email" className={inputClass} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">Period start *</label>
                <input type="date" name="period_start" required className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">Period end *</label>
                <input type="date" name="period_end" required className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">Due date</label>
                <input type="date" name="due_date" className={inputClass} />
              </div>
            </div>

            {/* Line items */}
            <div>
              <p className="mb-2 text-xs font-semibold text-ink/60">Line items</p>
              <div className="flex flex-col gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="grid grid-cols-12 gap-2">
                    <input type="text" name="description" placeholder={i === 0 ? "e.g. Weekly childcare fee" : "Description"} className={`col-span-7 ${inputClass}`} />
                    <input type="number" name="quantity" defaultValue="1" min="0.01" step="0.01" className={`col-span-2 ${inputClass}`} />
                    <input type="text" name="unit_price" placeholder="0.00" className={`col-span-3 ${inputClass}`} />
                  </div>
                ))}
                <p className="text-xs text-ink/30">Description · Qty · Unit price ($)</p>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Notes</label>
              <input type="text" name="notes" placeholder="Payment instructions, account details, etc." className={inputClass} />
            </div>

            <div className="flex gap-3">
              <button type="submit" className={primaryButtonClass}>Create invoice</button>
              <a href="/invoices" className="rounded-xl border border-coral-light px-4 py-2 text-sm font-semibold text-ink/60 hover:bg-coral-light">
                Cancel
              </a>
            </div>
          </form>
        </div>
      )}

      {/* Filter tabs */}
      <div className="mt-5 flex gap-2 border-b border-coral-light">
        {tabs.map((t) => (
          <a
            key={t.key}
            href={`/invoices?status=${t.key}`}
            className={`-mb-px rounded-t-lg border border-b-0 px-4 py-2 text-sm font-semibold transition-colors ${
              statusFilter === t.key
                ? "border-coral-light bg-white text-coral-dark"
                : "border-transparent text-ink/40 hover:text-coral-dark"
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>

      {/* Invoice list */}
      {invoices.length === 0 ? (
        <p className={`mt-6 p-5 text-sm text-ink/50 ${cardClass}`}>No invoices here yet.</p>
      ) : (
        <div className={`mt-4 ${cardClass}`}>
          <ul className="divide-y divide-coral-light">
            {invoices.map((inv) => {
              const meta = STATUS_META[inv.status] ?? { label: inv.status, cls: "bg-ink/5 text-ink/50" };
              const total = totalByInvoice.get(inv.id) ?? 0;
              const isOverdue = inv.status === "sent" && inv.due_date && inv.due_date < today;
              return (
                <li key={inv.id}>
                  <Link href={`/invoices/${inv.id}`} className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-cream/50">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">
                        {inv.invoice_number} · {inv.bill_to_name}
                      </p>
                      <p className="text-xs text-ink/50">
                        {inv.child_id && childNameById.get(inv.child_id)
                          ? `${childNameById.get(inv.child_id)} · `
                          : ""}
                        {new Date(inv.period_start + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })}–{new Date(inv.period_end + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                      {inv.due_date && (
                        <p className={`text-xs ${isOverdue ? "font-semibold text-coral-dark" : "text-ink/40"}`}>
                          Due {new Date(inv.due_date + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                          {isOverdue ? " — OVERDUE" : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-semibold text-ink">{total > 0 ? formatCents(total) : "—"}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.cls}`}>
                        {meta.label}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
