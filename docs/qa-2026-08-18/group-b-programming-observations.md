# QA Group B — Programming & Observations

Run date: 2026-08-18. Tester: automated QA agent (director account: `krondor2024+qa-director-a@gmail.com`, "QA Test Centre A"). Scope: Observations, Programming Workspace, Programs (AI draft), Milestones, Transition Statements, Day Plan, Shift Handover, Follow-ups, Daily Digest.

Scripts (left in place, untracked): `playwright/qa-group-b-explore.js` (main pass — setup + Observations, Programming Workspace, Milestones, Transitions, Day Plan, Follow-ups, Digest, Handover), `playwright/qa-group-b-programs-retry.js` (follow-up pass for Programs specifically, run after the `SUPABASE_SERVICE_ROLE_KEY` fix landed), `playwright/qa-verify-programs.js` / `qa-verify-program-detail.js` (spot-check scripts written during this write-up to resolve an ambiguous script result — see Programs section). All plain Node + `playwright` scripts, run independently of the shared test-runner auth file to avoid colliding with the other 3 parallel QA agents. Session state: `playwright/qa-group-b-auth.json`. Raw logs: `playwright/results.jsonl` (main pass), `playwright/results-programs.jsonl` (Programs retry). Screenshots: `docs/qa-2026-08-18/group-b/screenshots/`.

**Note on this report's history:** the original run (this morning) hit the same `SUPABASE_SERVICE_ROLE_KEY` root cause Group A found — Programs' AI draft generation was completely blocked. That key has since been added and the dev server restarted; Programs was re-tested live for this write-up and the AI-quality verdict below is from that re-test, not the original blocked run.

---

## Bugs Found

1. **Shift Handover — clicking "Acknowledge" has no visible effect.** Clicked twice (original pass + a targeted re-check for this report) against a real, never-acknowledged handover note. Both times the POST succeeded (HTTP 200, no console/page errors) and the page reloaded, but the note still shows the "Acknowledge" button rather than switching to "Acknowledged by …" — the acknowledgment never appears to take. `acknowledgeHandover()` in `src/app/(app)/handover/actions.ts` doesn't check or surface the Supabase `update()` result at all (no error handling, no row-count check), so if the write is silently failing or `revalidatePath` isn't forcing a fresh fetch, there's no way for either the user or this QA pass to tell why — worth a developer look at that action directly rather than guessing further from the outside.
2. **"Written by Unknown" on handover notes** — the same root cause Group D found on Staff Roster (the QA director profile has no `display_name` set) also surfaces here: every handover note shows "Written by Unknown" instead of a name. Confirms it's a systemic display-name fallback gap, not roster-specific.
3. **Real bug, now fixed — could not reproduce:** a Next.js dev-mode error ("Module … was instantiated … but the module factory is not available… Switched to client rendering") appeared once in the original pass's console log while navigating away from `/behaviour-support/new`. Re-checked live for this report and it did **not** reproduce — most likely a stale-chunk artifact from the dev server having just been restarted for the env-var fix earlier in the day, not an ongoing issue. Flagging for completeness only.
4. **Minor test-data litter (not a product bug):** 3 QA-only children (Zara-QB, Theo-QB, Priya-QB) and 2 rooms (Possums Room, Wombats Room) were created by this pass's setup step and remain in the shared QA tenant, along with 3 saved Programs. Same category as Group D's disclosed litter — inert QA data, not a functional issue.

### Known-bug regression check

- **Observation child-picker multi-select bug** (select multiple children in the picker dropdown, close it, then submit — does every selected child actually get the observation, or only some due to a stale render?): **FIXED.** Tested directly — selected Zara-QB, Theo-QB and Priya-QB, closed the dropdown (trigger button correctly still showed all 3 names after closing: "Priya-QB, Theo-QB, Zara-QB"), submitted, then checked each child's individual filtered observation feed. All 3 independently show the group observation (`allThreeSaved: true`). No sign of the regression.

---

## AI Output Quality Verdict — Programs

This is the one AI-backed feature in Group B's scope, and it's now fully working end to end: draft generation, save, the full block-editor (rename block, move an entry between blocks, reorder), Publish, the calendar view, and the `/today` room-guide view (including logging an observation directly from an activity card, which correctly appeared back on `/observations`).

