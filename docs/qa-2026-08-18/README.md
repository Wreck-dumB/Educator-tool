# DR. SparkPlay — Full-App QA Pass, 2026-08-18

Four parallel QA passes covering every nav feature, 3+ real tests each, with generated content actually saved in-app (not just previewed) so it can be inspected directly.

**UPDATE, later same day:** every bug found below has since been fixed, verified live, and pushed to `main` (commits `62fb48a` + `1ac56ef`, migration `0063`) — this file originally read "not yet fixed," left as the historical record of what QA found, but the "Bugs found" list below is now a **fixed-bugs changelog**, not an outstanding punch list. See [[project-sparkplay-qa-pass]] in memory, or `git show 62fb48a` / `git show 1ac56ef`, for the fix details.

## Where to look

Log in as the QA Test Centre director account to browse everything created during this pass:
- URL: `http://localhost:3000/login`
- Email: `krondor2024+qa-director-a@gmail.com`
- Password: `QaTest-Dl9_guGihFa1`

(Disposable test account, not a real centre — safe to poke around in, and safe to delete/regenerate later.)

Full per-feature tables, exact inputs used, and saved-content URLs are in the four linked reports. Screenshots are in each group's `screenshots/` subfolder.

- [group-a-content-generation.md](group-a-content-generation.md) — Generate Activity, Activities library, Brain Breaks, Worksheets, Auslan, Posters & Fliers, Recipes, Meal Planner, Materials
- [group-b-planning-programming.md](group-b-planning-programming.md) — Programming Workspace, Programs (block editor/publish/calendar/today), Observations, Milestones, Transitions, Day Plan, Follow-ups, Digest, Handover
- [group-c-documents-compliance.md](group-c-documents-compliance.md) — Document Templates, Import & Review, Policies, Safe Work Procedures, QIP, NQS, Risk Assessments, Behaviour Support, Health Plans, Reflections, Incident Reports, Permission Slips, Excursions
- [group-d-frontdesk-admin.md](group-d-frontdesk-admin.md) — Sign In/Out, On Site Board, Attendance, Casual Days, Visitor Log, Dashboard, Children, Rooms, Occupancy, Waiting List, Medication Log, Safety Checks, Complaints, Sleep/Food/Nappy, Physical Activity, Messages, Wall, PD Hours, Staff/Roster/Leave, Compliance Tracker, Closures, Broadcasts, Invoices, CCS Estimator, Settings, White Noise

## Infra fix applied during testing

`SUPABASE_SERVICE_ROLE_KEY` was missing from `.env.local`, which silently broke almost every AI-generation route app-wide (not a billing issue — confirmed the Anthropic key/model worked fine called directly). This was blocking the majority of what you asked to have judged, so it was fixed mid-pass: added the real key (pulled via the Supabase Management API) and restarted the dev server. All AI-dependent results in these reports reflect genuine retests after that fix, not the earlier false failures. **This is a real gap worth knowing about even though it's fixed now**: the rate-limiter (`src/lib/rateLimit.ts`) doesn't wrap its admin-client construction in try/catch, so any future env/config slip reproduces this exact opaque failure across ~20+ routes.

## Bugs found — all FIXED same-session except #7 (ranked by original severity)

### Critical — affected real usage
1. ✅ **FIXED — Permission Slips were 100% broken.** Every creation attempt failed with a raw Postgres error: `infinite recursion detected in policy for relation "permission_slips"` — a self-referencing RLS policy bug (migration 0013), affecting every centre. Fixed via migration 0063 (SECURITY DEFINER helper functions, same pattern as `has_service_role()`), applied live to Supabase and re-verified end-to-end. *(Group C)*
2. ✅ **FIXED — Unvalidated AI output crashed the app in 3 places.** Policies (null title → raw DB error; `relatedLegislation.join is not a function` → full page crash, reproduced 6+ times) and Generate Activity (`raw.map is not a function`, blocking Risk Assessments). Added `sanitizeRawPolicy()` and defensive array coercion at the API boundary. *(Group C)*
3. ✅ **FIXED — Published program calendar could print completely blank.** AI-drafted entries default to "Unsorted"; the printable A3 calendar had no fallback for unsorted entries. Added an "Other activities" fallback row mirroring `/today`'s existing pattern. *(Group B)*
4. ✅ **FIXED — PDF upload was completely broken in Import & Review** — a missing bundled worker module (`pdf.worker.mjs`) meant every PDF failed while DOCX worked. Fixed via `serverExternalPackages` in `next.config.ts`. *(Group C)*
5. ✅ **FIXED — Duplicate child record on double-submit.** Double-clicking "Add child" created two copies; flagged 3+ weeks ago, never fixed until now — new `SubmitButton` component disables on pending. *(Group D)*

