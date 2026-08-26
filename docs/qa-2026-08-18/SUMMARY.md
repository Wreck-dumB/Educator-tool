# DR. SparkPlay QA Pass — Overview for Dan

Date: 2026-08-18. Four QA passes covered the whole app — front-desk/enrolment/admin (Group D), content generation & printables (Group A), programming & observations (Group B), and compliance/policy documents (Group C). Full detail is in the four reports in this folder; this page is the skim version, ranked by how much it actually matters.

**Context you need first:** early in the day, one missing setting (`SUPABASE_SERVICE_ROLE_KEY`) was silently breaking almost every AI feature in the app, showing users a misleading "network error" instead of the real cause. **That's already fixed** — it's mentioned below only as background, not as something still broken. Everything else on this page is a real, current issue.

---

## Top priority — fix these

### 1. Permission Slips are completely broken — you cannot send a single one
Every attempt to send a permission slip to a family fails with a raw database error ("infinite recursion detected in policy"). This isn't a fluke — it happened 3 times out of 3 in testing. The cause is a genuine bug in how two database tables' security rules reference each other in a circular way. It's been there since the feature was first built; it's not related to today's earlier AI outage.

This blocks the whole feature (excursion consent, photo/media consent, medication authorisation) and also breaks the "attach a permission slip" option on Excursions, since there's nothing to attach. A developer needs to rewrite two of the security policies — I've identified exactly which ones and the fix pattern in the Group C report, but did not apply it myself since it's a schema change that needs testing.
→ Full detail: `group-c-compliance-policies.md`, "Top Finding."

### 2. Double-clicking "Add child" still creates two copies of the same child
Known issue, confirmed still present today. A parent-facing account error like this (a duplicate enrolment record) is the kind of thing that causes real confusion — worth a proper fix (disable the button while submitting) rather than leaving it.
→ Full detail: `group-d-frontdesk-admin.md`, Bugs Found #1.

---

## Worth fixing soon

### 3. The Policy Builder crashes the whole page on most attempts
Drafting a policy with AI worked cleanly 1 time out of 3 in testing — the other 2 times, the entire page crashed with a generic "Something went wrong" screen. Root cause: the AI occasionally returns one of its fields in a slightly different shape than the code expects, and the code doesn't defensively handle that. This is a quick code fix (a few lines), not a design problem — the actual policy-writing quality when it doesn't crash is excellent.
→ `group-c-compliance-policies.md`, "Second Finding."

### 4. AI generation hangs about 1 time in 3, with zero feedback to the user
Across Generate Activity, Brain Breaks, and Policy drafting, roughly a third of AI requests just never finish — no error, no "still working," the button stays stuck on "Generating…" forever. An educator would reasonably think the app had frozen. This is a different, new issue from this morning's outage (which is fixed) — it's about response-time reliability. Worth adding a "this is taking longer than usual" message after ~20 seconds so it doesn't read as broken.
→ `group-a-content-generation.md`, Bug #5.

### 5. "Acknowledge" on shift handover notes doesn't do anything
Clicking it doesn't throw an error, but the note never shows "Acknowledged by…" afterwards — confirmed on 2 separate attempts. The code doesn't check whether the underlying save actually worked, so right now nobody would know it's silently failing.
→ `group-b-programming-observations.md`, Bugs Found #1.

---

## Minor / lower urgency

- **Staff names show as "Unknown"** on the Staff Roster and on Shift Handover notes, because the test account never had a display name set up. Might be specific to how this QA account was created rather than a bug every real user will hit — worth a quick check with a normal signed-up account.
- **A child's profile page has invalid HTML** (one form nested inside another) that forces the page to silently re-render itself right after loading — didn't cause data loss in testing, but a very fast typer could plausibly lose an early keystroke or click. Cheap fix (move one form outside the other).
- **Meal Planner repeats the same 2–3 meals** 3 times within a single 5-day week rather than genuine variety — it's drawing from a small pool of already-saved recipes rather than writing fresh ones. Not broken, just underwhelming as a real week plan.
- **Program planning occasionally links off-topic saved activities** into a themed week (e.g. a "space" activity showing up in an "under the sea" week) because it matches from the whole activity library rather than weighting the program's own theme.
- **Brain Breaks have no way to save one for later** — every one is fully disposable once you close the tab. May be intentional (it's built around live in-room play, not a printable), worth just confirming that's the intended design.
- A few small poster-editor and worksheet-image test-script hiccups that turned out to be test-script issues, not app bugs — see the individual reports if curious.

---

## What's actually good

The main thing you wanted answered this round was **"is the AI output actually good, now that it works?"** — yes, clearly:

- **Recipes, Safe Work Procedures, QIP items, Reflective-practice questions, and Document Templates (permission slip / consent forms)** were all excellent — specific, safety-aware, and genuinely usable as a real educator would use them, not generic filler. A few standout examples: a recipe correctly adapting food shape for toddler choking-hazard safety; a bleach-sanitising procedure with real WHS competence (ventilation, correct mixing order, PPE); reflection questions that read like a real mentor wrote them, not a template.
- **Document Import & Review** — upload an old policy, get back a specific quality score, gap analysis against real Cancer Council/NQS guidance, and a fully rewritten replacement policy on request. This is the single strongest AI feature in the app right now.
- **Generate Activity** genuinely adapts to a child's stated needs (e.g. a "quiet" activity for a child with noise sensitivity, not just a label pasted on a generic template).
- Everything non-AI tested across all four passes — sign-in/out, attendance, rooms, waiting list, invoicing, CCS estimator, compliance tracker, NQS ratings, observations, milestones, follow-ups, daily digest, worksheets, Auslan dictionary, materials — held up solidly. The known cross-tenant blank-page bug from a previous audit is confirmed fixed.

---

## Housekeeping
- All four reports and their screenshots live in this folder (`docs/qa-2026-08-18/`), nothing was committed to git.
- No application code or database was changed to fix any bug — reports only, as requested. One piece of harmless QA test-data litter (a duplicate Community Wall post, "QA wall post two (retry)") was deleted since it was trivial to do; a second, near-identical duplicate ("QA wall post three (retry)") resisted deletion (the same flaky delete-button issue Group D ran into) and was left in place rather than force it — it's inert test data in the QA-only tenant, not a real issue.

## Reports in this folder
- `group-a-content-generation.md` — Generate Activity, Brain Breaks, Worksheets, Auslan, Posters, Recipes, Meal Planner, Materials
- `group-b-programming-observations.md` — Observations, Programming Workspace, Programs, Milestones, Transitions, Day Plan, Handover, Follow-ups, Digest
- `group-c-compliance-policies.md` — NQS, Permission Slips, Policies, Forms, Safe Work, QIP, Risk Assessments, Reflections, Behaviour Support, Import & Review
- `group-d-frontdesk-admin.md` — 21 front-desk/enrolment/admin features (81 checks)
