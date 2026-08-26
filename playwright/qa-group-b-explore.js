// Exploratory QA script for DR. SparkPlay - Group B (Planning & Programming)
// Run with: node qa-run.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';
const SHOT_DIR = 'D:\\Projects\\sparkplay\\docs\\qa-2026-08-18\\group-b\\screenshots';
const RESULTS_FILE = path.join(__dirname, 'results.jsonl');

function log(obj) {
  const line = JSON.stringify(obj);
  console.log(line);
  fs.appendFileSync(RESULTS_FILE, line + '\n');
}

async function shot(page, name) {
  const p = path.join(SHOT_DIR, name);
  await page.screenshot({ path: p, fullPage: true });
  return name;
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await context.newPage();

  page.on('pageerror', (err) => log({ type: 'pageerror', msg: String(err) }));
  page.on('console', (msg) => { if (msg.type() === 'error') log({ type: 'consoleerror', msg: msg.text() }); });

  // ---- Login ----
  await page.goto(`${BASE}/login`);
  await page.locator('#email').fill('krondor2024+qa-director-a@gmail.com');
  await page.locator('#password').fill('QaTest-Dl9_guGihFa1');
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL('**/generate', { timeout: 20000 });
  log({ step: 'login', ok: true, url: page.url() });

  await context.storageState({ path: path.join(__dirname, 'qa-group-b-auth.json') });

  // ---- Discover children & rooms ----
  await page.goto(`${BASE}/children`);
  const childNames = await page.locator('a[href^="/children/"]').allTextContents();
  log({ step: 'discover_children', names: childNames.slice(0, 40) });

  await page.goto(`${BASE}/rooms`);
  const roomsText = await page.locator('body').innerText();
  log({ step: 'discover_rooms_page_text', text: roomsText.slice(0, 2000) });

  // ---- Add QA children if pool is thin (need variety for observations/milestones/transitions) ----
  const NEW_CHILDREN = [
    { name: 'Zara-QB', dob: '2022-03-14', interests: 'dinosaurs, puzzles' },
    { name: 'Theo-QB', dob: '2021-07-02', interests: 'trucks, building blocks' },
    { name: 'Priya-QB', dob: '2020-11-20', interests: 'drawing, storytime' },
  ];
  await page.goto(`${BASE}/children`);
  const existingNames = (await page.locator('a[href^="/children/"]').allTextContents()).join('|');
  for (const c of NEW_CHILDREN) {
    if (existingNames.includes(c.name)) { log({ step: 'skip_existing_child', name: c.name }); continue; }
    await page.goto(`${BASE}/children`);
    await page.locator('#first_name').fill(c.name);
    await page.locator('#date_of_birth').fill(c.dob);
    await page.locator('#current_interests').fill(c.interests);
    await page.getByRole('button', { name: 'Add child' }).click().catch(async () => {
      await page.locator('button[type="submit"]').last().click();
    });
    await page.waitForLoadState('networkidle').catch(() => {});
  }
  await page.goto(`${BASE}/children`);
  const childNames2 = await page.locator('a[href^="/children/"]').allTextContents();
  log({ step: 'children_after_add', names: childNames2 });

  // ---- Add 2 rooms ----
  const ROOMS = ['Possums Room (2-3yo)', 'Wombats Room (3-5yo)'];
  await page.goto(`${BASE}/rooms`);
  const existingRoomsText = await page.locator('body').innerText();
  for (const r of ROOMS) {
    if (existingRoomsText.includes(r)) { log({ step: 'skip_existing_room', name: r }); continue; }
    await page.goto(`${BASE}/rooms`, { waitUntil: 'networkidle' });
    const input = page.locator('input[type="text"]').first();
    await input.waitFor({ state: 'visible', timeout: 10000 });
    await input.fill(r);
    await page.getByRole('button', { name: 'Add' }).first().click();
    await page.waitForTimeout(1500);
    const afterUrl = page.url();
    const afterText = await page.locator('body').innerText();
    log({ step: 'room_add_attempt', name: r, afterUrl, snippet: afterText.slice(0, 400) });
  }
  await page.goto(`${BASE}/rooms`);
  const roomsText2 = await page.locator('body').innerText();
  log({ step: 'rooms_after_add', text: roomsText2.slice(0, 1500) });

  await page.goto(`${BASE}/rooms`);
  await page.waitForTimeout(500);
  const finalRoomsText = await page.locator('body').innerText();
  log({ step: 'rooms_final_check', text: finalRoomsText.slice(0, 1200) });

  log({ step: 'DONE_SETUP' });

  // =========================================================================
  // FEATURE: Programs — create 3 programs with varied room/dates/notes
  // =========================================================================
  async function createProgram({ title, room, startDate, endDate, notes }) {
    await page.goto(`${BASE}/programs`, { waitUntil: 'networkidle' });
    await page.locator('#program_title').fill(title);
    if (room) {
      const roomSelect = page.locator('#room_id');
      if (await roomSelect.count()) {
        await roomSelect.selectOption({ label: room }).catch(async () => {
          log({ step: 'room_select_label_failed', room });
        });
      }
    }
    await page.locator('#start_date').fill(startDate);
    await page.locator('#end_date').fill(endDate);
    if (notes) await page.locator('#educator_notes').fill(notes);

    await page.getByRole('button', { name: 'Draft program' }).click();
    // Wait for either the draft to appear or an error
    const draftOrError = await Promise.race([
      page.getByRole('button', { name: 'Save program' }).waitFor({ state: 'visible', timeout: 60000 }).then(() => 'draft'),
      page.locator('.text-coral-dark, [class*="errorBanner"]').first().waitFor({ state: 'visible', timeout: 60000 }).then(() => 'maybe_error'),
    ]).catch(() => 'timeout');

    let errorText = null;
    if (draftOrError !== 'draft') {
      const bodyText = await page.locator('body').innerText();
      if (bodyText.includes('Something went wrong') || bodyText.includes('credit balance') || bodyText.includes('Could not reach')) {
        errorText = bodyText.slice(0, 500);
      }
    }
    if (errorText) {
      log({ step: 'create_program', title, result: 'AI_ERROR', errorText });
      return { ok: false, error: errorText };
    }

    // Save
    await page.getByRole('button', { name: 'Save program' }).click();
    await page.waitForTimeout(2000);
    const savedText = await page.locator('body').innerText();
    const savedOk = savedText.includes('Saved');
    log({ step: 'create_program', title, result: savedOk ? 'SAVED' : 'UNKNOWN', snippet: savedText.slice(0, 300) });

    // Find its link in the list below
    await page.waitForTimeout(500);
    const link = page.locator(`a:has-text("${title}")`).first();
    let href = null;
    if (await link.count()) href = await link.getAttribute('href');
    return { ok: savedOk, href };
  }

  // Known blocker (confirmed via direct API probing before this run): every
  // AI-backed route (/api/program, /api/expand-observation, /api/brain-break,
  // /api/cultural-days) returns HTTP 500 with a completely empty body when
  // called through the running Next dev server, even though the same
  // ANTHROPIC_API_KEY + model + exact SDK params succeed when called directly
  // via a standalone Node script outside Next. So this is an app/runtime bug,
  // not an Anthropic billing/credit issue. We still attempt one program here
  // (short timeout) to capture the actual in-UI error banner for the report,
  // then stop retrying per the QA brief's guidance.
  const programResults = [];
  programResults.push(await createProgram({
    title: 'Possums Week — Under the Sea (QB Test 1)',
    room: 'Possums Room (2-3yo)',
    startDate: '2026-08-24',
    endDate: '2026-08-28',
    notes: 'Focus on water play and ocean creatures; we have a new enrolment settling in this week.',
  }));
  await shot(page, 'programs-ai-draft-error.png');
  log({ step: 'programs_summary', programResults, note: 'AI draft generation is broken app-wide; further program creation attempts skipped per QA brief guidance (see blocker note in results).' });

  // Verify empty-state /programs page renders sanely despite the blocker
  await page.goto(`${BASE}/programs`, { waitUntil: 'networkidle' });
  const programsListText = await page.locator('body').innerText();
  log({ step: 'programs_empty_state', hasNoProgramsMsg: programsListText.includes('No programs saved yet'), snippet: programsListText.slice(programsListText.indexOf('Program planner'), programsListText.indexOf('Program planner') + 600) });
  await shot(page, 'programs-list-empty-state.png');

  // =========================================================================
  // FEATURE: Programming Workspace — reflects real data, gap-planning links
  // =========================================================================
  try {
    await page.goto(`${BASE}/programming`, { waitUntil: 'networkidle' });
    const progText = await page.locator('body').innerText();
    const idx = progText.indexOf('Programming Workspace');
    log({ step: 'programming_workspace', snippet: progText.slice(idx, idx + 900) });
    await shot(page, 'programming-workspace.png');
    // Follow a "Plan activity" link if present, check it lands on /generate with outcome param
    const planLink = page.locator('a:has-text("Plan activity")').first();
    if (await planLink.count()) {
      const href = await planLink.getAttribute('href');
      log({ step: 'programming_workspace_plan_link', href });
    } else {
      log({ step: 'programming_workspace_plan_link', href: null, note: 'no gap-planning links visible (may mean no uncovered/low outcomes right now)' });
    }
    // Check the 14/30/60 day window toggle
    await page.goto(`${BASE}/programming?window=14`, { waitUntil: 'networkidle' });
    const t14 = await page.locator('body').innerText();
    log({ step: 'programming_workspace_window_14', hasWindowText: t14.includes('last 14 days') });
  } catch (e) {
    log({ step: 'programming_workspace', error: String(e) });
  }

  // =========================================================================
  // FEATURE: Observations — 3 varied logs + child-picker multi-select bug check
  // =========================================================================
  async function getChildIdByName(name) {
    await page.goto(`${BASE}/children`, { waitUntil: 'networkidle' });
    const link = page.locator(`a:has-text("${name}")`).first();
    const href = await link.getAttribute('href');
    return href ? href.split('/').pop() : null;
  }

  // The dropdown checkbox rows are the only "Zara-QB" text inside a <label>
  // element — scope to that to avoid colliding with the filter-chip links /
  // hidden-input duplicates of the same name elsewhere on the page.
  function childCheckboxRow(page, name) {
    return page.locator('label').filter({ has: page.locator('input[type="checkbox"]') }).filter({ hasText: name });
  }

  try {
    // Test 1: single child, anecdotal observation
    await page.goto(`${BASE}/observations`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Select children…' }).click();
    await childCheckboxRow(page, 'Zara-QB').click();
    await page.getByRole('button', { name: /^Done/ }).click();
    await page.locator('#obs_note_text').fill('Zara spent 15 minutes at the water table today, pouring water between two containers of different sizes and commenting "this one\'s bigger!" when comparing them.');
    await page.getByRole('button', { name: /Log observation/ }).click();
    await page.waitForLoadState('networkidle');
    const obsText1 = await page.locator('body').innerText();
    log({ step: 'observation_test_1_single_child', ok: obsText1.includes('Zara spent 15 minutes'), url: page.url() });

    // Test 2: learning story format, different child, with EYLF codes
    await page.goto(`${BASE}/observations`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Learning story' }).click();
    await page.getByRole('button', { name: 'Select children…' }).click();
    await childCheckboxRow(page, 'Theo-QB').click();
    await page.getByRole('button', { name: /^Done/ }).click();
    const titleInput = page.locator('input[name="observation_title"]');
    if (await titleInput.count()) await titleInput.fill('The day Theo became an engineer');
    await page.locator('#obs_note_text').fill('Today I watched you spend almost 30 minutes building a ramp out of blocks, testing three different angles until a toy truck rolled all the way to the mat. You clapped and called Priya over to show her.');
    const contextField = page.locator('textarea[name="observation_context"]');
    if (await contextField.count()) await contextField.fill('Shows persistence and cause-and-effect reasoning; plan to extend with a ramps-and-ball provocation next week.');
    const eylfCheckbox = page.locator('input[name="eylf_codes"]').first();
    if (await eylfCheckbox.count()) await eylfCheckbox.check();
    await page.getByRole('button', { name: /Log observation/ }).click();
    await page.waitForLoadState('networkidle');
    const obsText2 = await page.locator('body').innerText();
    log({ step: 'observation_test_2_learning_story', ok: obsText2.includes('Theo became an engineer') || obsText2.includes('ramp out of blocks'), url: page.url() });

    // Test 3: THE CHILD-PICKER BUG CHECK — select multiple children, close dropdown
    // (click Done), THEN submit. Verify ALL selected children get an observation,
    // not just the ones that happened to still be checked in a stale render.
    await page.goto(`${BASE}/observations`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Jotting' }).click();
    await page.getByRole('button', { name: 'Select children…' }).click();
    await childCheckboxRow(page, 'Zara-QB').click();
    await childCheckboxRow(page, 'Theo-QB').click();
    await childCheckboxRow(page, 'Priya-QB').click();
    // Confirm the trigger button shows "3 selected" before closing
    const doneBtn = page.getByRole('button', { name: /^Done/ });
    const doneBtnText = await doneBtn.innerText();
    await doneBtn.click(); // closes dropdown
    // Dropdown is now closed — confirm the trigger label still shows all 3 names
    const triggerLabelAfterClose = await page.locator('button').filter({ hasText: 'Zara-QB' }).first().innerText().catch(() => null);
    await page.locator('#obs_note_text').fill('Group observation — all three explored the sensory bin together, taking turns scooping and pouring rice.');
    await page.getByRole('button', { name: /Log observation for 3 children/ }).click();
    await page.waitForLoadState('networkidle');
    const obsText3 = await page.locator('body').innerText();
    const groupSaveUrl = page.url();
    // Now check each child's filtered view to see if the group obs actually landed for all 3
    const perChildResults = {};
    for (const name of ['Zara-QB', 'Theo-QB', 'Priya-QB']) {
      const cid = await getChildIdByName(name);
      await page.goto(`${BASE}/observations?child=${cid}`, { waitUntil: 'networkidle' });
      const childObsText = await page.locator('body').innerText();
      perChildResults[name] = childObsText.includes('sensory bin');
    }
    log({
      step: 'observation_test_3_child_picker_multiselect_bug_check',
      doneBtnLabelBeforeClose: doneBtnText,
      triggerLabelAfterClose,
      groupSaveUrl,
      perChildResults,
      allThreeSaved: Object.values(perChildResults).every(Boolean),
    });
    await shot(page, 'observations-child-picker-multiselect.png');
  } catch (e) {
    log({ step: 'observations_feature', error: String(e), stack: e.stack });
  }

  // =========================================================================
  // FEATURE: Milestones — /milestones reference page + per-child logging
  // =========================================================================
  try {
    await page.goto(`${BASE}/milestones`, { waitUntil: 'networkidle' });
    const msText = await page.locator('body').innerText();
    const idx = msText.indexOf('Developmental milestones');
    log({ step: 'milestones_reference_page', hasAgeBands: msText.includes('Physical') || msText.includes('physical'), snippet: msText.slice(idx, idx + 500) });
    await shot(page, 'milestones-reference-page.png');

    const milestoneLogs = [
      { child: 'Zara-QB', mode: 'from_list', notes: 'Confidently jumps with two feet together during outdoor play.' },
      { child: 'Theo-QB', mode: 'custom', customText: 'Uses 3-4 word sentences consistently when talking about his truck play', notes: 'Noticed this week during block corner play.' },
      { child: 'Priya-QB', mode: 'from_list', notes: 'Draws recognisable circles and lines, holds pencil in tripod grip.' },
    ];
    for (const m of milestoneLogs) {
      const cid = await getChildIdByName(m.child);
      await page.goto(`${BASE}/children/${cid}`, { waitUntil: 'networkidle' });
      // NOTE: this page nests a <form action={assignChildToRoom}> inside the outer
      // <form action={updateChild}> (invalid HTML) whenever rooms exist — that
      // triggers a React hydration-mismatch error and a full client-side re-render
      // shortly after load. Interacting immediately after goto() can land on a DOM
      // node that gets discarded mid-action, silently dropping the click/fill. A
      // short settle wait avoids that race (see bug report — this is a real app bug).
      await page.waitForTimeout(1000);
      const customBtn = page.getByRole('button', { name: 'Custom milestone' });
      if (m.mode === 'custom' && await customBtn.count()) {
        await customBtn.click();
        await page.locator('input[placeholder="Describe the milestone observed…"]').fill(m.customText);
      } else {
        const select = page.locator('select').filter({ hasText: 'Select a milestone' }).first();
        if (await select.count()) {
          const optionValues = await select.locator('option').evaluateAll(opts => opts.filter(o => o.value).map(o => o.value));
          if (optionValues.length > 0) await select.selectOption(optionValues[Math.floor(optionValues.length / 3)]);
        }
      }
      const notesInput = page.locator('input[placeholder="Notes (optional)"]');
      if (await notesInput.count()) await notesInput.fill(m.notes);
      await page.getByRole('button', { name: 'Add' }).last().click();
      await page.waitForTimeout(1200);
      const afterText = await page.locator('body').innerText();
      log({ step: 'milestone_log', child: m.child, mode: m.mode, savedAt: `${BASE}/children/${cid}`, containsNote: afterText.includes(m.notes) });
    }
    await shot(page, 'child-profile-milestones.png');
  } catch (e) {
    log({ step: 'milestones_feature', error: String(e), stack: e.stack });
  }

  // =========================================================================
  // FEATURE: Transition Statements — manual text (AI generation is down),
  // 3 varied scenarios/children, incl. finalising one.
  // =========================================================================
  try {
    const transitions = [
      {
        child: 'Priya-QB', type: 'to_school',
        text: 'Priya is a confident, curious learner who has grown enormously in her time in our Wombats room. She loves storytime and often retells stories to her peers with expression and detail, showing strong early literacy skills. Priya draws recognisable shapes and holds a pencil with a tripod grip, and she is beginning to write the letters in her name. She forms warm friendships and negotiates turn-taking respectfully. As Priya moves to school, we recommend continuing to nurture her love of stories and providing opportunities for fine motor practice such as drawing and cutting.',
        finalize: true,
      },
      {
        child: 'Theo-QB', type: 'between_rooms',
        text: 'Theo is moving from the Possums room to Wombats. He is highly active and loves trucks and building — he can concentrate for 20+ minutes on a block construction and problem-solves ramp angles independently. Socially he is warming up to group play and benefits from an educator modelling how to invite others in. In Wombats, continuing access to loose parts and construction materials will support his engagement, and small-group turn-taking games would help build his social confidence.',
        finalize: false,
      },
      {
        child: 'Zara-QB', type: 'between_services',
        text: 'Zara is transitioning to a new service as the family relocates. She has settled well with us, enjoys water play and puzzles, and communicates her needs clearly using short sentences. She has a comfort item (a small blanket) she likes at rest time. We recommend the new service allow a settling-in period with a consistent primary educator and keep her comfort item accessible during the first few weeks.',
        finalize: false,
      },
    ];

    for (const t of transitions) {
      const cid = await getChildIdByName(t.child);
      await page.goto(`${BASE}/transitions/edit?child=${cid}&type=${t.type}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      // Confirm "Generate with AI" surfaces the outage gracefully rather than hanging
      if (t === transitions[0]) {
        await page.getByRole('button', { name: /Generate with AI/ }).click();
        await page.waitForTimeout(4000);
        const genErrText = await page.locator('body').innerText();
        log({ step: 'transitions_ai_generate_attempt', gotErrorMessage: genErrText.includes('Generation failed') || genErrText.includes('Network error') });
      }
      await page.locator('textarea[name="draft_text"]').fill(t.text);
      if (t.finalize) {
        await page.getByRole('button', { name: 'Finalise statement' }).click();
      } else {
        await page.getByRole('button', { name: 'Save draft' }).click();
      }
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      const savedText = await page.locator('body').innerText();
      log({
        step: 'transition_saved', child: t.child, type: t.type, finalize: t.finalize,
        url: page.url(),
        persisted: savedText.includes(t.text.slice(0, 40)),
        showsFinalizedLock: t.finalize ? savedText.includes('finalised') || savedText.includes('locked') : null,
      });
    }
    await shot(page, 'transitions-finalized-statement.png');

    await page.goto(`${BASE}/transitions`, { waitUntil: 'networkidle' });
    const listText = await page.locator('body').innerText();
    log({ step: 'transitions_list_page', savedCount: (listText.match(/To school|Room transition|Service transition/g) || []).length });
    await shot(page, 'transitions-list.png');
  } catch (e) {
    log({ step: 'transitions_feature', error: String(e), stack: e.stack });
  }

  // =========================================================================
  // FEATURE: Day Plan — check for 2-3 different dates
  // =========================================================================
  try {
    const dates = ['2026-08-17', '2026-08-18', '2026-08-24']; // today, tomorrow, a Monday
    for (const d of dates) {
      await page.goto(`${BASE}/day-plan?date=${d}`, { waitUntil: 'networkidle' });
      const t = await page.locator('body').innerText();
      const idx = t.indexOf('Day Plan');
      log({
        step: 'day_plan_check', date: d, url: page.url(),
        rosterMentionsQBChild: t.includes('QB') || t.includes('Zara') || t.includes('Theo') || t.includes('Priya'),
        snippet: t.slice(idx, idx + 400),
      });
    }
    await shot(page, 'day-plan.png');
  } catch (e) {
    log({ step: 'day_plan_feature', error: String(e), stack: e.stack });
  }

  // =========================================================================
  // FEATURE: Follow-ups — add notes for a few children, mark one done
  // =========================================================================
  try {
    const followUpNotes = [
      { child: 'Zara-QB', note: 'Wants to explore mixing more colours — try secondary colour experiments at the easel this week.' },
      { child: 'Theo-QB', note: 'Interested in ramps and speed — set up a ramp + toy car provocation with different surface textures.' },
      { child: 'Priya-QB', note: 'Ready for more complex stories — introduce a longer chapter-style picture book at group time.' },
    ];
    for (const f of followUpNotes) {
      await page.goto(`${BASE}/follow-ups`, { waitUntil: 'networkidle' });
      await page.getByText('Add a follow-up note').click();
      const childSelect = page.locator('form').filter({ hasText: 'Follow-up note' }).locator('select[name="child_id"]');
      await childSelect.selectOption({ label: f.child });
      await page.locator('textarea[name="note"]').fill(f.note);
      await page.getByRole('button', { name: 'Save follow-up' }).click();
      await page.waitForLoadState('networkidle');
    }
    await page.goto(`${BASE}/follow-ups`, { waitUntil: 'networkidle' });
    const fuText = await page.locator('body').innerText();
    const allPresent = followUpNotes.every((f) => fuText.includes(f.note.slice(0, 30)));
    log({ step: 'follow_ups_added', allPresent, url: `${BASE}/follow-ups` });
    await shot(page, 'follow-ups-list.png');

    // Mark the first one done, confirm it moves to Done section
    const firstCard = page.locator('div').filter({ hasText: followUpNotes[0].note.slice(0, 30) }).last();
    const markDoneBtn = page.getByRole('button', { name: 'Mark done' }).first();
    if (await markDoneBtn.count()) {
      await markDoneBtn.click();
      await page.waitForLoadState('networkidle');
      const afterDoneText = await page.locator('body').innerText();
      log({ step: 'follow_up_mark_done', movedToDone: afterDoneText.includes('Done (') });
    }
  } catch (e) {
    log({ step: 'follow_ups_feature', error: String(e), stack: e.stack });
  }

  // =========================================================================
  // FEATURE: Daily Digest — check for 2-3 different dates
  // =========================================================================
  try {
    const dates = ['2026-08-17', '2026-08-16', '2026-08-10'];
    for (const d of dates) {
      await page.goto(`${BASE}/digest?date=${d}`, { waitUntil: 'networkidle' });
      const t = await page.locator('body').innerText();
      const idx = t.indexOf('Daily Digest');
      log({ step: 'digest_check', date: d, url: page.url(), snippet: t.slice(idx, idx + 350) });
    }
    await shot(page, 'daily-digest.png');
  } catch (e) {
    log({ step: 'digest_feature', error: String(e), stack: e.stack });
  }

  // =========================================================================
  // FEATURE: Shift Handover — write 2-3 notes, acknowledge
  // =========================================================================
  try {
    const notes = [
      {
        shift_date: '2026-08-17', shift_type: 'morning',
        general_notes: 'Quiet morning, sensory bin was the big hit again. Overcast so we stayed indoors till 10.',
        children_notes: 'Zara-QB napped early, Theo-QB skipped morning tea (not hungry, drank water fine).',
        medication_summary: 'None given this shift.',
        incidents_summary: 'None.',
        outstanding_tasks: 'Follow up with Priya-QB family re: excursion permission slip.',
      },
      {
        shift_date: '2026-08-17', shift_type: 'afternoon',
        general_notes: 'Warm afternoon, outdoor water play ran long — everyone needed a full change of clothes after.',
        children_notes: 'All three QB children present and settled well after lunch.',
        medication_summary: 'None given this shift.',
        incidents_summary: 'Small bump — Theo-QB bumped knee on the trike, ice pack applied, settled within 5 min, no mark.',
        outstanding_tasks: 'Restock paper towel in bathroom.',
      },
    ];
    for (const n of notes) {
      await page.goto(`${BASE}/handover`, { waitUntil: 'networkidle' });
      await page.locator('input[name="shift_date"]').fill(n.shift_date);
      await page.locator('select[name="shift_type"]').selectOption(n.shift_type);
      await page.locator('textarea[name="general_notes"]').fill(n.general_notes);
      await page.locator('textarea[name="children_notes"]').fill(n.children_notes);
      await page.locator('textarea[name="medication_summary"]').fill(n.medication_summary);
      await page.locator('textarea[name="incidents_summary"]').fill(n.incidents_summary);
      await page.locator('textarea[name="outstanding_tasks"]').fill(n.outstanding_tasks);
      await page.getByRole('button', { name: 'Save handover note' }).click();
      await page.waitForLoadState('networkidle');
    }
    await page.goto(`${BASE}/handover`, { waitUntil: 'networkidle' });
    const hText = await page.locator('body').innerText();
    log({ step: 'handover_notes_written', bothPresent: notes.every((n) => hText.includes(n.general_notes.slice(0, 25))), url: `${BASE}/handover` });
    await shot(page, 'handover-before-ack.png');

    // Acknowledge the outgoing notes (incoming shift side)
    const ackButtons = page.getByRole('button', { name: 'Acknowledge' });
    const ackCount = await ackButtons.count();
    let acked = 0;
    for (let i = 0; i < Math.min(ackCount, 2); i++) {
      await page.getByRole('button', { name: 'Acknowledge' }).first().click();
      await page.waitForLoadState('networkidle');
      acked++;
    }
    const afterAckText = await page.locator('body').innerText();
    log({ step: 'handover_acknowledged', ackCount, acked, acknowledgedByCount: (afterAckText.match(/Acknowledged by/g) || []).length });
    await shot(page, 'handover-after-ack.png');
  } catch (e) {
    log({ step: 'handover_feature', error: String(e), stack: e.stack });
  }

  await browser.close();
})().catch((e) => {
  log({ step: 'FATAL', error: String(e) });
  process.exit(1);
});