**Generation is reliable and reasonably fast for this feature specifically** — all 3 test programs drafted successfully in 13–22 seconds each (no timeouts, unlike the shorter single-call features in Group A's re-test — likely because this is a genuinely larger structured generation, not evidence against the Bug #5 latency finding in Group A's report).

**One real quality concern:** the "reusing your saved activities where they fit" behaviour is more literal than useful. The "Possums Week — Under the Sea" program (educator notes: *"Focus on water play and ocean creatures"*) came back linking activities called "Rocket Countdown Blast-Off" and "Dinosaur Stomp and Freeze" — both from earlier, unrelated test activities in the library (space and dinosaur themed) — alongside one genuinely on-theme activity ("Ocean Whisper Counting"). The feature is pulling from the *whole* saved-activity library by rough topical/EYLF match rather than weighting the program's own stated theme, so half of a themed week's activities can come back off-topic. Worth checking whether the matching should be scoped more tightly to the program's notes/title before it reuses a saved activity, versus drafting a fresh one.

Screenshots: `program-detail-quality.png`, `programs-list-verify.png`, `program-calendar-verify.png`, `program-today-verify.png`.

**A methodology note on the retry script:** `qa-group-b-programs-retry.js`'s own save-confirmation check (`saved: false, href: null`) initially looked like all 3 programs failed to save. Live re-verification (`qa-verify-programs.js`) confirmed all 3 were in fact saved correctly with real UUIDs and correct titles/dates/rooms — the script's `a:has-text(title)` locator was the false negative (likely the em-dash in every test title tripping up the text match), not a real save failure. Noted here so the raw `results-programs.jsonl` log isn't misread later.

---

## Per-Feature Results

### Observations (`/observations`)
| Test # | Input | Result | Notes |
|---|---|---|---|
| 1 | Single child (Zara-QB), anecdotal note | PASS | Logged and confirmed on page. |
| 2 | Learning story format, different child (Theo-QB), with EYLF code | PASS | Title, context field, and EYLF checkbox all logged correctly. |
| 3 | Group observation, 3 children via multi-select picker | PASS | See "Known-bug regression check" above — confirmed fixed. |

### Programming Workspace (`/programming`)
| Test # | Input | Result | Notes |
|---|---|---|---|
| 1 | Load page, check EYLF-gap outcome chips | PASS | Rendered correctly with real outcome codes. |
| 2 | "Plan activity" gap-planning link | PASS | Correctly links to `/generate?outcome=1.2`, carrying the outcome code through. |
| 3 | 14-day window toggle | PASS | `?window=14` correctly changed the displayed window text. |

### Programs (`/programs`) — AI draft generation
| Test # | Input | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| 1 | "Possums Week — Under the Sea", Possums Room, 24–28 Aug, water-play notes | PASS | `http://localhost:3000/programs/dbf4a3b6-b209-4831-925f-603456b34549` | Drafted in 21.8s. See theming quality note above. Full block-editor workflow (rename block, move entry, reorder, Publish) all worked; calendar and `/today` views both loaded cleanly post-publish. |
| 2 | "Wombats Week — Bush Adventures", Wombats Room, 31 Aug–4 Sep | PASS | `http://localhost:3000/programs/1502b76b-c620-4d7e-a154-5ea7e3809435` | Drafted in 19.3s. |
| 3 | "All Rooms — Spring Sensory Week", no room, 7–11 Sep | PASS | `http://localhost:3000/programs/63c59e8c-76ad-4802-8111-5592aefa6f79` | Drafted in 13.1s. |

Screenshots: `programs-ai-draft-error.png` (original blocked-state evidence, historical), `program-detail-quality.png`, `programs-list-verify.png`, `program-calendar-verify.png`, `program-today-verify.png` (current working state).

