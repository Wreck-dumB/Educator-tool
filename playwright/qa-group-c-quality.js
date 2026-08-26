// QA Group C — Compliance & Policies — AI quality re-test, run AFTER the
// coordinator fixed the missing SUPABASE_SERVICE_ROLE_KEY that was blocking
// all AI generation app-wide. Covers: Policies, Document Templates (Forms),
// Safe Work Procedures, QIP generator, Reflections, Risk Assessment (from a
// saved activity), plus a live re-check of the permission-slips RLS
// recursion bug and the behaviour-support/new stale-chunk error.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';
const AUTH_FILE = path.join(__dirname, '.auth', 'qa-group-c.json');
const SHOT_DIR = path.join(__dirname, '..', 'docs', 'qa-2026-08-18', 'group-c', 'screenshots');
const RESULTS_FILE = path.join(__dirname, 'results-group-c-quality.jsonl');
const EMAIL = 'krondor2024+qa-director-a@gmail.com';
const PASSWORD = 'QaTest-Dl9_guGihFa1';

fs.mkdirSync(SHOT_DIR, { recursive: true });
if (fs.existsSync(RESULTS_FILE)) fs.unlinkSync(RESULTS_FILE);

function log(obj) {
  const line = JSON.stringify(obj);
  console.log('RESULT::' + line);
  fs.appendFileSync(RESULTS_FILE, line + '\n');
}
async function shot(page, name) {
  await page.screenshot({ path: path.join(SHOT_DIR, name), fullPage: true });
}

