# QA Group C — Compliance, Policies & Governance Documents

Run date: 2026-08-18. Tester: automated QA agent (director account: `krondor2024+qa-director-a@gmail.com`, "QA Test Centre A"). Scope: NQS Self-Assessment, Permission Slips, Policies (AI), Document Templates / Forms (AI), Safe Work Procedures (AI), QIP generator + Check-in (AI), Risk Assessments (AI, generated from a saved activity), Reflections (AI), plus the adjacent Behaviour Support Plans, Excursions, Health Plans, Incident Reports and Import & Review (AI document review) surfaces this account also has access to.

**Note on this report's origin:** the original Group C pass ran earlier today via interactive browser automation rather than a saved script, so no raw JSONL log or reusable script survived it — only its screenshots did (`docs/qa-2026-08-18/group-c/screenshots/`). This report was reconstructed from those screenshots plus a fresh re-test written for this write-up: `playwright/qa-group-c-quality.js` (Policies, Forms, Safe Work Procedures, QIP, Reflections, Risk Assessment, plus live re-checks of the two bugs below), and three small follow-up scripts used to pin down the Permission Slips bug precisely: `playwright/qa-verify-permission-slip-rls.js` and two inline verification scripts (not saved as files) that added console/network logging. Session state: `playwright/.auth/qa-group-c.json`. New screenshots from this write-up: `docs/qa-2026-08-18/group-c/screenshots/*-quality.png`, `*-recheck.png`, `permission-slips-rls-recursion-CONFIRMED-live.png`.

**Root-cause context:** like every other group, most of this scope's AI features were originally blocked by the missing `SUPABASE_SERVICE_ROLE_KEY` (see Group A's report for the full root-cause writeup). That key has since been added and the dev server restarted. **The two bugs below are unrelated to that fix and are both still present.**

---

## Top Finding — Permission Slips: infinite-recursion RLS bug (CONFIRMED, blocks creating any slip)

**Severity: high — this feature is currently 100% non-functional for its core purpose.**

### What's wrong
Loading `/permission-slips` with an empty table looks fine ("No open slips", no error). But **the moment you try to actually send a permission slip, the request fails with a raw Postgres error surfaced straight to the screen**:

> `infinite recursion detected in policy for relation "permission_slips"`

This is Postgres error `42P17` — a genuine server-side RLS (Row Level Security) policy bug, not a network/env-var/Anthropic issue, and not intermittent: it reproduced on **every** attempt to create a slip in this pass (3 for 3, via `qa-verify-permission-slip-rls.js`). Because it only fires on an actual write-then-read-back, a quick page-load check of an empty table can look deceptively healthy — that's almost certainly why the original pass's screenshot (`permission-slips-rls-recursion-bug.png`) shows the error while my first live re-check of the empty page did not. Freshly confirmed screenshot: `permission-slips-rls-recursion-CONFIRMED-live.png`.

### Root cause (found by reading the migrations)
`supabase/migrations/0013_permission_slips.sql` creates a circular reference between two RLS-protected tables:

- The `permission_slips` SELECT policy `"Linked parent can view slip sent to their child"` runs an `EXISTS` subquery against `permission_slip_targets`.
- `permission_slip_targets`'s own policy `"Educator can manage targets for own slips"` runs an `EXISTS` subquery back against `permission_slips`.