### Milestones (`/milestones`, per-child logging on `/children/[id]`)
| Test # | Input | Result | Saved-at URL | Notes |
|---|---|---|---|---|
| — | Reference page load, age-band content | PASS | `http://localhost:3000/milestones` | Correctly cites source guidance (Sydney Children's Hospitals Network, Emerging Minds, AAP) by age band. |
| 1 | Zara-QB, from-list milestone | PASS | `http://localhost:3000/children/3c15e5cc-49ad-4b9a-b64f-4e41f38af443` | Note persisted correctly. |
| 2 | Theo-QB, custom milestone text | PASS | `http://localhost:3000/children/69b577f7-d424-4f97-9421-c76f26c427d0` | Note persisted correctly. |
| 3 | Priya-QB, from-list milestone | PASS | `http://localhost:3000/children/cd308c81-f63d-4325-bc86-cb0b60de2a79` | Note persisted correctly. |

All 3 tests hit a known hydration-mismatch console error on the child profile page (invalid nested `<form>` — `assignChildToRoom` form nested inside the `updateChild` form) that forces a client-side re-render shortly after load. The test script accounted for this with a settle delay; a real user typing quickly right after the page loads could plausibly have an early click/fill silently dropped by the re-render. Worth a fix (move the room-assignment control outside the outer `<form>`) even though the data still saved correctly in every test here.

### Transition Statements (`/transitions`)
| Test # | Input | Result | Notes |
|---|---|---|---|
| — | "Generate with AI" while still blocked (original pass) | PASS (graceful) | Correctly surfaced an error message rather than hanging — good failure UX even before the fix landed. |
| 1 | Priya-QB, to-school, manual text, finalised | PASS | Saved and correctly locked (`showsFinalizedLock: true`). |
| 2 | Theo-QB, between-rooms, manual text, draft | PASS | Saved as draft. |
| 3 | Zara-QB, between-services, manual text, draft | PASS | Saved as draft. |
| — | `/transitions` list view | PASS | All 3 statements counted correctly (`savedCount: 3`). |

(The test script's own "persisted" text-match check reported `false` for all 3 — a check-methodology false negative, not a real issue: the finalise-lock and list-count checks both independently confirm the saves worked.)

### Day Plan (`/day-plan`)
| Test # | Date | Result | Notes |
|---|---|---|---|
| 1–3 | 17, 18, 24 Aug 2026 | PASS | Each date loaded correctly. For dates with no children enrolled on that weekday, correctly shows "No children enrolled for Monday" / "0 present · 0 expected" rather than erroring — clean empty state. |

### Follow-ups (`/follow-ups`)
| Test # | Input | Result | Notes |
|---|---|---|---|
| 1–3 | 3 follow-up notes across Zara-QB, Theo-QB, Priya-QB | PASS | All 3 confirmed present in the "Open" list with correct text, live re-check (screenshot `follow-ups-list.png`). |
| — | Mark first note done | PASS | Confirmed via a later live check (`followups_check.txt`) showing "DONE (1)" — the original script's own check reported `false`, a timing false negative like several of Group D's findings, not a real bug. |

### Daily Digest (`/digest`)
| Test # | Date | Result | Notes |
|---|---|---|---|
| 1–3 | 17, 16, 10 Aug 2026 | PASS | Each date loaded cleanly; dates with no attendance/observation data correctly show "No data recorded for this date" with helpful links out to Attendance/Observations rather than a blank or broken page. |

### Shift Handover (`/handover`)
| Test # | Input | Result | Notes |
|---|---|---|---|
| 1 | Morning shift, 17 Aug, full notes (general/children/medication/incidents/tasks) | PASS | Saved and displayed correctly, including a real incident note ("bumped knee on the trike, ice pack applied"). |
| 2 | Afternoon shift, 17 Aug, full notes | PASS | Saved and displayed correctly. |
| — | Acknowledge the outgoing note | **FAIL (real bug)** | See Bugs Found #1 — button click has no visible effect. |

---

## Files
- Scripts: `playwright/qa-group-b-explore.js`, `playwright/qa-group-b-programs-retry.js`, `playwright/qa-verify-programs.js`, `playwright/qa-verify-program-detail.js`
- Auth state: `playwright/qa-group-b-auth.json`
- Raw logs: `playwright/results.jsonl`, `playwright/results-programs.jsonl`
- Screenshots: `docs/qa-2026-08-18/group-b/screenshots/`
