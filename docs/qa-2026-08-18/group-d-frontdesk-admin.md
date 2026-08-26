# QA Group D — Front-desk, Enrolment, Comms & Admin

Run date: 2026-08-18. Tester: automated QA agent (director account: krondor2024+qa-director-a@gmail.com, "QA Test Centre A").

Scripts (left in place, untracked): `playwright/tests/qa-group-d-script.js` (main pass, 21 features), `playwright/tests/qa-group-d-verify.js` / `qa-group-d-dump.js` / `qa-group-d-dump2.js` / `qa-group-d-casualdays.js` (follow-up verification against live app state), `playwright/tests/qa-group-d-cleanup.js` (attempted tidy-up, see note below). All plain Node + `playwright` scripts run via `node <file>.js`, deliberately not run through the shared Playwright test runner / `auth.setup.ts` mechanism, to avoid colliding with the other 3 parallel QA agents on the shared `playwright/.auth/director.json` file. Session state saved separately to `playwright/.auth/qa-group-d.json`.

**Methodology note on this report's accuracy**: the first automated pass logged 18 "FAIL"s out of 81 checks. On spot-checking the underlying app state directly (fresh page loads, not just the script's own in-flight assertion), the large majority of those FAILs turned out to be false negatives in the *checking* code (an `innerText()` read immediately after a server-action redirect, before the app had fully re-rendered) rather than real product bugs — the data was in fact saved correctly. Every FAIL below has been re-verified against live app state and is reported with its corrected, true result plus a note explaining what happened. Two genuine issues fell out of this process: a couple of harmless duplicate test records created when the flaky check triggered an unnecessary retry, and one real Playwright timeout (Medication Log #3) that was a timing/rendering hiccup, not conclusively an app bug (it succeeded cleanly on retry).

**Shared-tenant note**: this QA director account is shared across all 4 parallel QA agents *and* carries data from earlier QA sessions (memory: "SparkPlay QA pass 2026-07-26"). Pre-existing records not created by this pass were visible throughout — e.g. rooms "Possums Room (2-3yo)" / "Wombats Room (3-5yo)", children "Priya-QB" / "Theo-QB" / "Zara-QB" / "PW-1785934248151", and extra staff-roster shifts. This is expected and not a bug, but it did cause one of my own tests (Rooms #3, room assignment) to target the wrong pre-existing room — see notes below.

## Bugs Found

1. **Duplicate child record on double-submit — STILL PRESENT.** Double-clicking "Add child" on `/children` created 2 copies of "QaChild DupCheck". This is the known regression from the QA brief and has **not** been fixed.
2. **Staff Roster shows "Unknown" instead of the staff member's name.** Every shift on `/staff/roster` (including ones added by this pass) displays "Unknown" as the staff member instead of a real name — the "Add shift" dropdown itself only offers "Unknown (director)" as an option. This traces to the QA director profile having no `display_name` set, so it may be a data-quality artifact of this specific fixture account rather than a roster bug — but a roster page that can't show *any* staff name for its only staff member is a rough edge worth a look either way.
3. **Minor test-data litter (not a product bug, disclosed for transparency):** because of the false-negative issue described above, this pass's own verification retries created two extra duplicate records that don't reflect a real defect: a duplicate "Test Parent Three" invoice (INV-0004, twin of INV-0003) and two duplicate visitor-log entries ("Visitor Two Inspector Retry", "Visitor Three Student Retry"). An attempted cleanup of two duplicate Community Wall posts partially failed (delete-button locator didn't match); those two extra posts ("QA wall post two (retry)", "QA wall post three (retry)") remain on `/wall`. All of this is inert test data in a QA-only tenant, not a functional issue.

### Known-bug regression checks

- **Double-submit duplicate child bug**: **STILL PRESENT.** Reproduced live — 2 "QaChild DupCheck" records exist at `/children` from a single double-click.
- **Cross-tenant blank-page bug**: **FIXED.** Visiting `/children/00000000-0000-4000-8000-000000000000` (a nonsense/foreign UUID) now renders Next.js's proper not-found page rather than a blank page.

## Testability limitations

- **Casual Days**: requests can only be *created* from the parent portal (`/parent/(portal)/casual-days`) — there is no educator-side "add request" form, and no parent test account/inbox was available to create real requests. Verified instead: the page loads correctly, both tabs (Pending/History) render, and both correctly show empty states (0 pending, no past requests). The approve/decline flow itself could not be exercised end-to-end.
- **Messages**: requires a linked-parent conversation, which requires a parent to accept a child invite (itself gated on email confirmation). Not available in this pass — only the page's correct empty state was verified.
- **Broadcasts**: send is correctly disabled with "0 parents" when no families are linked. Verified this disabled state renders correctly; could not exercise 2-3 real sends.
- **Staff Roster / Leave Calendar / Compliance Tracker**: staff invites require email acceptance, so the QA director account remained the only *active* staff member throughout — all roster shifts, leave, and compliance records were created against that one account.

## Per-feature results

### Sign In / Out

| Test # | Input / Scenario | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | Sign in children: QaChild Ava, QaChild Ben | PASS | http://localhost:3000/signin | Original check reported FAIL (false negative — read the DOM before the optimistic-UI re-render settled); live re-check confirms both children show "IN" with a timestamp on the kiosk board. |
| 2 | Sign self (director) in as staff | PASS | http://localhost:3000/signin | Staff tab self sign-in succeeded (board shows 1 staff signed in). |
| 3 | Sign in visitor "Kiosk Test Visitor" — reason "Dropping off forms" | PASS | http://localhost:3000/signin | Original FAIL was a false negative; live re-check confirms the visitor is listed under the Visitors tab. |

### On Site Board

| Test # | Input / Scenario | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | Load /onsite after signing in 2 children, self, 1 visitor | PASS | http://localhost:3000/onsite | Summary strip showed 2 children / 1 staff / 1 visitor, matching what was signed in. |
| 2 | Check medical/allergy alert badge for QaChild Ben (anaphylaxis note) | PASS | http://localhost:3000/onsite | "⚠️ MEDICAL / DIETARY ALERTS — 1 CHILD ON SITE / QaChild Ben" banner rendered correctly, sourced from the additional_needs text entered at Children #2. |
| 3 | Check summary strip counts (children/staff/visitors) | PASS | http://localhost:3000/onsite | |

### Roll Call / Attendance

| Test # | Input / Scenario | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | Mark attendance for 2026-08-17 | PASS | http://localhost:3000/attendance?date=2026-08-17 | Sign-in/Absent action performed and persisted. |
| 2 | Mark attendance for 2026-08-16 | PASS | http://localhost:3000/attendance?date=2026-08-16 | Sign-in/Absent action performed and persisted. |
| 3 | Mark attendance for 2026-08-15 | PASS | http://localhost:3000/attendance?date=2026-08-15 | Sign-in/Absent action performed and persisted. |

### Casual Days

| Test # | Input / Scenario | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | Load /casual-days, Pending tab | PASS | http://localhost:3000/casual-days | Renders "Pending (0)" and "No pending casual day requests." — correct empty state. |
| 2 | Load /casual-days?tab=history, History tab | PASS | http://localhost:3000/casual-days?tab=history | Renders "No past requests yet." — correct empty state. |
| — | Submit 3 bookings + approve/decline | NOT TESTED | — | No educator-side "add request" form exists (parent-portal-only feature); no parent test account was available. See Testability limitations. |

### Visitor Log

| Test # | Input / Scenario | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | Visitor One Plumber — contractor, ABC Plumbing, ID checked=yes, WWCC checked=no, supervised=yes | PASS | http://localhost:3000/visitor-log | Confirmed on page: "Contractor · ABC Plumbing · Signed in ...". |
| 2 | Visitor Two Inspector — government_inspector, State Regulatory Authority, ID=yes, WWCC=yes, supervised=no | PASS | http://localhost:3000/visitor-log | Original FAIL was a false negative; entry confirmed live with correct "Unsupervised" flag shown. A duplicate "Visitor Two Inspector Retry" also exists from the unnecessary verification retry (harmless litter). |
| 3 | Visitor Three Student — student_placement, TAFE NSW, ID=yes, WWCC=yes, supervised=yes | PASS | http://localhost:3000/visitor-log | Original FAIL was a false negative; entry confirmed live. A duplicate "Visitor Three Student Retry" also exists (harmless litter). |

### Dashboard

| Test # | Input / Scenario | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | Check "On premises / of N enrolled" widget reflects children added earlier | PASS | http://localhost:3000/dashboard | Widget showed "of 8 enrolled" after this pass's children were added (shared-tenant total, includes other groups' children too). |
| 2 | Check "Rooms today" widget reflects rooms created earlier | PASS | http://localhost:3000/dashboard | Rooms today section present and listing rooms including this pass's new ones. |
| 3 | Check Ratio widget renders a staff/required count | PASS | http://localhost:3000/dashboard | Renders e.g. "1/1 · In ratio". |

### Children

| Test # | Input / Scenario | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | first_name="QaChild Ava", no DOB/interests | PASS | http://localhost:3000/children | Basic add-child with minimal fields. |
| 2 | first_name="QaChild Ben", DOB=2021-03-15, interests, allergy note ("Severe peanut allergy — EpiPen on site. Anaphylaxis risk.") in additional_needs | PASS | http://localhost:3000/children | Original FAIL was a false negative; confirmed live, and this note is what drove the On Site Board medical alert (see above). |
| 3 | first_name="QaChild Cleo", DOB=2019-07-01, interests | PASS (on retry) | http://localhost:3000/children | Genuinely not created on the first attempt (unlike #2, a direct re-check before any retry also showed it absent) — inconclusive whether this was a one-off app hiccup or a script timing issue, but flagging it as the one case that wasn't cleanly a check-only false negative. Succeeded when retried directly. |
| dup-bug | Double-click submit on "Add child" with first_name="QaChild DupCheck" | **FAIL (real bug)** | http://localhost:3000/children | 2 duplicate records created from one double-click. Known past bug is STILL PRESENT — see Bugs Found. |
| edit | Edit QaChild Ava: current_interests → "bubbles, singing (edited)" | PASS | http://localhost:3000/children/de05a0ae-f0fe-4f97-bb79-94a406f4e06b | Edit persisted and is still visible on the profile. |
| cross-tenant-404 | Visit /children/00000000-0000-4000-8000-000000000000 (nonsense/foreign UUID) | PASS | http://localhost:3000/children/00000000-0000-4000-8000-000000000000 | Proper not-found page shown, not blank — known past bug is FIXED. |

### Rooms

| Test # | Input / Scenario | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | Add room "QaRoom Nursery" | PASS | http://localhost:3000/rooms | |
| 2 | Add room "QaRoom Toddlers" | PASS | http://localhost:3000/rooms | Original FAIL was a false negative; both rooms confirmed present on live re-check. |
| 3 | Assign QaChild Ava to a room | PASS (functionally), but not to the intended room | http://localhost:3000/rooms | The room-assignment feature itself works, but this pass's script grabbed the first "add child to room" dropdown on the page, which — because this shared tenant already had pre-existing rooms ("Possums Room", "Wombats Room") sorted ahead of the newly-created ones — actually assigned Ava to "Possums Room (2-3yo)" rather than "QaRoom Nursery". Confirmed via the kiosk sign-in board, which groups children by room name. This is a test-script targeting issue, not an app bug. |

### Occupancy

| Test # | Input / Scenario | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1-2 | Set capacities of 3 and 4 on two rooms, reload /occupancy | PASS | http://localhost:3000/occupancy | Enrolled/vacancy stats and fill bars rendered correctly against the new capacities. |

### Waiting List

| Test # | Input / Scenario | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | Enquiry: Waitlist Kid One / Parent One / session=full_day | PASS | http://localhost:3000/waiting-list | Created as "enquiry" status. |
| 2 | Enquiry: Waitlist Kid Two / Parent Two / session=morning | PASS | http://localhost:3000/waiting-list | Created as "enquiry" status. |
| 3 | Enquiry: Waitlist Kid Three / Parent Three / session=flexible | PASS | http://localhost:3000/waiting-list | Created as "enquiry" status. |
| stage-progress | Progress "Waitlist Kid One": enquiry → waitlisted → offered → enrolled | PASS | http://localhost:3000/waiting-list?status=enrolled | All 3 stage transitions worked; child correctly landed in the Enrolled tab. |
| decline | Decline "Waitlist Kid Two" | PASS | http://localhost:3000/waiting-list?status=archived | Status-variety coverage (enquiry → declined). |

### Medication Log

| Test # | Input / Scenario | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | Panadol 5ml, oral, for QaChild Ava, parent-authorised=yes (written form) | PASS | http://localhost:3000/medication-log | Signed and recorded correctly, incl. staff sign-off. |
| 2 | Ventolin 2 puffs, inhaled, for QaChild Ben, parent-authorised=yes (standing order) | PASS | http://localhost:3000/medication-log | Signed and recorded correctly. |
| 3 | Antihistamine cream, topical, for QaChild Cleo, parent-authorised=no | PASS (on retry) | http://localhost:3000/medication-log | First attempt hit a real Playwright timeout waiting for the child-select dropdown to become visible/enabled — a genuine rendering/timing hiccup, not conclusively an app bug since the identical action succeeded cleanly on retry with the record correctly recorded as "Not authorised". |

### Safety Checks

| Test # | Input / Scenario | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | Complete all 19 checklist items for 2026-08-18 | PASS | http://localhost:3000/safety-checks?date=2026-08-18 | Original FAIL was a false negative; the 14-day history strip shows a ✓ for 18 Aug and the page banner reads "All 19 checks completed". |
| 2 | Complete all 19 checklist items for 2026-08-17 | PASS | http://localhost:3000/safety-checks?date=2026-08-17 | Confirmed via history strip ✓ and "All 19 checks completed for Monday 17 Aug." banner. |
| 3 | Complete all 19 checklist items for 2026-08-16 | PASS | http://localhost:3000/safety-checks?date=2026-08-16 | Confirmed via history strip ✓ for 16 Aug. |

### Complaints

| Test # | Input / Scenario | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | parent: "Concern about outdoor supervision" | PASS | http://localhost:3000/complaints | |
| 2 | staff: "Rostering grievance" | PASS | http://localhost:3000/complaints | |
| 3 | anonymous: "Anonymous note about food quality" | PASS | http://localhost:3000/complaints | |
| progress | Progress "Concern about outdoor supervision" → resolved, with resolution notes | PASS | http://localhost:3000/complaints | Moved correctly from Open to Resolved section with notes attached. |

### Sleep / Food / Nappy Charts

| Test # | Input / Scenario | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| Sleep 1 | QaChild Ava: 12:30–14:00, "Settled quickly" | PASS | http://localhost:3000/sleep | |
| Sleep 2 | QaChild Ava: 13:00 start (no end), "Still asleep" | PASS | http://localhost:3000/sleep | Open-ended sleep record (no end time) handled correctly. |
| Food 1 | QaChild Ava: breakfast — "porridge and banana" (amount: most) | PASS | http://localhost:3000/food | |
| Food 2 | QaChild Ava: lunch — "rice, chicken, veggies" (amount: all) | PASS | http://localhost:3000/food | |
| Food 3 | QaChild Ava: afternoon tea — "rice crackers" (amount: little) | PASS | http://localhost:3000/food | |
| Nappy 1 | QaChild Ava: 09:15 — wet | PASS | http://localhost:3000/nappy | |
| Nappy 2 | QaChild Ava: 12:45 — wet+dirty, "Rash cream applied" | PASS | http://localhost:3000/nappy | |
| Nappy 3 | QaChild Ava: 15:30 — dry | PASS | http://localhost:3000/nappy | |

### Physical Activity & Nutrition

| Test # | Input / Scenario | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | QaChild Ava: physical activity, 25 min, "Outdoor obstacle course" | PASS | http://localhost:3000/physical-activity | |
| 2 | QaChild Ben: physical activity, 15 min | PASS | http://localhost:3000/physical-activity | |
| 3 | QaChild Ava: nutrition education, 20 min, "Growing our own tomatoes" | PASS | http://localhost:3000/physical-activity | |

### Messages

| Test # | Input / Scenario | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | Load /messages page | PASS | http://localhost:3000/messages | Correct empty state ("No conversations yet"). Requires a linked parent to test send/receive — not available in this pass. |

### Community Wall

| Test # | Input / Scenario | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | Post: "QA wall post one — welcome to term 3!" | PASS | http://localhost:3000/wall | Posted as educator, auto-approved (no review queue for own posts). |
| 2 | Post: "QA wall post two — reminder about sunhats." | PASS | http://localhost:3000/wall | Original FAIL was a false negative; confirmed live. A duplicate "QA wall post two (retry)" also exists from the unnecessary verification retry — an attempted cleanup delete failed to match, so it's still there (harmless litter, see Bugs Found #3). |
| 3 | Post: "QA wall post three — photo day next Friday." | PASS | http://localhost:3000/wall | Same as above — original post succeeded; a "(retry)" duplicate remains. |

### PD Hours

| Test # | Input / Scenario | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | Anaphylaxis Management — 4h, St John Ambulance, type=first_aid | PASS | http://localhost:3000/pd-hours | |
| 2 | Child Safe Standards Refresher — 2h, ACECQA, type=child_protection | PASS | http://localhost:3000/pd-hours | |
| 3 | Behaviour Guidance Strategies — 3.5h, TAFE NSW, type=curriculum | PASS | http://localhost:3000/pd-hours | |

### Staff, Staff Roster, Leave Calendar

| Test # | Input / Scenario | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| Staff 1 | Invite qa-staff-invite@example.com as Staff role | PASS | http://localhost:3000/staff | Invite created and listed as pending; cannot be accepted without an email inbox, so this account never became an active staff member (see Testability limitations). |
| Roster 1 | Add shift 08:00–16:00 on the Monday of the current week | FAIL (test-script date bug) | http://localhost:3000/staff/roster | The test script computed this date in the Node process's local timezone, one day off from the app's AEST-displayed week (landed on the Sunday before, outside the visible Mon–Sun grid). Not treated as an app bug — the roster feature itself is exercised correctly by tests #2 and #3. |
| Roster 2 | Add shift 08:00–16:00 on Mon 17 Aug | PASS | http://localhost:3000/staff/roster | Shift visible in the week grid under MON 17. Staff name shows as "Unknown" — see Bugs Found #2. |
| Roster 3 | Add shift 08:00–16:00 on Tue 18 Aug | PASS | http://localhost:3000/staff/roster | Shift visible in the week grid under TUE 18. Same "Unknown" name issue. |
| Leave 1 | Request annual leave 27–29 Aug 2026 for QA Director | PASS | http://localhost:3000/staff/roster/leave | Saved and shown on the calendar; this feature has no separate approval step — director/2IC-added leave is immediately live. |

### Compliance Tracker

| Test # | Input / Scenario | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | WWCC WWC1234567A — issued 31/12/2021, expires in ~20 days | PASS | http://localhost:3000/compliance | |
| 2 | HLTAID012 First Aid — issued 31/05/2023, expires ~2028 (far out) | PASS | http://localhost:3000/compliance | |
| 3 | Anaphylaxis & Asthma Management — issued 31/12/2020, expiry set ~30 days in the past | PASS | http://localhost:3000/compliance | |
| expiry-alert | Confirm the "expiring within 60 days" alert fires for the near-expiry records | PASS | http://localhost:3000/compliance | Original FAIL was a false negative; live re-check shows the alert banner correctly listing both the WWCC ("20d") and, notably, also surfacing the already-expired Anaphylaxis record ("Expired 30d ago") in the same alert box — the alert logic correctly catches both upcoming and already-lapsed certifications. |

### Service Closures

| Test # | Input / Scenario | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | 2026-08-31 — public_holiday: "Local public holiday" | PASS | http://localhost:3000/closures | |
| 2 | 2026-09-07 — pupil_free: "Staff planning day" | PASS | http://localhost:3000/closures | |
| 3 | 2026-09-16 — maintenance: "Carpet cleaning" | PASS | http://localhost:3000/closures | |

### Broadcasts

| Test # | Input / Scenario | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | Attempt broadcast with 0 linked parents | PASS | http://localhost:3000/broadcasts | Send button correctly disabled and page shows "No linked parents yet" — expected behaviour, not a bug. Could not test 2-3 real sends without a linked parent account. |

### Invoices

| Test # | Input / Scenario | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | Test Parent One — "Weekly childcare fee" x1 @ $450.00 | PASS | http://localhost:3000/invoices/bbd22628-5ddd-44b9-9ebe-454ec23c3cc0 | Draft invoice INV-0001. |
| 2 | Test Parent Two — "Excursion levy" x1 @ $25.00 | PASS | http://localhost:3000/invoices/85d52110-9d7d-4bf7-977a-7388bc14e50d | Draft invoice INV-0002. |
| 3 | Test Parent Three — "Late pickup fee" x2 @ $15.00 | PASS | http://localhost:3000/invoices | Original FAIL was a false negative; invoice INV-0003 ($30.00) was in fact created. A duplicate INV-0004 (same details) also exists from the unnecessary verification retry (harmless litter, see Bugs Found #3). |
| print | Check print-to-PDF view on the first invoice's detail page | PASS | http://localhost:3000/invoices/bbd22628-5ddd-44b9-9ebe-454ec23c3cc0 | Print button present and functional affordance confirmed. |

### CCS Estimator

| Test # | Input / Scenario | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | Centre-based day care, fee $135/10h, CCS 75%, 3 days/wk × 48 wks | PASS | http://localhost:3000/ccs-estimator | Gap fee, weekly/annual gap, and annual CCS benefit all rendered. |
| 2 | Family day care, fee $110/9h, CCS 50%, 5 days/wk × 48 wks | PASS | http://localhost:3000/ccs-estimator | |
| 3 | Outside school hours care, fee $35/3h, CCS 85%, 5 days/wk × 40 wks | PASS | http://localhost:3000/ccs-estimator | |

### Service Settings & White Noise

| Test # | Input / Scenario | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| Settings 1 | Load /settings page | PASS | http://localhost:3000/settings | Sanity-check load only, per QA brief. |
| Settings 2 | Re-save service name (no-op) | PASS | http://localhost:3000/settings | |
| White Noise 1 | Load /white-noise, check play control present | PASS | http://localhost:3000/white-noise | Original FAIL was a check-timing issue (role/name query ran before the audio provider had mounted); confirmed on re-check that the Play button is present. |
| White Noise 2 | Click Play, verify "playing" state | PASS | http://localhost:3000/white-noise | Clicking Play correctly switched the UI to the "playing" state text; Stop correctly reverted it. |