Any query against `permission_slips` that actually has to evaluate its row-security qualifiers (i.e. once there's at least one real row to filter, such as right after an insert) triggers policy evaluation on `permission_slips` → which requires evaluating policies on `permission_slip_targets` → which requires evaluating policies on `permission_slips` again → infinite recursion, caught and reported by Postgres rather than actually hanging. `permission_slip_versions` and `permission_slip_signatures` have the identical pattern (`0013`, lines 85–123) so they're likely affected too, though only `permission_slips`/`permission_slip_targets` were exercised directly in this pass.

This cycle has existed since `permission_slips` was first added (migration `0013`) and was never touched by the later RBAC rewrite (`0020_permission_slips_rbac.sql`, which only changed the *educator-side* access model on `permission_slips` itself to `has_service_role()` — it didn't touch `permission_slip_targets`'s policies, so the parent-facing half of the cycle is still wired the old way).

### Suggested fix (not applied — flagging for developer review, this is a schema change)
Break the cycle the same way `has_service_role()` already does for the equivalent director/staff-ownership check: replace the direct cross-table `EXISTS` subqueries with a `SECURITY DEFINER` helper function that resolves ownership without re-triggering RLS on the other table. For example:

```sql
create or replace function public.permission_slip_owner(_slip_id uuid)
returns uuid
language sql security definer stable
set search_path = public
as $$
  select educator_user_id from public.permission_slips where id = _slip_id;
$$;
```

...then rewrite `permission_slip_targets` (and the equivalent in `_versions`/`_signatures`) to call `public.has_service_role(public.permission_slip_owner(slip_id), 'staff')` instead of the raw `EXISTS (SELECT ... FROM permission_slips ...)`. Because the function runs with the elevated privileges of its (table-owning) definer, its internal `SELECT` bypasses RLS entirely instead of re-entering it, which is exactly why `has_service_role()` itself doesn't recurse into `staff_memberships`/`services`. **This needs a real migration and testing against the parent-portal signing flow too (not just the educator side) before it ships** — flagging clearly rather than applying it myself per the QA brief.

### Downstream impact
`Excursions` has a "Link permission slip" dropdown for attaching an existing slip to an excursion record (`excursions-linked-permission-slip.png`) — it currently shows "— None —" with nothing to select, which is consistent with this bug: there are no permission slips in existence anywhere in the tenant because none can ever be successfully created.

---

## Second Finding — Policy Builder crashes on most AI generations (`draft.relatedLegislation.join is not a function`)

**Severity: high — the AI policy drafter is unusable more often than not.**

### What's wrong
Generating a policy draft via `/policies` crashed the whole page with a generic Next.js error boundary ("Something went wrong") on **2 of 3 live attempts** in this pass. The real error, visible in the browser console:

```
TypeError: draft.relatedLegislation.join is not a function
    at PolicyForm (...)
```

### Root cause
`src/app/api/policy/route.ts` passes the model's `related_legislation` field straight through with no runtime shape validation:
```ts
relatedLegislation: raw.related_legislation ?? [],
```
The TypeScript type (`RawPolicy.related_legislation: string[]`) and the tool schema both declare this as a string array, but that's only a compile-time/prompt-time expectation — nothing actually checks the model's real output matches it before sending it to the client. `PolicyForm.tsx` then calls `draft.relatedLegislation.join("; ")` unconditionally once `.length > 0` is true. When the model occasionally returns this field as a single string instead of an array (both have a `.length`, so the `.length > 0` guard doesn't catch it, but only arrays have `.join`), the client throws and the whole page crashes — not just that one section.

### Suggested fix
Two independent layers, either would prevent the crash: (1) guard the render — `Array.isArray(draft.relatedLegislation) ? draft.relatedLegislation.join("; ") : draft.relatedLegislation`, and (2) validate/coerce the shape server-side in the API route before it ever reaches the client (e.g. `Array.isArray(raw.related_legislation) ? raw.related_legislation : [raw.related_legislation].filter(Boolean)`). The same unguarded pattern is worth checking on the sibling AI-drafted-document features (Forms, Safe Work Procedures, QIP) since they share the same "trust the model's JSON shape" approach — none crashed in this pass, but none were hit enough times to be confident the same class of bug isn't lurking there too.

Screenshots: `policies-ai-failure.png` (original root-cause-blocked evidence), `policies-quality-retry3.png` (this new crash, live).

---

## AI Output Quality Verdict (the rest of the AI-backed features in this slice)

Where generation actually completed, quality was consistently high across the board — this matches Group A's and Group B's re-test findings. Highlights:

- **Document Templates / Forms — excellent.** The excursion permission-slip form draft was thorough and specific (correct room/date/emergency-contact fields), and the "worth considering" gap-check list was genuinely useful, catching real regulatory gaps (medical-treatment consent, ratio/supervision disclosure, wet-weather contingency) a rushed educator draft would likely miss.
- **Safe Work Procedures — excellent, real WHS competence.** The bleach-sanitising procedure correctly sequenced PPE, ventilation, "add bleach to water not water to bleach," never-mix-chemicals warnings, child-exclusion from the area, and correctly-rated hazards (skin/eye contact, chlorine inhalation) with sensible controls.
- **QIP generator — excellent.** Produced both a "strength" and a well-structured "improvement" item from a single free-text prompt about inconsistent sun-protection compliance, complete with a measurable success criterion, timeframe, and concrete steps, correctly tagged to QA2/Standard 2.1.
- **Reflective Practice questions — excellent, genuinely reflective (not generic).** The 6 post-incident questions generated were specific to the described scenario, escalated logically (what happened → why → what does it reveal → what would you change), and read like real professional-development prompts rather than a templated checklist.
- **Risk Assessment (generated from a saved activity) — good.** Hazards were sensibly scoped to the specific activity (pencil-tip injury, trip hazards from seating, choking risk from small pencil parts, participation anxiety for an anxious child), each with a real likelihood/consequence rating and matched controls — genuinely usable as a starting draft.
- **Document Import & Review (`/import`) — excellent, the strongest AI feature seen across the whole QA pass.** Evidence is from the original (pre-fix) run's screenshots, which happened to capture a successful pass before the key went missing: uploading a sample sun-protection policy produced a detailed 2/10 quality score, specific gap citations against real Cancer Council Australia and NQS QA2/QA3 guidance, and — on "Generate updated policy" with one added instruction — a complete, well-structured rewritten policy incorporating that instruction verbatim, correctly cross-referenced to NQS codes, with an offer to log a matching QIP improvement item. This is a genuinely strong feature when it works; re-confirm it still works post-fix since it wasn't re-tested live for this report (screenshots: `import-test1-review.png`, `import-regenerate-result.png`).

Two features could not be judged this pass: **NQS Self-Assessment** and **Behaviour Support Plans** are not AI-authoring features in the same sense (NQS is manual star-rating with autosave; Behaviour Support Plans generates strategies from structured fields rather than free text) — both were exercised in the original pass and worked well (NQS: `nqs-test1-rated.png`, ratings autosave correctly; Behaviour Support: `behaviour-support-ai-generated-strategies.png`, genuinely thoughtful, specific, non-punitive strategy suggestions across educator/family/environment categories).

---

## Per-Feature Results

### NQS Self-Assessment (`/nqs`)
| Test | Result | Notes |
|---|---|---|
| Rate Standard 1.1 as "Exceeding" with evidence note | PASS | Autosaved correctly, summary counter updated (0→1 rated). No AI dependency. |

### Permission Slips (`/permission-slips`)
| Test | Result | Notes |
|---|---|---|
| Load empty state | PASS | Renders cleanly with 0 rows. |
| Create and send a new slip | **FAIL — real bug** | See "Top Finding" above. Reproduced 3/3 attempts. |

### Policies (`/policies`)
| Test # | Input | Result | Notes |
|---|---|---|---|
| 1 (original, pre-fix) | Sun protection policy | Fail — blocked | Root-cause "Could not reach the server", screenshot `policies-ai-failure.png`. |
| 2 (re-test) | Sun protection policy | **FAIL — real bug** | Page crash, see "Second Finding" above. |
| 3 (re-test) | Nutrition and food safety policy | PASS | Completed without crashing — confirms the bug is intermittent/model-output-dependent, not universal. |
| 4 (re-test) | Nutrition and food safety, retry | **FAIL — real bug** | Crashed again. Net: 2 of 3 live attempts crashed. |

### Document Templates / Forms (`/forms`)
| Test | Input | Result | Notes |
|---|---|---|---|
| 1 | Excursion permission slip — library walking trip | PASS | High-quality draft + gap-check, saved correctly (confirmed in the saved-templates list below the form). |

### Safe Work Procedures (`/safe-work-procedures`)
| Test | Input | Result | Notes |
|---|---|---|---|
| 1 | Sanitising toys with bleach solution | PASS | High-quality, WHS-competent draft. |

### QIP — Generator (`/qip`) and Check-in (`/qip/checkin`)
| Test | Input | Result | Notes |
|---|---|---|---|
| 1 | Sun-protection compliance gap, QA2 focus | PASS | Strength + improvement item generated and added to the plan correctly (screenshot `qip-generate-test1.png`, original pass). |
| 2 | Daily QIP check-in | PASS | Original pass confirms check-in flow completes and flags QA4 correctly (`qip-checkin-test1-filled.png`). |

### Risk Assessments (`/risk-assessments`, generated per-activity)
| Test | Input | Result | Notes |
|---|---|---|---|
| 1 | Generated from a saved "Silent Ocean Count-Up" activity | PASS | 6 well-scoped hazards with sensible ratings and controls. |

### Reflective Practice (`/reflections`)
| Test | Input | Result | Notes |
|---|---|---|---|
| 1 | Post-incident, playground conflict scenario | PASS | 6 specific, well-sequenced reflective questions generated. Past-reflections list confirms the full generate→answer→save cycle works and persists (3 prior entries visible with varied real answers from earlier sessions). |

### Behaviour Support Plans (`/behaviour-support/new`)
| Test | Result | Notes |
|---|---|---|
| Generate strategies for a rest-time disruption scenario | PASS | Thoughtful, non-punitive, correctly split into educator/family/environment strategy categories (original pass, `behaviour-support-ai-generated-strategies.png`). |
| Live re-check of a stale-chunk RSC error seen once on this page in Group B's log | PASS (not reproduced) | `hasModuleFactoryError: false` on live re-check — likely a one-off dev-server artifact from earlier today, not an ongoing issue. |

### Excursions (`/excursions`)
| Test | Result | Notes |
|---|---|---|
| View excursion detail, linked-documents panel | PASS (structurally) | Page and fields render correctly; the permission-slip link dropdown is empty as a downstream consequence of the RLS bug above, not a defect in Excursions itself. |

### Import & Review (`/import`)
| Test | Result | Notes |
|---|---|---|
| Upload sample policy, AI review | PASS (evidence from original pass) | See AI Output Quality Verdict above — the strongest AI feature in this slice. Not re-run live for this report; recommend a quick confirmation pass since it wasn't directly re-verified post-fix. |
| Upload + review, later attempts | Fail — blocked (original pass) | Same root-cause pattern as everything else pre-fix (`import-test1-FAIL.png`, `import-regenerate-FAIL.png`, `import-test2-FAIL.png`, `import-test3-FAIL.png`). |

---

## Files
- Script: `playwright/qa-group-c-quality.js` (stages run inline — policies, forms, safe-work, qip, reflections, risk-assessment, permission-slips recheck, behaviour-support recheck)
- Follow-up verification: `playwright/qa-verify-permission-slip-rls.js`
- Auth state: `playwright/.auth/qa-group-c.json`
- Raw results: `playwright/results-group-c-quality.jsonl`
- Screenshots: `docs/qa-2026-08-18/group-c/screenshots/`