(async () => {
  const browser = await chromium.launch();
  const context = fs.existsSync(AUTH_FILE)
    ? await browser.newContext({ storageState: AUTH_FILE, viewport: { width: 1400, height: 1000 } })
    : await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await context.newPage();
  page.on('pageerror', (err) => log({ type: 'pageerror', msg: String(err).slice(0, 500) }));

  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
  if (page.url().includes('/login')) {
    await page.goto(`${BASE}/login`);
    await page.locator('#email').fill(EMAIL);
    await page.locator('#password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL('**/generate', { timeout: 20000 });
    await context.storageState({ path: AUTH_FILE });
  }
  log({ step: 'login', url: page.url() });

  // ============================= Policies (AI) =============================
  try {
    await page.goto(`${BASE}/policies`, { waitUntil: 'networkidle' });
    await page.locator('#category').fill('Sun protection');
    await page.locator('#user_input').fill(
      'We are a 60-place centre. Children wear hats and sunscreen is applied by educators before outdoor play, reapplied every 2 hours. Outdoor play avoided 11am-3pm in summer.'
    );
    await page.getByRole('button', { name: 'Draft policy' }).click();
    const result = await Promise.race([
      page.waitForSelector('button:has-text("Save policy draft")', { timeout: 60000 }).then(() => 'draft'),
      page.waitForSelector('text=Could not reach the server', { timeout: 60000 }).then(() => 'error'),
    ]).catch(() => 'timeout');
    const bodyText = await page.locator('div.rounded-2xl.border.border-coral-light').first().innerText();
    log({ step: 'policy_generate', result, fullContent: bodyText.slice(0, 3000) });
    if (result === 'draft') {
      await page.getByRole('button', { name: 'Save policy draft' }).click();
      await page.waitForTimeout(1500);
      const afterSave = await page.locator('body').innerText();
      log({ step: 'policy_save', savedConfirmed: afterSave.includes('Saved') });
    }
    await shot(page, 'policies-quality.png');
  } catch (e) {
    log({ step: 'policy_generate', error: String(e).slice(0, 500) });
  }

  // ========================= Document Templates (Forms AI) =================
  try {
    await page.goto(`${BASE}/forms`, { waitUntil: 'networkidle' });
    await page.locator('#form_category').fill('Excursion permission slip');
    await page.locator('#form_user_input').fill(
      "We're taking the 3-5 room to the local library on the 14th, walking, returning by lunchtime. Need parent consent and an emergency contact number on the day."
    );
    await page.getByRole('button', { name: 'Draft form' }).click();
    const result = await Promise.race([
      page.waitForSelector('button:has-text("Save form template")', { timeout: 60000 }).then(() => 'draft'),
      page.waitForSelector('text=Could not reach the server', { timeout: 60000 }).then(() => 'error'),
    ]).catch(() => 'timeout');
    const bodyText = await page.locator('div.rounded-2xl.border.border-coral-light').first().innerText();
    log({ step: 'form_generate', result, fullContent: bodyText.slice(0, 3000) });
    if (result === 'draft') {
      await page.getByRole('button', { name: 'Save form template' }).click();
      await page.waitForTimeout(1500);
      const afterSave = await page.locator('body').innerText();
      log({ step: 'form_save', savedConfirmed: afterSave.includes('Saved') });
    }
    await shot(page, 'forms-quality.png');
  } catch (e) {
    log({ step: 'form_generate', error: String(e).slice(0, 500) });
  }

  // ======================= Safe Work Procedures (AI) =======================
  try {
    await page.goto(`${BASE}/safe-work-procedures`, { waitUntil: 'networkidle' });
    await page.locator('#task_title').fill('Sanitising toys with bleach solution');
    await page.locator('#task_description').fill(
      'Educator mixes bleach and water in the laundry sink at the end of the day, soaks toys, rinses and air-dries them on the rack.'
    );
    await page.getByRole('button', { name: 'Generate baseline safe work procedure' }).click();
    const result = await Promise.race([
      page.waitForSelector('button:has-text("Save safe work procedure")', { timeout: 60000 }).then(() => 'draft'),
      page.waitForSelector('text=Could not reach the server', { timeout: 60000 }).then(() => 'error'),
    ]).catch(() => 'timeout');
    const bodyText = await page.locator('div.rounded-2xl.border.border-coral-light').first().innerText();
    log({ step: 'safe_work_generate', result, fullContent: bodyText.slice(0, 3000) });
    if (result === 'draft') {
      await page.getByRole('button', { name: 'Save safe work procedure' }).click();
      await page.waitForTimeout(1500);
      const afterSave = await page.locator('body').innerText();
      log({ step: 'safe_work_save', savedConfirmed: afterSave.includes('Saved') });
    }
    await shot(page, 'safe-work-procedures-quality.png');
  } catch (e) {
    log({ step: 'safe_work_generate', error: String(e).slice(0, 500) });
  }

  // ================================ QIP (AI) ================================
  try {
    await page.goto(`${BASE}/qip`, { waitUntil: 'networkidle' });
    await page.locator('#qip_input').fill(
      "We have a strong outdoor program but our sun protection policy isn't consistently followed by relief staff. Educators document learning stories weekly but rarely link them back to families' own goals for their child."
    );
    await page.getByRole('button', { name: 'Generate QIP items' }).click();
    const result = await Promise.race([
      page.waitForSelector('button:has-text("Add")', { timeout: 60000 }).then(() => 'draft'),
      page.waitForSelector('text=Could not reach the server', { timeout: 60000 }).then(() => 'error'),
    ]).catch(() => 'timeout');
    const bodyText = await page.locator('div.rounded-2xl.border.border-coral-light').first().innerText();
    log({ step: 'qip_generate', result, fullContent: bodyText.slice(0, 3000) });
    if (result === 'draft') {
      await page.getByRole('button', { name: /^Add \d+ to plan$/ }).click();
      await page.waitForTimeout(1500);
      log({ step: 'qip_save', clicked: true });
    }
    await shot(page, 'qip-quality.png');
  } catch (e) {
    log({ step: 'qip_generate', error: String(e).slice(0, 500) });
  }

  // ============================= Reflections (AI) ===========================
  try {
    await page.goto(`${BASE}/reflections`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Post-incident' }).click();
    await page.locator('textarea').first().fill(
      'During outdoor play, a child became very upset when another child took their ball. I intervened but the situation escalated before it calmed down.'
    );
    await page.getByRole('button', { name: 'Get reflection questions' }).click();
    const result = await Promise.race([
      page.waitForSelector('button:has-text("Save reflection")', { timeout: 60000 }).then(() => 'questions'),
      page.waitForSelector('text=Failed to generate questions', { timeout: 60000 }).then(() => 'error'),
      page.waitForSelector('text=Network error', { timeout: 60000 }).then(() => 'error'),
    ]).catch(() => 'timeout');
    const bodyText = await page.locator('body').innerText();
    log({ step: 'reflection_generate', result, snippet: bodyText.slice(bodyText.indexOf('New reflection'), bodyText.indexOf('New reflection') + 2000) });
    if (result === 'questions') {
      const textareas = page.locator('textarea');
      const count = await textareas.count();
      for (let i = 1; i < count; i++) {
        await textareas.nth(i).fill('I stayed calm, used a quiet voice, and redirected both children to a shared activity once they settled.');
      }
      await page.getByRole('button', { name: 'Save reflection' }).click();
      await page.waitForTimeout(1500);
      const afterSave = await page.locator('body').innerText();
      log({ step: 'reflection_save', savedConfirmed: afterSave.includes('Reflection saved') });
    }
    await shot(page, 'reflections-quality.png');
  } catch (e) {
    log({ step: 'reflection_generate', error: String(e).slice(0, 500) });
  }

  // ========================= Risk Assessment (from activity) ================
  try {
    await page.goto(`${BASE}/activities`, { waitUntil: 'networkidle' });
    const firstActivityLink = page.locator("a[href^='/activities/']").first();
    if (await firstActivityLink.count() === 0) {
      log({ step: 'risk_assessment_generate', result: 'skipped', reason: 'no saved activities available to generate a risk assessment from' });
    } else {
      const href = await firstActivityLink.getAttribute('href');
      await page.goto(`${BASE}${href}`, { waitUntil: 'networkidle' });
      const genBtn = page.getByRole('button', { name: 'Generate baseline risk assessment' });
      if (await genBtn.count() === 0) {
        log({ step: 'risk_assessment_generate', result: 'skipped', reason: 'no generate button found on activity page', activityUrl: BASE + href });
      } else {
        await genBtn.click();
        const result = await Promise.race([
          page.waitForSelector('button:has-text("Save risk assessment")', { timeout: 60000 }).then(() => 'draft'),
          page.waitForSelector('text=Could not reach the server', { timeout: 60000 }).then(() => 'error'),
        ]).catch(() => 'timeout');
        const bodyText = await page.locator('div.mt-6.rounded-2xl.border.border-coral-light').first().innerText();
        log({ step: 'risk_assessment_generate', result, activityUrl: BASE + href, fullContent: bodyText.slice(0, 3000) });
        if (result === 'draft') {
          await page.getByRole('button', { name: 'Save risk assessment' }).click();
          await page.waitForTimeout(1500);
          const afterSave = await page.locator('body').innerText();
          log({ step: 'risk_assessment_save', savedConfirmed: afterSave.includes('Saved') });
        }
        await shot(page, 'risk-assessment-quality.png');
      }
    }
  } catch (e) {
    log({ step: 'risk_assessment_generate', error: String(e).slice(0, 500) });
  }

  // =============== Permission Slips RLS recursion — live re-check ===========
  try {
    await page.goto(`${BASE}/permission-slips`, { waitUntil: 'networkidle' });
    const bodyText = await page.locator('body').innerText();
    const hasRecursionError = bodyText.includes('infinite recursion detected in policy');
    log({ step: 'permission_slips_rls_recheck', hasRecursionError, snippet: bodyText.slice(0, 400) });
    await shot(page, 'permission-slips-rls-recheck.png');
  } catch (e) {
    log({ step: 'permission_slips_rls_recheck', error: String(e).slice(0, 500) });
  }

  // ============ Behaviour Support new page — stale-chunk re-check ===========
  try {
    await page.goto(`${BASE}/behaviour-support/new`, { waitUntil: 'networkidle' });
    const bodyText = await page.locator('body').innerText();
    const hasModuleFactoryError = bodyText.includes('module factory is not available') || bodyText.includes('Switched to client rendering');
    log({ step: 'behaviour_support_new_recheck', hasModuleFactoryError, url: page.url() });
    await shot(page, 'behaviour-support-new-recheck.png');
  } catch (e) {
    log({ step: 'behaviour_support_new_recheck', error: String(e).slice(0, 500) });
  }

  await browser.close();
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
