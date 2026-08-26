# QA Pass — Planning & Programming (Group B)

Date: 2026-08-18
Account: `krondor2024+qa-director-a@gmail.com` (QA Test Centre, director role)
Scope: Programming Workspace, Programs (incl. block editor / calendar / today room-guide), Observations, Milestones, Transition Statements, Day Plan, Follow-ups, Daily Digest, Shift Handover.
Method: Playwright scripts driving a real browser against the running dev server (`playwright/qa-group-b-explore.js`, `playwright/qa-group-b-programs-retry.js`, plus a few small one-off verification scripts left alongside them, all untracked). No source files edited, nothing committed/pushed.

---

## Bugs Found

### 1. [Infra, now fixed] Missing `SUPABASE_SERVICE_ROLE_KEY` broke every AI-backed route app-wide
Early in this pass, **all** AI generation calls (Program drafting, Observation "Expand with AI", Cultural Days lookup, Generate Activity, Brain Breaks, etc.) returned `HTTP 500` with a **completely empty response body** — no error message reached the UI at all. This was reproducible on demand across multiple unrelated routes (`/api/program`, `/api/expand-observation`, `/api/brain-break`, `/api/cultural-days`).

This was **not** an Anthropic billing/credit problem — confirmed by calling the same model with the same API key and the same exact request shape directly via a standalone Node script outside the app, which worked fine every time. Root cause: `.env.local` was missing `SUPABASE_SERVICE_ROLE_KEY`, which the rate-limiter (`isRateLimited` in `src/lib/rateLimit.ts`) needs to call `createAdminClient()`. That constructor throw is **not** wrapped in the function's `try/catch` (only the RPC's own `error` return value is handled gracefully) — so a missing/bad service-role key crashes the request before it ever reaches the AI call, with no JSON error payload for the route's own `catch` blocks to format.

The key was added to `.env.local` mid-session (by the environment/coordinator, not by this agent) and all of the above routes were re-verified working immediately afterward (see Programs results below — draft generation succeeded in 13–22s with genuinely good content once the key was present).

**Recommendation:** wrap the whole body of `isRateLimited()` in try/catch (not just the RPC error branch), so a future config problem degrades to "rate limiting skipped" instead of an opaque, unhelpful 500 across ~20+ AI routes.

### 2. Published program calendar can render completely blank despite having real content (HIGH — genuine UX trap)
The AI drafts every program entry as **"Unsorted"** (`block_key = null`) by design — an educator must manually assign each entry to one of the 8 fixed day-blocks (Arrival, Morning Group Time, Morning Tea, Lunch, Rest, Afternoon Tea, Home Time, etc.) via a dropdown in the block editor before it appears anywhere structured.

The printable A3 calendar (`/programs/[id]/calendar`) **only renders the 8 fixed block rows** and has **no fallback display for unsorted entries**. I drafted a full week for "Possums Week — Under the Sea" (10 real, on-topic activities — screenshot: `program-editor-error-state.png` shows the "Unsorted" row with all 10 entries), published it **without** doing the block-sorting step (a completely realistic thing for a busy educator to skip), and the calendar (`program-calendar-verify.png`) showed **every single day as entirely empty** — every cell reads "—". No draft banner, no warning, nothing to suggest content exists — it just looks broken.

The only warning anywhere is a small, easy-to-miss line next to the Publish button: *"10 activities aren't sorted into a block yet"* — it doesn't block publishing and gives no hint that the consequence is an empty printed calendar.

**Contrast:** the `/today` room-guide view handles this gracefully — unsorted entries fall into an "Other activities today" section (see `program-today-verify.png`), so Today is never blank. Only the calendar has this gap. Given the calendar is explicitly meant to be printed and displayed for families, this is a significant real-world trap.

### 3. Nested `<form>` HTML on `/children/[id]` causes a hydration error (Medium — surfaced via Milestones testing)
`src/app/(app)/children/[id]/page.tsx` renders `<form action={assignChildToRoom}>` (room dropdown + Save button, ~line 139) **nested inside** the outer `<form action={updateChild}>` (opens ~line 109) whenever any room exists in the service. Nested `<form>` elements are invalid HTML, and this produces a real, reproducible React hydration-mismatch error in the browser console the moment a room exists ("...cannot be a descendant of... This will cause a hydration error"), which forces React to fully discard and re-render that section of the page client-side shortly after load.

