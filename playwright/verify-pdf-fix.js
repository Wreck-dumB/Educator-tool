const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await context.newPage();

  await page.goto('http://localhost:3000/login');
  await page.locator('#email').fill('krondor2024+qa-director-a@gmail.com');
  await page.locator('#password').fill('QaTest-Dl9_guGihFa1');
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL('**/generate', { timeout: 15000 });

  await page.goto('http://localhost:3000/import', { waitUntil: 'networkidle' });
  const pdfPath = path.join(__dirname, '..', 'pitch', 'DR-SparkPlay-Pitch.pdf');
  await page.locator('input[type="file"]').setInputFiles(pdfPath);
  await page.getByRole('button', { name: /Review with AI/ }).click();
  await page.waitForTimeout(1000);
  // Wait for either the result or an error, up to 60s
  await page.waitForFunction(
    () => {
      const t = document.body.innerText;
      return t.includes('Could not read the file content') || t.includes('quality') || t.includes('gap') || t.includes('recommendation') || t.includes('Score');
    },
    { timeout: 60000 },
  ).catch(() => {});

  const text = await page.locator('body').innerText();
  console.log('HAS_OLD_ERROR:', text.includes('Could not read the file content'));
  await page.screenshot({ path: path.join(__dirname, 'verify-pdf-fix-result.png'), fullPage: true });
  console.log('SNIPPET:', text.slice(0, 600));

  await browser.close();
})();
