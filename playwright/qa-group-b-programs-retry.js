// Follow-up QA script for DR. SparkPlay - Group B - Programs feature, run AFTER
// the coordinator fixed the missing SUPABASE_SERVICE_ROLE_KEY that was blocking
// all AI generation. This creates the 3 programs, does the full block-editor
// workflow (move/reorder/rename/publish) on one, verifies the calendar view,
// and tests the /today room-guide + logs an observation from it.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';
const SHOT_DIR = 'D:\\Projects\\sparkplay\\docs\\qa-2026-08-18\\group-b\\screenshots';
const RESULTS_FILE = path.join(__dirname, 'results-programs.jsonl');

function log(obj) {
  const line = JSON.stringify(obj);
  console.log(line);
  fs.appendFileSync(RESULTS_FILE, line + '\n');
}
async function shot(page, name) {
  await page.screenshot({ path: path.join(SHOT_DIR, name), fullPage: true });
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 }, storageState: 'playwright/qa-group-b-auth.json' });
  const page = await context.newPage();
  page.on('pageerror', (err) => log({ type: 'pageerror', msg: String(err) }));

  // sanity: confirm logged in
  await page.goto(`${BASE}/programs`, { waitUntil: 'networkidle' });
  if (page.url().includes('/login')) {
    await page.locator('#email').fill('krondor2024+qa-director-a@gmail.com');
    await page.locator('#password').fill('QaTest-Dl9_guGihFa1');
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL('**/generate', { timeout: 20000 });
    await context.storageState({ path: 'playwright/qa-group-b-auth.json' });
    await page.goto(`${BASE}/programs`, { waitUntil: 'networkidle' });
  }
  log({ step: 'sanity_login', url: page.url() });

  async function createProgram({ title, room, startDate, endDate, notes }) {
    await page.goto(`${BASE}/programs`, { waitUntil: 'networkidle' });
    await page.locator('#program_title').fill(title);
    if (room) {
      const roomSelect = page.locator('#room_id');
      if (await roomSelect.count()) await roomSelect.selectOption({ label: room }).catch(() => log({ step: 'room_select_failed', room }));
    }
    await page.locator('#start_date').fill(startDate);
    await page.locator('#end_date').fill(endDate);
    if (notes) await page.locator('#educator_notes').fill(notes);
    const t0 = Date.now();
    await page.getByRole('button', { name: 'Draft program' }).click();
    await page.getByRole('button', { name: 'Save program' }).waitFor({ state: 'visible', timeout: 150000 });
    log({ step: 'draft_generated', title, ms: Date.now() - t0 });
    await page.getByRole('button', { name: 'Save program' }).click();
    await page.waitForTimeout(1500);
    await page.waitForLoadState('networkidle');
    const link = page.locator(`a:has-text("${title}")`).first();
    let href = null;
    if (await link.count()) href = await link.getAttribute('href');
    log({ step: 'create_program_result', title, saved: !!href, href });
    return href;
  }

  try {
  const hrefs = {};
  hrefs.p1 = await createProgram({
    title: 'Possums Week — Under the Sea (QB Test 1)',
    room: 'Possums Room (2-3yo)',
    startDate: '2026-08-24',
    endDate: '2026-08-28',
    notes: 'Focus on water play and ocean creatures; we have a new enrolment settling in this week.',
  });
  hrefs.p2 = await createProgram({
    title: 'Wombats Week — Bush Adventures (QB Test 2)',
    room: 'Wombats Room (3-5yo)',
    startDate: '2026-08-31',
    endDate: '2026-09-04',
    notes: 'Outdoor-heavy program, native plants and animals, National Wattle Day falls in this range.',
  });
  hrefs.p3 = await createProgram({
    title: 'All Rooms — Spring Sensory Week (QB Test 3)',
    room: '',
    startDate: '2026-09-07',
    endDate: '2026-09-11',
    notes: 'Sensory play focus, low-prep activities for a short-staffed week.',
  });
  log({ step: 'all_programs_created', hrefs });

  await shot(page, 'programs-list-with-3-programs.png');

  // =========================================================================
  // Full block-editor workflow on Program 1: move entry between blocks,
  // reorder, rename a block, then Publish, then verify calendar + today.
  // =========================================================================
  try {
    await page.goto(`${BASE}${hrefs.p1}`, { waitUntil: 'networkidle' });
    await shot(page, 'program-editor-before-edits.png');

    const bodyText0 = await page.locator('body').innerText();
    log({ step: 'program_editor_loaded', hasBlocksTable: bodyText0.includes('Block of the day'), entryCount: (bodyText0.match(/Unsorted/g) || []).length });

    // Rename first named block (e.g. "Arrival" -> "Arrival & Welcome")
    const blockLabelInputs = page.locator('table input[type="text"], table input:not([type])');
    // The block-rename inputs are plain text inputs inside the block-label column
    const firstBlockInput = page.locator('tbody tr').nth(1).locator('input').first();
    const originalLabel = await firstBlockInput.inputValue();
    const newLabel = originalLabel + ' & Welcome';
    await firstBlockInput.fill(newLabel);
    await firstBlockInput.blur();
    await page.waitForTimeout(1000);
    log({ step: 'block_rename', from: originalLabel, to: newLabel });

    // Find an entry's block-assignment <select> in the "Unsorted" row or first
    // populated cell, and move it to a different block via the dropdown.
    const entrySelects = page.locator('td select');
    const entrySelectCount = await entrySelects.count();
    log({ step: 'entry_select_count', count: entrySelectCount });
    if (entrySelectCount > 0) {
      const targetSelect = entrySelects.first();
      const options = await targetSelect.locator('option').allTextContents();
      const beforeValue = await targetSelect.inputValue();
      // pick a different option than current
      const optValues = await targetSelect.locator('option').evaluateAll(opts => opts.map(o => o.value));
      const currentIdx = optValues.indexOf(beforeValue);
      const newIdx = (currentIdx + 1) % optValues.length;
      await targetSelect.selectOption(optValues[newIdx]);
      await page.waitForTimeout(1000);
      log({ step: 'entry_moved_between_blocks', options, beforeValue, afterValue: optValues[newIdx] });
    }

    // Reorder: click an up/down arrow on an entry, if any block has 2+ entries
    const upButtons = page.locator('button[title="Move up"]:not([disabled])');
    const upCount = await upButtons.count();
    log({ step: 'reorder_up_buttons_available', count: upCount });
    if (upCount > 0) {
      await upButtons.first().click();
      await page.waitForTimeout(1000);
      log({ step: 'entry_reordered', ok: true });
    }

    await shot(page, 'program-editor-after-edits.png');

    // Publish
    const publishBtn = page.getByRole('button', { name: 'Publish' });
    await publishBtn.click();
    await page.waitForTimeout(1500);
    const afterPublishText = await page.locator('body').innerText();
    log({ step: 'publish_clicked', showsPublished: afterPublishText.includes('Published') });
    await shot(page, 'program-editor-published.png');

    // Verify calendar view — should NOT show stale DRAFT banner
    const calendarUrl = `${BASE}${hrefs.p1}/calendar`;
    await page.goto(calendarUrl, { waitUntil: 'networkidle' });
    const calText = await page.locator('body').innerText();
    log({
      step: 'calendar_view_after_publish',
      url: calendarUrl,
      hasDraftBanner: calText.includes('DRAFT') || calText.toLowerCase().includes('not yet published'),
      hasRenamedBlock: calText.includes(newLabel),
      snippetStart: calText.slice(0, 300),
    });
    await shot(page, 'programs-calendar-published-A3.png');

    // =========================================================================
    // Today room-guide view: expand an activity, log an observation from it
    // =========================================================================
    const todayUrl = `${BASE}${hrefs.p1}/today`;
    await page.goto(todayUrl, { waitUntil: 'networkidle' });
    await shot(page, 'program-today-room-guide.png');
    const todayText = await page.locator('body').innerText();
    log({ step: 'today_view_loaded', url: todayUrl, hasActivities: !todayText.includes('Nothing planned'), snippet: todayText.slice(0, 400) });

    // Expand the first activity <details>
    const firstDetails = page.locator('details').first();
    if (await firstDetails.count()) {
      await firstDetails.locator('summary').click();
      await page.waitForTimeout(500);
      // Expand "Log an observation for this activity"
      const obsToggle = page.locator('summary:has-text("Log an observation for this activity")').first();
      if (await obsToggle.count()) {
        await obsToggle.click();
        await page.waitForTimeout(500);
        await page.getByRole('button', { name: 'Select children…' }).click();
        await page.locator('label').filter({ has: page.locator('input[type="checkbox"]') }).filter({ hasText: 'Zara-QB' }).click();
        await page.getByRole('button', { name: /^Done/ }).click();
        const noteBox = page.locator('#obs_note_text');
        await noteBox.fill('Logged directly from the Today room-guide view during Under the Sea week — Zara explored the water table activity independently for 10 minutes.');
        await page.getByRole('button', { name: /Log observation/ }).click();
        await page.waitForLoadState('networkidle');
        const afterObsText = await page.locator('body').innerText();
        log({
          step: 'today_observation_logged',
          url: page.url(),
          confirmedOnPage: afterObsText.includes('Logged directly from the Today room-guide'),
        });
        await shot(page, 'program-today-observation-logged.png');
      } else {
        log({ step: 'today_observation_logged', error: 'no "Log an observation" toggle found — activity may have no linked entry.eylf_codes/children' });
      }
    }

    // Now verify that observation is actually tagged to the program entry —
    // check it shows up on /observations with an activity/program link
    await page.goto(`${BASE}/observations`, { waitUntil: 'networkidle' });
    const obsListText = await page.locator('body').innerText();
    const idx = obsListText.indexOf('Logged directly from the Today room-guide');
    log({
      step: 'today_observation_verify_on_observations_page',
      found: idx !== -1,
      taggedSnippet: idx !== -1 ? obsListText.slice(Math.max(0, idx - 150), idx + 50) : null,
    });
  } catch (e) {
    log({ step: 'program_editor_workflow_error', error: String(e), stack: e.stack });
    await shot(page, 'program-editor-error-state.png').catch(() => {});
  }
  } catch (e) {
    log({ step: 'programs_creation_error', error: String(e), stack: e.stack });
  } finally {
    await browser.close().catch(() => {});
  }
})().catch((e) => {
  log({ step: 'FATAL', error: String(e), stack: e.stack });
  process.exit(1);
});