Demonstrated impact: automated interactions performed immediately after page load (filling + submitting the Milestone-observation form, which lives in the same subtree) intermittently landed on a DOM node mid-replacement and silently lost the input — 0/3 milestone saves succeeded on the first pass, 3/3 succeeded after adding a ~1s settle delay before interacting. A real educator typing at normal human speed is unlikely to notice, but the console error is real and this is exactly the class of bug that can bite on a slow device/connection. Flagging here because it directly affects Milestone logging (in this QA group's scope), even though the root file is technically Enrolments/child-profile territory.

### 4. Duplicate DOM `id="obs_note_text"` when 2+ activities exist on `/programs/[id]/today` (Low)
Each activity card's `<ObservationForm>` keeps its fixed-id markup in the DOM even while its parent `<details>` is collapsed (native `<details>` hides via rendering, not unmounting), so a day with 2+ activities produces duplicate `id` attributes across the page. Invalid HTML; didn't visibly break the UI for normal clicking, but broke strict element-lookup in test tooling and is a landmine for any future code relying on unique ids (label-for association, `getElementById`, accessibility tooling).

---

## Quality Observations

- **AI-drafted program content is genuinely good.** Age-appropriate activities, EYLF codes attached to every entry, sensible reuse of the educator's own saved activities (flagged with a "📌 From your library" badge), and specific, actionable notes (e.g. "Low-prep: fill clear bottles with water, glitter and food colouring...").
- **Cultural/national-days integration is a standout.** The mini-calendar browser on `/programs` shows real, correctly-dated observances (Ganesh Chaturthi, National Science Week, Ekka Wednesday, Ashura, Raksha Bandhan, Wattle Day lead-up, National Aboriginal and Islander Children's Day, Border Security Day/Royal Queensland Show, Children's Day (Vietnam)) with an honest "confirmed date" vs "verify exact date (lunar/moveable)" distinction — a genuinely thoughtful detail for an Australian multicultural centre. Bathurst 1000 is deterministically injected regardless of AI output, a nice belt-and-braces touch.
- **The "Materials needed" panel on the program detail page is a real, practical win** — it aggregates missing/low-stock materials across every upcoming activity into one shopping list, tells you which activity needs what, and gives directors/2ICs a one-click "Alert staff now".
- **The published A3 calendar looks genuinely print-ready once blocks are sorted** — clean green border, big legible headers, cultural-days footer note, all interactive chrome stripped for print. See bug #2 above for the big caveat that makes this conditional.
- **`/today` room-guide is well designed for its stated audience** (relief/casual staff) — plain-language framing, collapsible step-by-step directions per activity, and an inline "Log an observation for this activity" panel that correctly pre-tags the observation with the program entry's own EYLF codes.
- **The child-picker multi-select regression is CONFIRMED FIXED.** Selected 3 children, closed the dropdown via "Done" (confirmed the trigger button still showed "Priya-QB, Theo-QB, Zara-QB" after closing), submitted, and independently verified via each child's own filtered `/observations?child=` feed that all three genuinely received the group observation. The code comment explaining the fix (hidden inputs rendered outside the conditionally-mounted dropdown panel, so they survive the panel closing) is accurate and holds up.
- **Transition Statements degrades gracefully without AI** — the textarea always accepts manual text ("...or write your own statement here"), and "Generate with AI" surfaced a clear inline error rather than hanging during the outage. Worth noting as a contrast to Programs, which has **no way to create even a manual/blank program** without a successful AI draft first — a single point of failure for the whole feature, independent of any outage.

---

## Per-Feature Results

### Programming Workspace (`/programming`)

| Test # | Input | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | Default 30-day coverage window | PASS | `/programming` | Reflects real EYLF outcome coverage counts and a real "Recent observations" feed populated by observations logged during this session. |
| 2 | 14-day window toggle (`?window=14`) | PASS | `/programming?window=14` | Correctly relabels "last 14 days" and recalculates coverage. |
| 3 | "Plan activity" gap-planning link | PASS | n/a (link check) | Href resolves to `/generate?outcome=1.1` — correctly deep-links the generator pre-loaded with the specific outcome code. |

### Programs (`/programs`, `/programs/[id]`, `/calendar`, `/today`)

| Test # | Input | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | Create "Possums Week — Under the Sea (QB Test 1)", room Possums Room (2-3yo), 24–28 Aug 2026, notes re: new enrolment settling in | PASS | `/programs/dbf4a3b6-b209-4831-925f-603456b34549` | AI draft in 21.8s; 10 entries across 5 weekdays, all EYLF-tagged. |
| 2 | Create "Wombats Week — Bush Adventures (QB Test 2)", room Wombats Room (3-5yo), 31 Aug – 4 Sep 2026, notes re: Wattle Day | PASS | `/programs` (list) | AI draft in 19.3s, saved successfully. |
| 3 | Create "All Rooms — Spring Sensory Week (QB Test 3)", no room, 7–11 Sep 2026, notes re: short-staffed low-prep week | PASS | `/programs` (list) | AI draft in 13.1s; correctly reused a saved library activity ("Rocket Countdown Blast-Off", tagged "📌 From your library") and wove in a real upcoming cultural day (Malaysia Day lead-up). |
| 4 | Block editor on Program 1: rename a block label, move an entry to a different block via dropdown, reorder via ▲/▼ arrows | PASS | `/programs/dbf4a3b6-.../` | All 3 edits persisted correctly on reload. |
| 5 | Publish Program 1 | PASS | same | Button correctly flips to "Published ✓ (unpublish)". |
| 6 | View calendar after publish, **without** first sorting entries into blocks | **FAIL (quality)** | `/programs/dbf4a3b6-.../calendar` | No stale "DRAFT" banner (that part is correct) — but every day shows entirely empty ("—" in every cell) because none of the 10 AI-drafted entries were manually block-sorted. See Bug #2. Screenshot: `program-calendar-verify.png`. |
| 7 | `/today` room-guide: expand "Welcome Wave: Settling In Together" activity, log an observation directly from it for Zara-QB | PASS | `/observations` | Observation saved, correctly tagged with the program entry's own EYLF codes (1.1, 1.3) with no explicit tagging effort from me. Confirms "Today" handles unsorted entries via an "Other activities today" fallback (unlike calendar). Screenshot: `program-today-observation-logged.png`. |

### Observations (`/observations`)

| Test # | Input | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | Single child (Zara-QB), Anecdotal format, water-table description | PASS | `/observations` | Full text saved verbatim, correctly attributed and dated. |
| 2 | Single child (Theo-QB), Learning story format, title + narrative + educator-reflection context + 1 EYLF code | PASS | `/observations` | Title "The day Theo became an engineer" + full narrative + context section + EYLF 1.1 all saved and rendered correctly. |
| 3 (regression check) | 3 children (Zara-QB, Theo-QB, Priya-QB) selected, Jotting format, dropdown **closed via "Done" before submitting** | **PASS — bug confirmed fixed** | `/observations` | Trigger button retained "Priya-QB, Theo-QB, Zara-QB" label after the dropdown closed. Submitted, then independently verified via each child's own filtered `/observations?child=` feed that **all three** received the group observation. Screenshot: `observations-child-picker-multiselect.png`. |

### Milestones (`/milestones` + `/children/[id]`)

| Test # | Input | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| ref | View `/milestones` reference guide | PASS | `/milestones` | Read-only age-band guide renders correctly with domain groupings and a clear "not a diagnostic tool" disclaimer. Screenshot: `milestones-reference-page.png`. |
| 1 | Zara-QB, from-list mode, gross-motor milestone ("jumps with two feet together"), notes | PASS | `/children/3c15e5cc-49ad-4b9a-b64f-4e41f38af443` | Saved and listed correctly (after working around Bug #3's timing race). |
| 2 | Theo-QB, custom mode, "Uses 3-4 word sentences..." | PASS | `/children/69b577f7-d424-4f97-9421-c76f26c427d0` | Saved and listed correctly. |
| 3 | Priya-QB, from-list mode, fine-motor milestone (drawing/tripod grip) | PASS | `/children/cd308c81-f63d-4325-bc86-cb0b60de2a79` | Saved and listed correctly. Screenshot: `child-profile-milestones.png`. |

### Transition Statements (`/transitions`)

| Test # | Input | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | Priya-QB, "To school" type, manual strengths-based statement, then **finalised** | PASS | `/transitions/edit?child=cd308c81-...&type=to_school` | "Generate with AI" attempted first and surfaced a graceful in-app error rather than hanging (this was during the AI outage). Manual text saved and finalised correctly — list shows "Finalised 18/08/2026" + "View"-only (locked) link. Screenshot: `transitions-finalized-statement.png`. |
| 2 | Theo-QB, "Room transition" type, manual statement, saved as **draft** | PASS | `/transitions/edit?child=69b577f7-...&type=between_rooms` | Saved, remains editable ("Edit" link, not locked). |
| 3 | Zara-QB, "Service transition" type, manual statement re: relocating family, saved as draft | PASS | `/transitions/edit?child=3c15e5cc-...&type=between_services` | Saved correctly. Screenshot: `transitions-list.png`. |

### Day Plan (`/day-plan`)

| Test # | Input | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | 2026-08-17 (today, a Monday) | PASS | `/day-plan?date=2026-08-17` | Roster correctly shows only children with an attendance-day enrolment for that weekday. |
| 2 | 2026-08-18 (Tuesday) | PASS | `/day-plan?date=2026-08-18` | Roster correctly updates for the different day-of-week's enrolment set. |
| 3 | 2026-08-24 (a future Monday) | PASS | `/day-plan?date=2026-08-24` | Correctly shows "No children enrolled for Monday" with a helpful link to set enrolled days — coherent empty state, not a bug. Screenshot: `day-plan.png`. |

### Follow-ups (`/follow-ups`)

| Test # | Input | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | Zara-QB: "Wants to explore mixing more colours..." | PASS | `/follow-ups` | Present in Open list. |
| 2 | Theo-QB: "Interested in ramps and speed..." | PASS | `/follow-ups` | Present — ended up in the Done section (see mark-done test below), correctly listed with note intact. |
| 3 | Priya-QB: "Ready for more complex stories..." | PASS | `/follow-ups` | Present in Open list. |
| mark-done | Marked Theo-QB's follow-up done | PASS | `/follow-ups` | Moved out of "Open (2)" into "Done (1)" with a working "Reopen" link. Screenshot: `follow-ups-list.png`. |

### Daily Digest (`/digest`)

| Test # | Input | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | 2026-08-17 | PASS | `/digest?date=2026-08-17` | Loads correctly; sparse/empty since no meal/nappy/sleep logs exist yet for the QB test children (those live in other daily-forms modules outside this QA group's scope). |
| 2 | 2026-08-16 | PASS | `/digest?date=2026-08-16` | Loads correctly for a different date. |
| 3 | 2026-08-10 | PASS | `/digest?date=2026-08-10` | Loads correctly for a date further back. Screenshot: `daily-digest.png`. |

### Shift Handover (`/handover`)

| Test # | Input | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | Morning shift, 2026-08-17: general/children notes, no meds, no incidents, outstanding task re: permission slip | PASS | `/handover` | Saved and listed correctly. Screenshot: `handover-before-ack.png`. |
| 2 | Afternoon shift, 2026-08-17: general/children notes, a minor bump incident, restock task | PASS | `/handover` | Saved and listed correctly, including the incident summary field. |
| acknowledge | Acknowledged both outgoing notes from the "incoming shift" side | PASS | `/handover` | Both flipped from an "Acknowledge" button to an "Acknowledged by {staff}" badge. Screenshot: `handover-after-ack.png`. |

---

## Screenshots (in `docs/qa-2026-08-18/group-b/screenshots/`)

- `programs-list-with-3-programs.png` / `programs-list-verify.png` — all 3 QB test programs saved and listed with correct room tags.
- `program-editor-error-state.png` — Program 3 mid-draft in the block editor, showing all 10 AI entries sitting in the "Unsorted" row (root cause of Bug #2).
- `program-detail-quality.png` — Program 1 detail view: Materials-needed shopping list, cultural-days panel, Publish button, "10 activities aren't sorted" notice.
- `program-calendar-verify.png` — **the blank published A3 calendar** (Bug #2), for direct comparison against the editor's content.
- `program-today-verify.png` — the `/today` room-guide correctly showing the same unsorted entries under "Other activities today" (no blank state).
- `program-today-observation-logged.png` — observation logged directly from the Today view.
- `programming-workspace.png`, `programs-ai-draft-error.png`, `programs-list-empty-state.png`, `observations-child-picker-multiselect.png`, `milestones-reference-page.png`, `child-profile-milestones.png`, `transitions-finalized-statement.png`, `transitions-list.png`, `day-plan.png`, `follow-ups-list.png`, `daily-digest.png`, `handover-before-ack.png`, `handover-after-ack.png`.
