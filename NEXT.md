# DR. SparkPlay — Roadmap / NEXT

Parked ideas and planned work, so nothing gets lost between sessions.

## Admin removal + access & compliance (in progress)
Building in order, top to bottom.

- [x] **Remove staff access** — already existed (director-only Remove/Reinstate on `/staff`; keeps historical records).
- [x] **Remove active family access** — director can now cut a joined family's login from the child page; records untouched. (commit 1d20d32)
- [x] **Ceased children** — Children list splits into "Currently enrolled" / "No longer enrolled"; hard-delete reframed as last-resort for mistaken profiles (enrolment-ended is the archive path). (commit 14eec6b)
- [x] **#3 Family data access (Privacy Act APP 12)** — new `/parent/file` page shows the enrolment + health record the service holds on each linked child, read-only, with Print/Save-as-PDF. Built from `children` fields the linked parent can already read (contacts deliberately excluded — no parent RLS). (commit pending)
- [x] **#4 Photo/media consent gate** — migration 0053 + `/accept-media-consent` screen gate all accounts before app use, mirroring the terms gate. (commit a0588a9) **FOLLOW-UPS:** (1) have an adviser review/replace the placeholder consent wording in `accept-media-consent/page.tsx`; (2) add a withdraw-consent control (currently accept-only, immutable like terms).
- [x] **#6 Staff on-shift-only access (app-level)** — `getShiftAccess()` blocks regular staff from the children list, child detail, and observations pages unless signed in for a shift; managers/owner unrestricted. (commit pending) **FOLLOW-UPS:** (1) extend the gate to remaining child-data pages (diary, incidents, medical, health plans, etc.); (2) optionally harden to DB/RLS enforcement if UX-level isn't enough.

## Monetization
- [ ] **Pricing & credits model** — creation costs a credit, maintenance included. Full spec: [docs/pricing-and-credits.md](docs/pricing-and-credits.md). Blocked on: no billing/subscription layer yet (Stripe + entitlement tables first).

## Notes
- Add new parked ideas here rather than losing them mid-conversation.
