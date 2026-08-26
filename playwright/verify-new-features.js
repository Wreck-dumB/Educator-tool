const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('http://localhost:3000/login');
  await page.locator('#email').fill('krondor2024+qa-director-a@gmail.com');
  await page.locator('#password').fill('QaTest-Dl9_guGihFa1');
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL('**/generate', { timeout: 15000 });

  // Settings page — check consent section + export button render
  await page.goto('http://localhost:3000/settings', { waitUntil: 'networkidle' });
  const settingsText = await page.locator('body').innerText();
  console.log('HAS_EXPORT_BUTTON:', settingsText.includes('Export all my data'));
  console.log('HAS_CONSENT_SECTION:', settingsText.includes('photo/media consent') || settingsText.includes('media consent'));
  await page.screenshot({ path: 'playwright/verify-settings.png', fullPage: true });

  // Data export — actually download it
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 20000 }),
    page.getByRole('link', { name: 'Export all my data' }).click(),
  ]);
  const exportPath = await download.path();
  const fs = require('fs');
  const content = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));
  console.log('EXPORT_TABLE_COUNT:', Object.keys(content.tables).length);
  console.log('EXPORT_HAS_CHILDREN:', Array.isArray(content.tables.children), content.tables.children?.length ?? 0);
  console.log('EXPORT_ERRORS:', JSON.stringify(content.tableErrors ?? 'none'));

  console.log('PAGE_ERRORS:', JSON.stringify(errors));
  await browser.close();
})();
