/**
 * Follow-up verification + gap-filling pass for QA Group D.
 * Reuses the saved session from the main script, re-checks every FAIL from
 * the first run against live app state, and fills genuine gaps directly.
 * Outputs a JSON summary to qa-verify-results.json for the report rewrite.
 */
const { chromium } = require("playwright");
const fs = require("fs");

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const STATE = "d:\\Projects\\sparkplay\\playwright\\.auth\\qa-group-d.json";
const OUT = "d:\\Projects\\sparkplay\\playwright\\tests\\qa-verify-results.json";

const out = {};

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: STATE, viewport: { width: 1400, height: 1000 } });
  const page = await context.newPage();

  // Re-confirm still logged in
  await page.goto(`${BASE_URL}/dashboard`);
  out.loggedIn = page.url().includes("/dashboard");

  // ── Children: confirm Ben/Cleo actually exist, and duplicate count ──
  await page.goto(`${BASE_URL}/children`);
  let bodyText = await page.locator("body").innerText();
  out.children = {
    ava: bodyText.includes("QaChild Ava"),
    ben: bodyText.includes("QaChild Ben"),
    cleo: bodyText.includes("QaChild Cleo"),
    dupCheckCount: (bodyText.match(/QaChild DupCheck/g) || []).length,
    fullText: bodyText.slice(0, 1500),
  };

  // ── Rooms: confirm both rooms exist ──
  await page.goto(`${BASE_URL}/rooms`);
  bodyText = await page.locator("body").innerText();
  out.rooms = {
    nursery: bodyText.includes("QaRoom Nursery"),
    toddlers: bodyText.includes("QaRoom Toddlers"),
  };
  // If Toddlers missing, add it now
  if (!out.rooms.toddlers) {
    await page.locator('form input[name="name"]').first().fill("QaRoom Toddlers");
    await page.locator('form button[type="submit"]').first().click();
    await page.waitForLoadState("networkidle").catch(() => {});
    bodyText = await page.locator("body").innerText();
    out.rooms.toddlers_retry = bodyText.includes("QaRoom Toddlers");
  }

  // ── Sign In/Out: confirm children + visitor signed in ──
  await page.goto(`${BASE_URL}/signin`);
  await page.waitForLoadState("networkidle").catch(() => {});
  bodyText = await page.locator("body").innerText();
  out.signinChildrenTab = bodyText.slice(0, 800);
  await page.getByRole("button", { name: /Visitors/ }).click().catch(() => {});
  await page.waitForTimeout(300);
  bodyText = await page.locator("body").innerText();
  out.signinVisitorsTab = bodyText.includes("Kiosk Test Visitor");
  if (!out.signinVisitorsTab) {
    // retry adding the kiosk visitor
    await page.locator('input[placeholder="Full name *"]').fill("Kiosk Test Visitor Retry");
    await page.locator('input[placeholder="Reason for visit *"]').fill("Dropping off forms");
    await page.getByRole("button", { name: "Sign In Visitor" }).click();
    await page.waitForTimeout(1000);
    bodyText = await page.locator("body").innerText();
    out.signinVisitorRetry = bodyText.includes("Kiosk Test Visitor Retry");
  }

  // ── On Site board sanity ──
  await page.goto(`${BASE_URL}/onsite`);
  await page.waitForLoadState("networkidle").catch(() => {});
  bodyText = await page.locator("body").innerText();
  out.onsite = bodyText.slice(0, 1200);

  // ── Visitor Log: confirm 3 full-form visitors ──
  await page.goto(`${BASE_URL}/visitor-log`);
  bodyText = await page.locator("body").innerText();
  out.visitorLog = {
    plumber: bodyText.includes("Visitor One Plumber"),
    inspector: bodyText.includes("Visitor Two Inspector"),
    student: bodyText.includes("Visitor Three Student"),
  };
  // Retry missing ones
  const retryVisitors = [];
  if (!out.visitorLog.inspector) retryVisitors.push({ name: "Visitor Two Inspector Retry", type: "government_inspector", org: "State Regulatory Authority", purpose: "Assessment & rating visit", id: "yes", wwcc: "yes", sup: "no" });
  if (!out.visitorLog.student) retryVisitors.push({ name: "Visitor Three Student Retry", type: "student_placement", org: "TAFE NSW", purpose: "Placement observation", id: "yes", wwcc: "yes", sup: "yes" });
  out.visitorRetryResults = [];
  for (const v of retryVisitors) {
    await page.goto(`${BASE_URL}/visitor-log`);
    await page.locator('input[name="visitor_name"]').fill(v.name);
    await page.locator('select[name="visitor_type"]').selectOption(v.type);
    await page.locator('input[name="organisation"]').fill(v.org);
    await page.locator('input[name="purpose_of_visit"]').fill(v.purpose);
    await page.locator('select[name="id_checked"]').selectOption(v.id);
    await page.locator('select[name="wwcc_checked"]').selectOption(v.wwcc);
    await page.locator('select[name="supervised"]').selectOption(v.sup);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForLoadState("networkidle").catch(() => {});
    bodyText = await page.locator("body").innerText();
    out.visitorRetryResults.push({ name: v.name, ok: bodyText.includes(v.name) });
  }

  // ── Medication Log: confirm 2 exist, add 3rd ──
  await page.goto(`${BASE_URL}/medication-log`);
  bodyText = await page.locator("body").innerText();
  out.medication = {
    panadol: bodyText.includes("Panadol"),
    ventolin: bodyText.includes("Ventolin"),
    antihistamine: bodyText.includes("Antihistamine"),
  };
  if (!out.medication.antihistamine) {
    await page.goto(`${BASE_URL}/medication-log`);
    await page.waitForLoadState("networkidle").catch(() => {});
    const sel = page.locator('select[name="child_id"]');
    await sel.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
    await sel.selectOption({ label: "QaChild Cleo" }).catch(async () => { await sel.selectOption({ index: 1 }); });
    await page.locator('input[name="medication_name"]').fill("Antihistamine cream");
    await page.locator('input[name="dose"]').fill("small amount");
    await page.locator('select[name="route"]').selectOption("topical");
    await page.locator('input[name="reason"]').fill("insect bite");
    await page.locator('select[name="parent_authorised"]').selectOption("no");
    await page.locator('input[name="administering_typed_name"]').fill("QA Director");
    await page.locator('input[name="sign_confirmed"]').check();
    await page.getByRole("button", { name: "Save & sign record" }).click();
    await page.waitForLoadState("networkidle").catch(() => {});
    bodyText = await page.locator("body").innerText();
    out.medicationRetry = bodyText.includes("Antihistamine cream");
  }

  // ── Safety Checks: confirm actual saved state for today ──
  const today = new Date().toISOString().slice(0, 10);
  await page.goto(`${BASE_URL}/safety-checks?date=${today}`);
  await page.waitForLoadState("networkidle").catch(() => {});
  bodyText = await page.locator("body").innerText();
  out.safetyChecksToday = bodyText.slice(0, 600);
  const checkedCount = await page.locator('input[type="checkbox"]:checked').count();
  const totalCount = await page.locator('input[type="checkbox"]').count();
  out.safetyChecksCounts = { checked: checkedCount, total: totalCount };

  // ── Community Wall: confirm posts ──
  await page.goto(`${BASE_URL}/wall`);
  bodyText = await page.locator("body").innerText();
  out.wall = {
    one: bodyText.includes("QA wall post one"),
    two: bodyText.includes("QA wall post two"),
    three: bodyText.includes("QA wall post three"),
  };
  const retryPosts = [];
  if (!out.wall.two) retryPosts.push("QA wall post two (retry) — reminder about sunhats.");
  if (!out.wall.three) retryPosts.push("QA wall post three (retry) — photo day next Friday.");
  out.wallRetryResults = [];
  for (const body of retryPosts) {
    await page.goto(`${BASE_URL}/wall`);
    await page.locator('textarea[name="body"]').fill(body);
    await page.getByRole("button", { name: "Post" }).click();
    await page.waitForLoadState("networkidle").catch(() => {});
    bodyText = await page.locator("body").innerText();
    out.wallRetryResults.push({ body, ok: bodyText.includes(body) });
  }

  // ── Staff Roster: confirm shifts for the week ──
  await page.goto(`${BASE_URL}/staff/roster`);
  bodyText = await page.locator("body").innerText();
  out.roster = bodyText.slice(0, 1000);

  // ── Compliance expiry alert: confirm actual state ──
  await page.goto(`${BASE_URL}/compliance`);
  bodyText = await page.locator("body").innerText();
  out.compliance = {
    hasWwcc: bodyText.includes("WWCC WWC1234567A"),
    hasFirstAid: bodyText.includes("HLTAID012"),
    hasAnaphylaxis: bodyText.includes("Anaphylaxis & Asthma Management"),
    hasExpiryAlertHeading: /expiring within 60 days/i.test(bodyText),
    snippet: bodyText.slice(0, 1500),
  };

  // ── Invoices: confirm 3rd invoice ──
  await page.goto(`${BASE_URL}/invoices`);
  bodyText = await page.locator("body").innerText();
  out.invoices = {
    parentOne: bodyText.includes("Test Parent One"),
    parentTwo: bodyText.includes("Test Parent Two"),
    parentThree: bodyText.includes("Test Parent Three"),
  };
  if (!out.invoices.parentThree) {
    await page.goto(`${BASE_URL}/invoices?add=1`);
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.locator('input[name="bill_to_name"]').fill("Test Parent Three");
    await page.locator('input[name="bill_to_email"]').fill("billthree@example.com");
    const t = new Date();
    const periodStart = t.toISOString().slice(0, 10);
    const periodEndDate = new Date(t); periodEndDate.setDate(periodEndDate.getDate() + 7);
    await page.locator('input[name="period_start"]').fill(periodStart);
    await page.locator('input[name="period_end"]').fill(periodEndDate.toISOString().slice(0, 10));
    await page.locator('input[name="description"]').first().fill("Late pickup fee");
    await page.locator('input[name="quantity"]').first().fill("2");
    await page.locator('input[name="unit_price"]').first().fill("15.00");
    await page.getByRole("button", { name: "Create invoice" }).click();
    await page.waitForLoadState("networkidle").catch(() => {});
    bodyText = await page.locator("body").innerText();
    out.invoicesRetry = bodyText.includes("Test Parent Three");
  }

  // ── White Noise: confirm play control ──
  await page.goto(`${BASE_URL}/white-noise`);
  await page.waitForLoadState("networkidle").catch(() => {});
  bodyText = await page.locator("body").innerText();
  out.whiteNoise = {
    hasPlayText: /Press play to start/i.test(bodyText),
    ariaButtons: await page.locator("button[aria-label]").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label"))),
  };
  const playBtn = page.locator('button[aria-label="Play"]');
  if (await playBtn.count()) {
    await playBtn.click();
    await page.waitForTimeout(500);
    bodyText = await page.locator("body").innerText();
    out.whiteNoise.playingAfterClick = /playing/i.test(bodyText);
    await page.locator('button[aria-label="Stop"]').click().catch(() => {});
  }

  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2), "utf-8");
  console.log("Verification written to", OUT);
})();
