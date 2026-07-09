-- Fee invoices: create, track payment, and print.

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  parent_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  bill_to_name text NOT NULL,
  bill_to_email text,
  child_id uuid REFERENCES public.children(id) ON DELETE SET NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  due_date date,
  notes text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price_cents int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX invoices_owner_idx ON public.invoices (owner_user_id, status, period_start DESC);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view service invoices"
  ON public.invoices FOR SELECT
  USING (public.has_service_role(owner_user_id, 'staff'));

CREATE POLICY "2IC+ can create invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (public.has_service_role(owner_user_id, '2ic'));

CREATE POLICY "2IC+ can update invoices"
  ON public.invoices FOR UPDATE
  USING (public.has_service_role(owner_user_id, '2ic'));

CREATE POLICY "Director can delete invoices"
  ON public.invoices FOR DELETE
  USING (public.has_service_role(owner_user_id, 'director'));

CREATE POLICY "Staff can view invoice line items"
  ON public.invoice_line_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.has_service_role(i.owner_user_id, 'staff')));

CREATE POLICY "2IC+ can manage invoice line items"
  ON public.invoice_line_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.has_service_role(i.owner_user_id, '2ic')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.has_service_role(i.owner_user_id, '2ic')));
