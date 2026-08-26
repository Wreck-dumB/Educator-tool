const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: path.join(__dirname, 'qa-group-b-auth.json'), viewport: { width: 1400, height: 1000 } });
  const page = await context.newPage();
  const url = 'http://localhost:3000/programs/dbf4a3b6-b209-4831-925f-603456b34549';
  await page.goto(url, { waitUntil: 'networkidle' });
  const bodyText = await page.locator('body').innerText();
  console.log('PROGRAM_DETAIL_START');
  console.log(bodyText.slice(bodyText.indexOf('Possums Week'), bodyText.indexOf('Possums Week') + 4000));
  console.log('PROGRAM_DETAIL_END');
  await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'qa-2026-08-18', 'group-b', 'screenshots', 'program-detail-quality.png'), fullPage: true });

  // Try publish
  const publishBtn = page.getByRole('button', { name: 'Publish' });
  if (await publishBtn.count()) {
    await publishBtn.click();
    await page.waitForTimeout(1500);
    const afterPublish = await page.locator('body').innerText();
    console.log('PUBLISH_RESULT:', afterPublish.includes('Published'));
  }

  await page.goto(url + '/calendar', { waitUntil: 'networkidle' });
  const calText = await page.locator('body').innerText();
  console.log('CALENDAR_OK:', !calText.includes('error'), calText.slice(0, 300));
  await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'qa-2026-08-18', 'group-b', 'screenshots', 'program-calendar-verify.png'), fullPage: true });

  await page.goto(url + '/today', { waitUntil: 'networkidle' });
  const todayText = await page.locator('body').innerText();
  console.log('TODAY_OK:', todayText.slice(0, 400));
  await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'qa-2026-08-18', 'group-b', 'screenshots', 'program-today-verify.png'), fullPage: true });

  await browser.close();
})();
