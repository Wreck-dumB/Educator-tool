"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import type { InvoiceStatus } from "@/lib/types/database.types";

export async function createInvoice(formData: FormData) {
  const supabase = await createClient();
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/dashboard");

  const billToName = (formData.get("bill_to_name") as string).trim();
  const billToEmail = (formData.get("bill_to_email") as string)?.trim() || null;
  const childId = (formData.get("child_id") as string) || null;
  const periodStart = formData.get("period_start") as string;
  const periodEnd = formData.get("period_end") as string;
  const dueDate = (formData.get("due_date") as string) || null;
  const notes = (formData.get("notes") as string)?.trim() || null;
  const invoiceNumber = (formData.get("invoice_number") as string).trim();

  // Line items: descriptions[], quantities[], unit_prices[]
  const descriptions = formData.getAll("description") as string[];
  const quantities = formData.getAll("quantity") as string[];
  const unitPrices = formData.getAll("unit_price") as string[];

  if (!billToName || !periodStart || !periodEnd || !invoiceNumber) {
    redirect(`/invoices?error=${encodeURIComponent("Please fill all required fields")}`);
  }

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      owner_user_id: ownerUserId,
      invoice_number: invoiceNumber,
      bill_to_name: billToName,
      bill_to_email: billToEmail,
      child_id: childId,
      period_start: periodStart,
      period_end: periodEnd,
      due_date: dueDate,
      notes,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !invoice) redirect(`/invoices?error=${encodeURIComponent(error?.message ?? "Failed to create invoice")}`);

  const lineItems = descriptions
    .map((desc, i) => ({
      invoice_id: invoice.id,
      description: desc.trim(),
      quantity: parseFloat(quantities[i] ?? "1") || 1,
      unit_price_cents: Math.round(parseFloat((unitPrices[i] ?? "0").replace(/[^0-9.]/g, "")) * 100),
    }))
    .filter((item) => item.description && item.unit_price_cents > 0);

  if (lineItems.length > 0) {
    await supabase.from("invoice_line_items").insert(lineItems);
  }

  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}`);
}

export async function markInvoicePaid(id: string) {
  const supabase = await createClient();
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return;

  await supabase
    .from("invoices")
    .update({ status: "paid", paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_user_id", ownerUserId);

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus) {
  const supabase = await createClient();
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return;

  await supabase
    .from("invoices")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_user_id", ownerUserId);

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
}
