import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { markInvoicePaid, updateInvoiceStatus } from "../actions";
import PrintButton from "./PrintButton";

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function todayAEST() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/invoices");

  const [{ data: inv }, { data: lineItems }, { data: service }] = await Promise.all([
    supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .eq("owner_user_id", ownerUserId)
      .single(),
    supabase
      .from("invoice_line_items")
      .select("*")
      .eq("invoice_id", id)
      .order("created_at"),
    supabase
      .from("services")
      .select("name, display_name")
      .eq("director_user_id", ownerUserId)
      .maybeSingle(),
  ]);

  if (!inv) notFound();

  const items = lineItems ?? [];
  const subtotal = items.reduce((s, li) => s + li.quantity * li.unit_price_cents, 0);
  const today = todayAEST();
  const isOverdue = inv.status === "sent" && inv.due_date && inv.due_date < today;
  const serviceName = service?.display_name ?? service?.name ?? "DR. SparkPlay Service";

  return (
    <div className="mx-auto max-w-2xl">
      {/* Toolbar (hidden on print) */}
      <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
        <a href="/invoices" className="text-sm font-medium text-ink/50 hover:text-coral-dark">← Invoices</a>
        <PrintButton />
        {inv.status !== "paid" && inv.status !== "cancelled" && (
          <form action={async () => { "use server"; await markInvoicePaid(id); }}>
            <button type="submit" className="rounded-xl bg-sage px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
              Mark as paid
            </button>
          </form>
        )}
        {inv.status === "draft" && (
          <form action={async () => { "use server"; await updateInvoiceStatus(id, "sent"); }}>
            <button type="submit" className="rounded-xl bg-coral px-4 py-2 text-sm font-semibold text-white hover:bg-coral-dark">
              Mark as sent
            </button>
          </form>
        )}
      </div>

      {/* Invoice document */}
      <div className="rounded-3xl border border-coral-light bg-white p-8 shadow-sm print:border-none print:p-0 print:shadow-none">
        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="font-display text-2xl font-bold text-coral-dark">{serviceName}</p>
            {isOverdue && (
              <span className="mt-1 inline-block rounded-full bg-coral px-3 py-0.5 text-xs font-bold text-white">
                OVERDUE
              </span>
            )}
          </div>
          <div className="text-right">
            <p className="font-display text-xl font-bold text-ink">INVOICE</p>
            <p className="mt-0.5 text-sm text-ink/60">{inv.invoice_number}</p>
          </div>
        </div>

        {/* Meta row */}
        <div className="mt-6 grid grid-cols-2 gap-6 border-t border-coral-light pt-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">Bill to</p>
            <p className="mt-1 font-medium text-ink">{inv.bill_to_name}</p>
            {inv.bill_to_email && <p className="text-sm text-ink/60">{inv.bill_to_email}</p>}
          </div>
          <div className="text-right">
            <div className="space-y-1 text-sm">
              <div className="flex justify-end gap-4">
                <span className="text-ink/50">Period</span>
                <span className="font-medium text-ink">
                  {new Date(inv.period_start + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })}–
                  {new Date(inv.period_end + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              {inv.due_date && (
                <div className="flex justify-end gap-4">
                  <span className="text-ink/50">Due</span>
                  <span className={`font-medium ${isOverdue ? "text-coral-dark" : "text-ink"}`}>
                    {new Date(inv.due_date + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
              )}
              {inv.paid_at && (
                <div className="flex justify-end gap-4">
                  <span className="text-ink/50">Paid</span>
                  <span className="font-medium text-sage-dark">
                    {new Date(inv.paid_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Sydney" })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="mt-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-coral-light">
                <th className="pb-2 text-left text-xs font-semibold uppercase tracking-widest text-ink/40">Description</th>
                <th className="pb-2 text-right text-xs font-semibold uppercase tracking-widest text-ink/40">Qty</th>
                <th className="pb-2 text-right text-xs font-semibold uppercase tracking-widest text-ink/40">Unit price</th>
                <th className="pb-2 text-right text-xs font-semibold uppercase tracking-widest text-ink/40">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-ink/40">No line items</td>
                </tr>
              ) : (
                items.map((li) => (
                  <tr key={li.id} className="border-b border-coral-light/50">
                    <td className="py-2.5 text-ink">{li.description}</td>
                    <td className="py-2.5 text-right text-ink/60">{li.quantity % 1 === 0 ? li.quantity : li.quantity.toFixed(2)}</td>
                    <td className="py-2.5 text-right text-ink/60">{formatCents(li.unit_price_cents)}</td>
                    <td className="py-2.5 text-right font-medium text-ink">{formatCents(li.quantity * li.unit_price_cents)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Total */}
        <div className="mt-4 flex justify-end">
          <div className="min-w-[200px] space-y-1 text-sm">
            <div className="flex justify-between gap-6 border-t-2 border-ink pt-2">
              <span className="font-bold text-ink">Total (AUD)</span>
              <span className="font-display text-lg font-bold text-coral-dark">{formatCents(subtotal)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {inv.notes && (
          <div className="mt-6 rounded-xl bg-cream p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">Notes</p>
            <p className="mt-1 text-sm text-ink/70">{inv.notes}</p>
          </div>
        )}

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-ink/30">
          Generated by DR. SparkPlay · {new Date().toLocaleDateString("en-AU", { timeZone: "Australia/Sydney" })}
        </p>
      </div>
    </div>
  );
}