### Medium
6. ✅ **FIXED — Nested `<form>` HTML on `/children/[id]`** caused a real React hydration error, which intermittently dropped Milestone-log input. Un-nested as a sibling form. *(Group B)*
7. ✅ **FIXED — Meal Planner's AI-fill had a real repetition problem.** The same 2-3 recipes were filling 3 of 5 days in a week, because the prompt only forbade repeats "on consecutive days" and biased heavily toward the small saved-recipe pool. Rewrote the prompt to forbid any repeat across the whole week and to write fresh `custom_title` meals by default rather than cycling the saved pool. Verified live: a full empty week (25 slots) now fills with 25 genuinely distinct meals. This was the "full menus" feature you most wanted judged. *(Group A, commit `1ac56ef`)*
8. AI generation is noticeably unreliable — roughly a third of calls (seen across Generate Activity, Brain Breaks, Policy Builder) simply hang past 60 seconds with no timeout or "still working" message. Not fixed (a UX/product addition — a visible timeout message — rather than a bug fix); worth adding. *(Group A, C)*
9. ✅ **Investigated — not a reproducible app bug.** Staff Roster's "Unknown" name traced to one specific QA fixture account genuinely missing a `profiles` row (schema enforces `NOT NULL`, real signup always creates one) — fallback label improved to "(no profile set up)" for clarity if it ever recurs. *(Group D)*

### Minor
10. Cross-tenant blank-page bug from the last QA pass is **confirmed fixed** (proper not-found page now). *(Group D)*
11. Child-picker multi-select-then-close-dropdown-then-submit bug from the last QA pass is **confirmed fixed** (verified per-child). *(Group B)*
12. ✅ **FIXED** — Poster canvas: new text elements spawn stacked on top of each other. Now staggered on each addition. *(Group A)*
13. Brain Breaks has no save/library mechanism at all — fully ephemeral, worth confirming this is deliberate (not changed — a product decision). *(Group A)*
14. ✅ **FIXED** — Duplicate DOM ids on `/programs/[id]/today` when 2+ activities exist. `ObservationForm` now uses `useId()` per instance. *(Group B)*
15. ✅ **FIXED** — No loading indicator on Behaviour Support Plans save buttons (now shows "Saving…"). **Investigated, no bug found** — NQS rating buttons already update instantly on click; verified live, that report finding didn't reproduce. *(Group C)*

## Quality — the good news

Where AI generation actually completed (i.e., not hit by bugs #2 or #8 above), content quality was consistently strong and specific, not generic boilerplate:
- **Recipes** — the standout feature. Safety-conscious (choking-hazard prep called out, halal constraints correctly respected with no alcohol extracts), correct allergen tags.
- **Generate Activity** — genuinely tailored to stated needs (a "sensory sensitivity to loud noise" note produced a deliberately quiet activity, not a generic template fill), correct EYLF codes throughout.
- **Programs** — real cultural/national-days integration (Ganesh Chaturthi, National Science Week, etc. with honest "confirmed" vs "verify — moveable date" framing), a practical "Materials needed" shopping-list rollup across the week.
- **Reflections, QIP, Safe Work Procedures, Behaviour Support Plans** — all specific to the scenario entered, cross-referencing real details rather than generic advice.
- **Incident Reports → Reg 176 notify draft** — verified byte-accurate against the source incident (child, description, location, 24-hour deadline correctly calculated).
- **Worksheets** (name_trace, matching_pairs, counting_groups, letter_colouring) — clean, print-ready, no AI dependency, all strong.
- **Auslan Dictionary** — fully static, worked perfectly across every search.

## Testability gaps (not bugs — just couldn't be exercised in this pass)
Casual Days approval, Messages, and Broadcasts sends all require a linked parent account with a confirmed email — no parent test account existed for this pass, so only correct empty/disabled states were verified, not the full send/approve flow.
