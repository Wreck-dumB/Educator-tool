# QA Pass — Documents & Compliance (Group C)
**Date:** 2026-08-18 · **Account:** QA Test Centre A (`krondor2024+qa-director-a@gmail.com`, director role) · **Scope:** Document Templates, Import & Review, Policies, Safe Work Procedures, QIP + QIP Check-in, NQS Self-Assessment, Risk Assessments, Behaviour Support Plans, Health Plans, Reflections, Incident Reports (+ notify draft), Permission Slips, Excursions.

All screenshots referenced below are in `d:\Projects\sparkplay\docs\qa-2026-08-18\group-c\screenshots\`.

---

## Bugs Found

### 1. CRITICAL — Permission Slips cannot be created at all: Postgres RLS infinite recursion
Every attempt to create a permission slip (3 separate attempts, 3 different types: excursion consent, photo/media consent, medication authorisation) failed. The form submits, the server action redirects back to `/permission-slips` with an error, and the banner reads, verbatim:

> `infinite recursion detected in policy for relation "permission_slips"`

**How this was confirmed, precisely:**
- Filled and submitted the "New permission slip" form 3 times with fully valid data (title, body text, ≥1 child selected) — all 3 failed identically.
- Instrumented the browser to log every network request/response during submission: the form does a real `POST /permission-slips` (Next.js server action via multipart form), which comes back `303` to `/permission-slips?error=infinite%20recursion%20detected%20in%20policy%20for%20relation%20%22permission_slips%22`.
- Re-confirmed live in the UI with a fresh repro (`permission-slips-rls-recursion-CONFIRMED-live.png`) — the red error banner renders directly under the page header.
- Confirmed zero data loss/partial-success: reloaded `/permission-slips` after every attempt — "Open (0)" / "No open slips" every time (`permission-slips-after-send.png`, `permission-slips-after-reload.png`). Nothing is silently half-created.
- This is a Postgres RLS *policy* error (self-referencing/circular policy definition on the `permission_slips` table or a function it calls, e.g. `has_service_role()`), not an application bug — it will affect every user/service, not just this account.
- **Regulatory relevance:** this is the mechanism the app markets for excursion consent, photo/media consent, and medication authorisation sign-off ("Digital sign-off for families — no more lost paper slips"). Right now a real centre relying on this would have **zero working digital consent capture** — a compliance-critical feature that is 100% down.
- **Downstream effect confirmed:** because no permission slip can ever be saved, the Excursions → "Link existing documents" permission-slip dropdown is permanently empty (`— None —` only), so the advertised excursion↔permission-slip linking can never be exercised either (see Excursions section).

Screenshots: `permission-slips-rls-recursion-bug.png`, `permission-slips-rls-recursion-CONFIRMED-live.png`, `permission-slips-after-send.png`, `permission-slips-after-reload.png`, `permission-slips-current-state.png`, `permission-slips-rls-recheck.png`.

### 2. HIGH — Recurring pattern: unvalidated AI output crashes the app (3 confirmed instances)
The app inserts/renders fields from the AI's structured ("tool call") response without validating they're the expected type before using them. Anthropic's forced-tool-call output is usually schema-shaped but not 100% guaranteed — when a field comes back missing or the wrong shape, three different features break in three different ways:

- **Policies — null title crashes the DB insert, raw error shown to user.** Generating a "Sun protection" policy produced excellent content (see Quality section) but on Save the app displayed, verbatim, in a plain red banner: `null value in column "title" of relation "policies" violates not-null constraint`. Root cause: `src/app/(app)/policies/actions.ts` → `savePolicy()` inserts `title: suggestion.title` straight from the AI response with no null/empty check, and surfaces `error.message` (a raw Postgres error) directly to the end user. Screenshot: `policies-test1-FAIL.png`.
- **Policies — `relatedLegislation.join is not a function` crashes the whole page.** A second generation ("Allergy management and anaphylaxis") returned `related_legislation` as something other than an array. `PolicyForm.tsx:121` calls `.join("; ")` on it unguarded, throwing an uncaught `TypeError` that trips the app's global error boundary — the entire page replaces itself with a generic "Something went wrong" screen and the drafted policy (which the educator hadn't saved yet) is gone, full stop. **This was not a one-off**: it reproduced at least 4 more times later in the session (dev-server log timestamps 00:43:38, 00:49:29, 00:50:17, 00:52:12, plus two more "quality re-check" attempts, `policies-quality.png` and `policies-quality-retry3.png`, both hit the same crash). Out of roughly 6 Policy-builder generation attempts across the session, only 1 (Behaviour Guidance) saved cleanly on the first try. That's a very high failure rate for a core feature.
- **Generate Activity — `raw.map is not a function` blocks Risk Assessments.** `/api/generate` (used both directly and by the "already have an idea" quick-build flow that Risk Assessments depends on) crashed with `TypeError: raw.map is not a function` on every one of 6 attempts across two separate script runs (water play, excursion, cooking activity — each tried twice). The route returns an empty-body `500` ("Could not reach the server"), which is indistinguishable in the UI from a real network failure. Because Risk Assessments can only be generated **from a saved activity**, and activity creation itself was crashing, none of the 3 planned risk-assessment scenarios could be produced this way.

**Why this matters for a compliance tool specifically:** these are documents a service is meant to adopt after review — a crash that silently discards a freshly-generated policy/procedure (with no recovery, no autosave) means real risk of educator time lost and, worse, a false impression that "the AI can't do X" when actually it did the work and the app dropped it.

Screenshots: `policies-test1-FAIL.png`, `policies-test2-FAIL.png`, `policies-quality.png`, `policies-quality-retry3.png`, `risk-assessment-test1-FAIL.png`, `risk-assessment-test2-FAIL.png`, `risk-assessment-test3-FAIL.png`, `risk-assessment-blocked-activity-gen.png`.

### 3. HIGH — PDF upload is completely broken in Import & Review
Uploading a PDF (a genuine, text-based, non-scanned PDF built specifically for this test) to `/import` always fails with **"Could not read the file content — try a different format"**. DOCX uploads work perfectly (2/2 passed). Server log confirms the exact cause: `Text extraction failed: Error: Setting up fake worker failed: "Cannot find module '.next\dev\server\chunks\pdf.worker.mjs'"` — a missing bundled worker file for `pdf-parse`/`pdfjs-dist` in this Turbopack dev build. The page's own copy explicitly advertises "Upload a PDF or Word document" — PDF is one of exactly two supported formats and it does not work at all. Screenshot: `import-test3-FAIL.png`.

### 4. Infrastructure (found early, confirmed fixed mid-session) — missing `SUPABASE_SERVICE_ROLE_KEY` took down every AI/rate-limited route app-wide
For roughly the first half of this session, **every** AI-generation endpoint (forms, policies, safe work procedures, QIP generate, document review, reflections, behaviour-support strategy generation, activity generation) failed instantly with an empty-body `500` ("Could not reach the server"). Root cause, confirmed precisely: `src/lib/rateLimit.ts` → `isRateLimited()` calls `createAdminClient()` (in `src/lib/supabase/admin.ts`) completely unguarded by try/catch; `createAdminClient()` throws synchronously (`"SUPABASE_SERVICE_ROLE_KEY is not set"`) because that env var was absent from the running dev server's environment. Since `isRateLimited()` is called before each route's own try/catch, the throw was uncaught at the route level, producing the generic empty crash — the "fail open" comment in that file only covers the RPC-call error, not the client-construction error, so it didn't actually fail open. This was **fixed by another party during this session** (env var restored / server restarted) — all retests after the fix used the real, working AI backend and are reported as genuine pass/fail below, not infra-failure. Flagging for completeness since it's a real defensive-coding gap (the same unguarded-throw pattern could recur) and explains the two-stage nature of this report.

### 5. Minor — no loading/pending indicator on some save actions
`Behaviour Support Plans` → "Save as draft"/"Activate plan →" gave zero visual feedback for several seconds on first click (no disabled state, no spinner) before navigating — a user could reasonably click again, risking a duplicate submission (none occurred in testing, but the button doesn't guard against it).

### 6. Minor — NQS rating buttons give no live visual feedback
Clicking WT/Meeting/Exceeding on `/nqs` does save correctly (confirmed via reload + direct value check), but the selected/highlighted styling is computed server-side from the last-saved value and does not update client-side on click — a user gets no on-screen confirmation their click registered until the next full page load.

---

## Quality Observations

**Strong, specific, non-generic output — the good news.** Across every feature where generation actually completed, content quality was high and genuinely tailored to the scenario, not boilerplate:
- Reflections questions directly referenced details from the submitted scenario (e.g. "floating between rooms," "the mindfulness breathing activity," "this particular pair of children") rather than generic prompts.
- QIP items cross-referenced real findings from an earlier Import & Review gap-check (an improvement item explicitly cited "No UV Index trigger specified," "SPF30+ broad-spectrum... required to be reapplied every 2 hours," etc. — matching the actual gaps found in the uploaded sun-protection document).
- Safe Work Procedure hazard tables were detailed and correctly risk-rated (e.g. "Accidental child access to bleach concentrate" rated **HIGH** with concrete controls; manual-handling and slip hazards correctly rated lower).
- Behaviour Support AI strategies were specific to the described behaviour (nap refusal at rest time) — offering a "quiet body" alternative, sensory-regulation ideas, and a "rest time leader" role, not generic "redirect the child" advice.
- The previously-fixed document-review **over-numbering bug did not reproduce**: the regenerate sub-flow (sun-protection policy + amendment notes) produced clean, correctly-structured procedure steps with no duplicated/nested numbering.

**Regulatory/factual risk flags (elevated attention):**
- **Health Plans** (asthma/anaphylaxis/epilepsy, hand-authored by the tester, not AI — this feature has no AI step) read as genuinely actionable in an emergency: clear escalation triggers (e.g. "if seizure lasts longer than 5 minutes... call 000"), specific dosing/location notes for medication. No risky content found here since content was tester-authored, but the app itself provides no factual/clinical guardrails on this free-text field — a centre entering vague or wrong emergency steps would get no warning.
- **Incident Reports → Reg 176 notify draft** was verified byte-for-byte accurate against the source incident: child name, exact description text, location, action taken, and the 24-hour notification deadline were all correctly pre-filled and correctly calculated from the incident's `occurred_at` timestamp. This is a compliance-critical accuracy check and it passed cleanly.
- **Permission Slips** medication-authorisation copy correctly carries the app's own caveat that electronic signatures for medication consent should be confirmed with the service's insurer/regulator — good defensive framing, undermined entirely by bug #1 (the feature doesn't work at all).
- The two crash bugs (#2) mean an educator could get a **factually strong, well-written policy draft** and then lose it to a client-side crash with no indication of why — the risk isn't bad content, it's silent data loss framed as "the AI failed," which could push a service toward a rushed, under-reviewed manual rewrite instead.

---

## Per-Feature Results

### Document Templates (`/forms`)
| Test # | Input | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | Excursion permission slip — library walk, 3-5 room, sun protection note | PASS | `/forms/e220f853-eae2-43bb-9bbc-510eff6f94bb` | Specific fields list, correct signature block flag. `forms-test1-draft.png` |
| 2 | Medication authorisation — one-off paracetamol for fever ≥38.5°C | PASS | `/forms/e15937fb-b951-4a98-93d4-caa7938210b8` | Good gap-check (parent contact order, max daily dose not specified by tester — correctly flagged) |
| 3 | Late pickup / grandparent authorised collection notice | PASS | `/forms/87d047e0-9ebe-4fa7-8188-c20b882a3618` | Correctly added photo-ID requirement to fields list |
| re-verify | Repeat of test 1 | PASS | (new draft, same content) | `forms-quality.png` — 11-item gap-check, none generic |

### Import & Review (`/import`)
| Test # | Input | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | Thin/sloppy sun protection policy (.docx, deliberately under-specified, numbered clauses) | PASS | n/a (review only) | Quality score low, correctly flagged as "dangerously incomplete," cited Cancer Council/NQS specifically. `import-test1-review.png` |
| 2 | Detailed medication administration procedure (.docx) | PASS | n/a (review only) | Correctly identified as "overdue for review," specific missing-requirement callouts |
| 3 | Excursion risk assessment form (.pdf) | **FAIL** | — | "Could not read the file content" — PDF worker module missing (Bug #3). `import-test3-FAIL.png` |
| Regenerate | Sun-protection doc + amendment notes ("reapply every 2 hrs, SunSmart guidelines, restrict 11am-3pm") | PASS | `/policies/673403ae-1995-4f56-8be6-8428793904f7` | No over-numbering reproduced (previously-fixed bug stayed fixed). `import-regenerate-result.png` |

### Policies (`/policies`)
| Test # | Input | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | Sun protection — 60-place centre, hats/sunscreen/shade detail | **FAIL** | — | DB error: null title constraint violation, raw error shown to user (Bug #2a). `policies-test1-FAIL.png` |
| 2 | Allergy management and anaphylaxis | **FAIL** | — | Full page crash: `relatedLegislation.join is not a function` (Bug #2b). `policies-test2-FAIL.png` |
| 3 | Behaviour guidance — strengths-based, no restraint/isolation | PASS | `/policies/b85419cb-5dea-448f-829f-cacbe036eec7` | Clean save, good gap-check |
| retry (quality check) | Nutrition and food safety | inconclusive (network noise) | — | `policies-quality-retry2.png` mid-draft |
| retry ×2 (quality check) | (repeat attempts) | **FAIL** both | — | Same `relatedLegislation.join` crash reproduced twice more. `policies-quality.png`, `policies-quality-retry3.png` |

### Safe Work Procedures (`/safe-work-procedures`)
| Test # | Input | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | Sanitising toys with bleach solution | PASS | `/safe-work-procedures/8e0247ed-94e7-436f-8ffe-219e7c125395` | 6-hazard table, correctly rated HIGH for child access to bleach. `safe-work-procedures-test1-saved.png`, `safe-work-procedures-quality.png` |
| 2 | Using a step ladder for high storage | PASS | `/safe-work-procedures/12fb08ee-d768-4e85-acd6-ce4c90d6eafc` | Medium-rated fall hazard, sensible controls |
| 3 | Manual handling — lifting a child into a high chair | PASS | `/safe-work-procedures/3bb552cd-284f-46e1-9d70-d8c81c18a42d` | High-rated, correct manual-handling controls |

### QIP (`/qip`) + QIP Check-in (`/qip/checkin`)
| Test # | Input | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| QIP-1 | Focus QA2 — sun protection inconsistently followed by relief staff | PASS | `/qip` | 2 items generated, one directly citing the earlier Import & Review gap-check |
| QIP-2 | Focus QA1+QA6 — learning stories not linked to family goals | PASS | `/qip` | 4 items generated across both areas |
| QIP-3 | Focus QA3+QA7 — shade sail repair + governance/review tracking | PASS | `/qip` | 2 items, correctly split across QA3/QA7. `qip-generate-test1.png`, `qip-quality.png` |
| Checkin-1 | 2026-08-15, mixed yes/mostly/no incl. shade-sail note | PASS | `/qip/checkin?date=2026-08-15` | All 7 QA answers + overall notes persisted (verified via reload) |
| Checkin-2 | 2026-08-16, ratio near-miss flagged | PASS | `/qip/checkin?date=2026-08-16` | Persisted correctly |
| Checkin-3 | 2026-08-17, maintenance ticket note | PASS | `/qip/checkin?date=2026-08-17` | Persisted correctly. `qip-checkin-test1-filled.png` |

### NQS Self-Assessment (`/nqs`)
| Test # | Input | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | Standard 1.1 (Program) → Exceeding + evidence note | PASS | `/nqs` | Verified persisted after reload. `nqs-test1-rated.png` |
| 2 | Standard 4.1 (Staffing arrangements) → Meeting + evidence note | PASS | `/nqs` | Verified persisted |
| 3 | Standard 7.2 (Leadership) → Working Towards + evidence note | PASS | `/nqs` | Verified persisted. Minor UX gap: no live visual feedback on click (Bug #6) |

### Risk Assessments (`/risk-assessments`)
| Test # | Input | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | Water play in sensory tubs (via "build this activity") | **FAIL** | — | Blocked at activity-creation step: `raw.map is not a function` (Bug #2c). `risk-assessment-test1-FAIL.png` |
| 2 | Local park excursion, road crossing | **FAIL** | — | Same crash, retried twice (6 total attempts across both runs) |
| 3 | Cooking — fruit skewers with butter knives | **FAIL** | — | Same crash |
| (existing activity) | "Silent Ocean Count-Up" counting activity | PASS | `/risk-assessments/a5b20a7e-38bd-412a-b766-02b1fe21dfac` | Proves risk-assessment generation itself is high quality (6 specific hazards incl. choking risk from pencil parts, social-anxiety risk from being asked to volunteer answers) when the activity-creation blocker is bypassed. `risk-assessment-quality.png` |

### Behaviour Support Plans (`/behaviour-support`, `/behaviour-support/new`)
| Test # | Input | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | Priya-QB — refuses mat-time transition, cries | PASS (active) | `/behaviour-support/1493939d-b05b-4c11-899e-f98f238cca16` | Manually-authored strategies (AI path separately tested below) |
| 2 | Theo-QB — bites peers during noisy transitions | PASS (active) | `/behaviour-support/15432ba0-d738-4dfa-9789-a92cc3ad9fdf` | Verified via list page after a script false-negative (see note) |
| 3 | Zara-QB — grabs toys, multiple/day | PASS (draft) | `/behaviour-support/a6a8c0dc-cc01-4adc-9b84-ee88141ea2b3` | Draft correctly appears in "Drafts" section, not "Active" |
| AI generate | Nap refusal, loud talking at rest time | PASS | n/a (in-form generation) | Genuinely specific strategies (quiet-body alternative, sensory regulation, "rest time leader" role). `behaviour-support-ai-generated-strategies.png` |

*Note: initial automated checks mis-reported tests 1-3 as FAIL due to a URL-wait pattern in the test script that matched prematurely; direct verification (reload + list-page inspection) confirmed all 3 plans saved correctly with no duplicates.*

### Health Plans (`/health-plans`)
| Test # | Input | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | Priya-QB — Asthma Action Plan, Ventolin + spacer protocol | PASS | `/health-plans/fa420ddf-ea6b-468d-862b-0f5445c03bbe/edit` | Clear step-by-step emergency protocol with 000 escalation trigger. `health-plans-test1-filled.png` |
| 2 | Theo-QB — Anaphylaxis Action Plan, EpiPen Jr, peanut/tree nut | PASS | `/health-plans/62ba346b-5b61-46a6-8c83-12cd0496e19c/edit` | Correct dose escalation (2nd EpiPen after 5 min), CPR trigger. `health-plans-test2-saved.png` |
| 3 | Zara-QB — Epilepsy Management Plan, focal seizures, midazolam | PASS | `/health-plans/9fc33836-433b-4402-90cd-2ddca772178f/edit` | Correct 5-minute/second-seizure escalation triggers |

*Note: initial automated checks mis-reported all 3 as FAIL due to a URL-wait timing issue in the test script; direct query of `/health-plans` confirmed all 3 plans present with full correct content.*

### Reflections (`/reflections`)
| Test # | Input | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | Post-incident — ball conflict, intervened, escalated | PASS | `/reflections` | 7 genuinely tailored Gibbs-style questions, not generic. `reflections-test1-questions.png` |
| 2 | End of day — short-staffed, floating between rooms | PASS | `/reflections` | Questions specifically referenced "floating" and staffing shortage |
| 3 | General — new mindfulness breathing activity, mixed engagement | PASS | `/reflections` | Questions addressed the specific confusion/engagement split described. `reflections-quality.png` |

### Incident Reports (`/incident-reports`) + Notify draft (`/incident-reports/[id]/notify`)
| Test # | Input | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | Priya-QB — minor playground fall, grazed knee | PASS | `/incident-reports` | Signed, low severity. `incident-reports-test1-filled.png` |
| 2 | Theo-QB — fever 38.7°C, sent home | PASS | `/incident-reports` | Signed, moderate severity |
| 3 | Zara-QB — briefly missing 3 min during park excursion, Reg 176 flagged | PASS | `/incident-reports` | Signed, serious/Reg 176 flagged. `incident-reports-test3-serious-saved.png` |
| Notify sub-flow | Test 3's incident | PASS | `/incident-reports/fd298fa3-9746-4e28-a10b-6f7f80a68a36/notify` | Verified byte-for-byte accurate: child name, description, location, action taken, and 24hr deadline all correctly pre-filled from the source record. `incident-notify-reg176-form.png` |

### Permission Slips (`/permission-slips`)
| Test # | Input | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | Excursion consent — Botanic Gardens | **FAIL** | — | RLS infinite recursion (Bug #1). `permission-slips-test1-filled.png` |
| 2 | Photo/media consent — Term 3 newsletter | **FAIL** | — | Same error |
| 3 | Medication authorisation — Panadol ≥38.5°C | **FAIL** | — | Same error. `permission-slips-test3-medication.png` |

### Excursions (`/excursions`)
| Test # | Input | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | Botanic Gardens excursion, walking, 1:4 ratio | PASS | `/excursions/57870cbd-0138-4100-a2e3-8afce76db4d1` | `excursions-test1-filled.png` |
| 2 | Wildlife Sanctuary incursion visit | PASS | `/excursions/65ef8031-2ba6-4696-8f71-9691e1e5725a` | |
| link attempt | Link excursion 1 to a permission slip | PARTIAL | `/excursions/57870cbd-0138-4100-a2e3-8afce76db4d1` | Dropdown showed only "— None —" — cannot link any slip because none can be created (Bug #1 downstream effect). `excursions-linked-permission-slip.png` |
