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

  // Recipes
  await page.goto('http://localhost:3000/recipes', { waitUntil: 'networkidle' });
  await page.locator('textarea').first().fill('A simple morning tea for toddlers, nut-free');
  await page.getByRole('button', { name: /Generate|Suggest/i }).first().click();
  await page.waitForFunction(() => !document.body.innerText.includes('Generating') && !document.body.innerText.includes('Thinking'), { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1000);
  console.log('RECIPES_TEXT_SNIPPET:', (await page.locator('body').innerText()).slice(0, 300).replace(/\n+/g, ' | '));

  // Safe Work Procedures
  await page.goto('http://localhost:3000/safe-work-procedures', { waitUntil: 'networkidle' });
  const inputs = page.locator('input[type="text"], textarea');
  await inputs.nth(0).fill('Cleaning the sandpit');
  await inputs.nth(1).fill('Weekly raking and sanitising of the outdoor sandpit');
  await page.getByRole('button', { name: /Generate|Propose/i }).first().click();
  await page.waitForTimeout(15000);
  console.log('SWP_HAS_ERROR:', (await page.locator('body').innerText()).includes('Something went wrong'));

  console.log('PAGE_ERRORS:', JSON.stringify(errors));
  await browser.close();
})();
