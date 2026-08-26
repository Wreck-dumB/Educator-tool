const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: path.join(__dirname, 'qa-group-b-auth.json'), viewport: { width: 1400, height: 1000 } });
  const page = await context.newPage();
  await page.goto('http://localhost:3000/programs', { waitUntil: 'networkidle' });
  const bodyText = await page.locator('body').innerText();
  console.log('PAGE_TEXT_START');
  console.log(bodyText);
  console.log('PAGE_TEXT_END');
  const links = await page.locator("a[href^='/programs/']").all();
  for (const l of links) {
    console.log('LINK:', await l.getAttribute('href'), '|', (await l.innerText()).slice(0, 60).replace(/\n/g, ' '));
  }
  await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'qa-2026-08-18', 'group-b', 'screenshots', 'programs-list-verify.png'), fullPage: true });
  await browser.close();
})();
