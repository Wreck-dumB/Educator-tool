# DR. SparkPlay — Roadmap / NEXT

Parked ideas and planned work, so nothing gets lost between sessions.

## Recently fixed
- [x] **Worksheets always printed the same generic template** — the AI generator already picked a tailored print template per activity (`name_trace`, `letter_colouring`, `card_set`, `matching_pairs`, `counting_groups`, etc.) plus the structured data each needs, but none of it was ever saved — `saveActivity()` dropped those fields on insert, so the Worksheets page had no choice but to re-guess from title/step text, which can never produce the 4 data-driven templates. Migration 0057 adds the missing columns (`suggested_template`, `card_items`, `card_pairs`, `image_subject`, `letter_text`, `matching_left`, `matching_right`, `counting_groups`); `save.ts` now persists them; `WorksheetGenerator.tsx` now prefers the stored template and lists all 10 template types, not just 6. (commit 95b224d) Migration applied live to the Supabase DB 2026-08-10.
  - Note: worksheet pictures (activity sheet/drawing frame/card set/name colouring images) are still broken independent of this — see "Image generation (Pollinations)" below.

## Admin removal + access & compliance (in progress)
Building in order, top to bottom.

- [x] **Remove staff access** — already existed (director-only Remove/Reinstate on `/staff`; keeps historical records).
- [x] **Remove active family access** — director can now cut a joined family's login from the child page; records untouched. (commit 1d20d32)
- [x] **Ceased children** — Children list splits into "Currently enrolled" / "No longer enrolled"; hard-delete reframed as last-resort for mistaken profiles (enrolment-ended is the archive path). (commit 14eec6b)
- [x] **#3 Family data access (Privacy Act APP 12)** — new `/parent/file` page shows the enrolment + health record the service holds on each linked child, read-only, with Print/Save-as-PDF. Built from `children` fields the linked parent can already read (contacts deliberately excluded — no parent RLS). (commit pending)
- [x] **#4 Photo/media consent gate** — migration 0053 + `/accept-media-consent` screen gate all accounts before app use, mirroring the terms gate. (commit a0588a9) **FOLLOW-UPS:** (1) have an adviser review/replace the placeholder consent wording in `accept-media-consent/page.tsx`; (2) add a withdraw-consent control (currently accept-only, immutable like terms).
- [x] **#6 Staff on-shift-only access (app-level)** — `getShiftAccess()` blocks regular staff from the children list, child detail, and observations pages unless signed in for a shift; managers/owner unrestricted. (commit pending) **FOLLOW-UPS:** (1) extend the gate to remaining child-data pages (diary, incidents, medical, health plans, etc.); (2) optionally harden to DB/RLS enforcement if UX-level isn't enough.

## Monetization
- [x] **Business access register + gate** — track which centres have access once we monetise after the test phase. Migration 0054 adds `service_access` (one row per service: status trial/active/suspended/expired + trial_ends_at + notes; auto-created 'trial' on new service via trigger; existing centres backfilled 'active'). Owner-only dashboard at `/owner/businesses` (Dan changes any centre's status by hand). App gate in `(app)/layout.tsx` sends suspended/expired/lapsed-trial centres to `/access-paused`; fails OPEN on missing row so the test phase can't lock anyone out. Platform owner = `PLATFORM_OWNER_EMAILS` env (never gated). **MANUAL STEP:** set `PLATFORM_OWNER_EMAILS` in Vercel env (already set locally to d.rust92@outlook.com) or the /owner area is inaccessible in production.
- [ ] **Pricing & credits model** — creation costs a credit, maintenance included. Full spec: [docs/pricing-and-credits.md](docs/pricing-and-credits.md). Blocked on: no billing/subscription layer yet (Stripe + entitlement tables first). The `service_access` table above is the natural home for the entitlement/credits columns when this is built.

## Image generation (Pollinations) — service outage, needs a decision
- **2026-08-05:** Pollinations.ai (the free, keyless image API `/api/generate-image` relies on for every printable sheet's picture) is returning HTTP 402 "Insufficient balance" for every model — `GET /models` now lists only `sana`, and it requires payment. This is not a bug in our code; the free tier appears to have been paywalled sometime around today. Every picture-having sheet (activity sheet, drawing frame, card set, name colouring) currently can't produce a real picture.
- **Needs your call:** (1) wait and see if Pollinations restores free access, (2) pay for Pollinations credits, (3) switch to a different image API. Not decided unilaterally — flagging for you.
- **Fixed while investigating (commit pending):** two real app bugs, independent of the outage above —
  (a) `name_colouring` sheets never had an image option at all; wired to the same `image_subject` field the AI already sets for other templates (only when the educator's request implies a theme — plain name sheets stay text-only).
  (b) Every picture-having sheet silently showed a permanent blank box on ANY image failure (not just this outage) — the small preview thumbnail's error handler called `setImageUrl(null)`, wiping the shared image state out from under the full-size picture before it could show its own error. Now each shows its own "Image couldn't be generated" message instead.
  Verified with Playwright (`playwright/tests/name-colouring-image.spec.ts`) — with the real outage still in effect, the sheet now shows the clear error message instead of hanging in "Generating…" or going blank.

## Notes
- Add new parked ideas here rather than losing them mid-conversation.
