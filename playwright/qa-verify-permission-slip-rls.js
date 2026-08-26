const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: path.join(__dirname, '.auth', 'qa-group-c.json'), viewport: { width: 1400, height: 1000 } });
  const page = await context.newPage();
  await page.goto('http://localhost:3000/permission-slips', { waitUntil: 'networkidle' });

  await page.locator('select').first().selectOption({ label: 'Excursion consent' }).catch(() => {});
  await page.locator('input[placeholder*="Botanic Gardens"]').fill('QA RLS-repro excursion — Test Zoo Visit');
  await page.locator('textarea').first().fill('Consenting to a walking excursion to the local park for water play activities.');
  const firstCheckbox = page.locator('input[type="checkbox"]').first();
  await firstCheckbox.check();
  await page.getByRole('button', { name: 'Send for signature' }).click();
  await page.waitForTimeout(2500);
  const afterSendText = await page.locator('body').innerText();
  console.log('AFTER_SEND_HAS_RECURSION:', afterSendText.includes('infinite recursion detected in policy'));
  console.log('AFTER_SEND_SNIPPET:', afterSendText.slice(afterSendText.indexOf('Permission slips'), afterSendText.indexOf('Permission slips') + 500));
  await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'qa-2026-08-18', 'group-c', 'screenshots', 'permission-slips-after-send.png'), fullPage: true });

  // Reload the page fresh (new navigation) — this is closer to how the original bug was hit
  await page.goto('http://localhost:3000/permission-slips', { waitUntil: 'networkidle' });
  const reloadText = await page.locator('body').innerText();
  console.log('RELOAD_HAS_RECURSION:', reloadText.includes('infinite recursion detected in policy'));
  console.log('RELOAD_SNIPPET:', reloadText.slice(reloadText.indexOf('Permission slips'), reloadText.indexOf('Permission slips') + 500));
  await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'qa-2026-08-18', 'group-c', 'screenshots', 'permission-slips-after-reload.png'), fullPage: true });

  await browser.close();
})();
