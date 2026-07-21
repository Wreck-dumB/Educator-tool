# DR. SparkPlay — Roadmap / NEXT

Parked ideas and planned work, so nothing gets lost between sessions.

## Admin removal + access & compliance (in progress)
Building in order, top to bottom.

- [x] **Remove staff access** — already existed (director-only Remove/Reinstate on `/staff`; keeps historical records).
- [x] **Remove active family access** — director can now cut a joined family's login from the child page; records untouched. (commit 1d20d32)
- [x] **Ceased children** — Children list splits into "Currently enrolled" / "No longer enrolled"; hard-delete reframed as last-resort for mistaken profiles (enrolment-ended is the archive path). (commit 14eec6b)
- [x] **#3 Family data access (Privacy Act APP 12)** — new `/parent/file` page shows the enrolment + health record the service holds on each linked child, read-only, with Print/Save-as-PDF. Built from `children` fields the linked parent can already read (contacts deliberately excluded — no parent RLS). (commit pending)
- [ ] **#4 Photo/media consent gate** — all accounts (parents + staff) must give photo/media consent to use the app. Needs: a consent record (migration), a gate on first login that blocks use until accepted, and withdraw/re-consent handling. **OPEN: exact legal wording of the consent statement** (user "was told" it's required — get the actual text; will placeholder-and-flag until then).
- [ ] **#6 Staff on-shift-only access** — staff should only see children's info while signed in for a shift, not outside hours. Infra exists: `staff_attendance` table + sign-in board (0035/0046) → "on shift" = has a sign-in with no sign-out today. **Big access-control change (touches RLS on all child-data tables) with real lockout risk — needs a design decision on strictness before building.**

## Monetization
- [ ] **Pricing & credits model** — creation costs a credit, maintenance included. Full spec: [docs/pricing-and-credits.md](docs/pricing-and-credits.md). Blocked on: no billing/subscription layer yet (Stripe + entitlement tables first).

## Notes
- Add new parked ideas here rather than losing them mid-conversation.
