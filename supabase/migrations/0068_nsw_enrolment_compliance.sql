-- NSW-specific enrolment compliance gaps, found while reviewing the
-- enrolment feature against the NSW Public Health Act 2010 and the
-- National Regulations' Reg 160 (enrolment record content) more closely:
--
-- 1. NSW Health's own guidance (health.nsw.gov.au) lists five categories of
--    child who are exempt from having to show immunisation proof BEFORE
--    enrolling, given 12 weeks to provide it instead: out-of-home care,
--    a guardianship order, Aboriginal/Torres Strait Islander, emergency
--    care, or a declared state of emergency. Nothing in the schema could
--    previously record this, so those children would incorrectly show as
--    "not sighted"/non-compliant during their lawful 12-week grace period.
--    Deliberately staff-only to set (a legal judgement call, not something
--    a parent self-declares) -- no new submission-table column, no RLS
--    change needed, existing staff-only UPDATE policy on children covers it.
--
-- 2. Reg 160 requires the enrolment record to include each parent/guardian's
--    own address, not just the child's -- child_contacts had no address
--    column at all. Added to both the live table and its pending-submission
--    counterpart (a parent can reasonably self-report their own address).
--
-- 3. Reg 160 also requires the service to record any court order/parenting
--    order it's aware of that restricts who may collect the child --
--    previously the only place this could go was an uploaded PDF (added in
--    0066) with nothing structured for staff to actually check against at
--    pickup time. Added a staff-only flag + notes on child_contacts.
--    Deliberately NOT exposed on child_contact_submissions -- a parent
--    self-declaring "this other contact isn't allowed to collect" without
--    staff having sighted the actual court order would be exactly the kind
--    of unverified claim this flag exists to prevent.

alter table public.children
  add column if not exists enrolment_proof_exemption_category text
    check (enrolment_proof_exemption_category in (
      'out_of_home_care', 'guardianship_order', 'atsi', 'emergency_care', 'state_of_emergency'
    )),
  add column if not exists enrolment_proof_exemption_deadline date;

alter table public.child_contacts
  add column if not exists address text,
  add column if not exists is_not_authorised_to_collect boolean not null default false,
  add column if not exists restriction_notes text;

alter table public.child_contact_submissions
  add column if not exists address text;
