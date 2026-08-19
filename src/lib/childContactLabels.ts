// Shared between the staff contact editor (children/[id]/page.tsx) and the
// parent-submitted contact proposal form (parent/(portal)/enrolment) so both
// sides show identical authorisation labels for the same underlying flags.
export const AUTHORISATION_LABELS: Record<string, string> = {
  is_parent_guardian: "Parent/guardian",
  is_emergency_contact: "Emergency contact",
  is_authorised_nominee: "Authorised pickup",
  can_consent_medical_treatment: "Medical treatment consent",
  can_authorise_medication: "Medication consent",
  can_authorise_excursions: "Excursion consent",
};
