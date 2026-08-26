/**
 * QA Group A — Content Generation & Printables
 * Plain Playwright script (not test-runner) so it can run independently of
 * the other 3 parallel QA agents without racing on playwright/.auth/director.json.
 *
 * Usage:
 *   node playwright/qa-content-gen.script.js <stage>
 *
 * Stages: login, generate, activities, brainbreaks, worksheets, auslan,
 *         posters, recipes, mealplanner, materials, all
 *
 * Logs in fresh each run using storageState persisted to
 * playwright/.auth/qa-group-a.json (own file, never the shared director.json).
 */
const { chromium } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const AUTH_FILE = path.join(__dirname, ".auth", "qa-group-a.json");
const SCREENSHOT_DIR = path.join(__dirname, "..", "docs", "qa-2026-08-18", "group-a", "screenshots");
const EMAIL = "krondor2024+qa-director-a@gmail.com";
const PASSWORD = "QaTest-Dl9_guGihFa1";

fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

function log(obj) {
  console.log("RESULT::" + JSON.stringify(obj));
  return obj;
}

async function ensureLoggedIn(browser) {
  let context;
  if (fs.existsSync(AUTH_FILE)) {
    context = await browser.newContext({ storageState: AUTH_FILE, baseURL: BASE_URL });
  } else {
    context = await browser.newContext({ baseURL: BASE_URL });
  }
  const page = await context.newPage();
  await page.goto("/generate", { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login")) {
    await page.goto("/login");
    await page.locator("#email").fill(EMAIL);
    await page.locator("#password").fill(PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL("**/generate", { timeout: 20000 });
    await context.storageState({ path: AUTH_FILE });
  }
  return { context, page };
}

// ─────────────────────────────── Generate Activity ───────────────────────────

async function stageGenerate(page) {
  const tests = [
    {
      name: "Toddlers dinosaurs materials",
      setup: async () => {
        await page.goto("/generate");
        await page.locator("#focus_interest").fill("dinosaurs");
        await page.locator("#age_bracket").fill("Toddlers (2-3 years)");
        await page.locator("#time").fill("20");
        await page.locator("#group").selectOption("small_group");
      },
    },
    {
      name: "Preschool space craft idea description",
      setup: async () => {
        await page.goto("/generate");
        await page
          .locator("#focus_interest")
          .fill("outer space and rockets");
        await page.locator("#age_bracket").fill("Preschool (4-5 years)");
        await page.locator("#energy").selectOption("moderate");
        await page.locator("#time").fill("30");
      },
    },
    {
      name: "Kindergarten sensory needs additional-needs field",
      setup: async () => {
        await page.goto("/generate");
        await page.locator("#focus_interest").fill("ocean animals");
        await page.locator("#age_bracket").fill("Kindergarten / school age (5+ years)");
        await page
          .locator("#additional_needs_field")
          .fill("sensory sensitivity to loud noise, prefers quiet activities");
        await page.locator("#time").fill("15");
        await page.locator("#group").selectOption("whole_group");
      },
    },
  ];

  const results = [];
  for (const t of tests) {
    const r = { feature: "Generate Activity", test: t.name, savedUrls: [] };
    try {
      await t.setup();
      await page.getByRole("button", { name: /^Generate$/ }).click();
      await page.waitForSelector("text=Save to library", { timeout: 60000 });
      const saveButtons = await page.getByRole("button", { name: "Save to library" }).all();
      r.suggestionsReturned = saveButtons.length;
      // Save first suggestion only (per test) to avoid excessive DB writes, but note count
      if (saveButtons.length > 0) {
        await saveButtons[0].click();
        const link = page.getByRole("link", { name: /Saved.*view/i }).first();
        await link.waitFor({ timeout: 15000 });
        const href = await link.getAttribute("href");
        r.savedUrls.push(BASE_URL + href);
      }
      r.status = "pass";
    } catch (err) {
      r.status = "fail";
      r.error = String(err).slice(0, 500);
    }
    results.push(r);
    log(r);
  }
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "generate-01.png"), fullPage: true });
  return results;
}

// ─────────────────────────────── Activities library ──────────────────────────

async function stageActivities(page) {
  const results = [];
  const r = { feature: "Activities library", test: "browse/search/filter" };
  try {
    await page.goto("/activities");
    await page.waitForSelector("h1:has-text('Activity library')");
    const count = await page.locator("a[href^='/activities/']").count();
    r.activityCount = count;
    // filter by energy
    const calmFilter = page.getByRole("link", { name: /calm/i }).first();
    if (await calmFilter.count() > 0) {
      await calmFilter.click();
      await page.waitForTimeout(1000);
      r.calmFilterCount = await page.locator("a[href^='/activities/']").count();
    }
    await page.goto("/activities");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "activities-library.png"), fullPage: true });
    // open first activity detail
    const firstLink = page.locator("a[href^='/activities/']").first();
    if (await firstLink.count() > 0) {
      const href = await firstLink.getAttribute("href");
      await firstLink.click();
      await page.waitForLoadState("domcontentloaded");
      r.firstDetailUrl = BASE_URL + href;
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "activity-detail.png"), fullPage: true });
    }
    r.status = "pass";
  } catch (err) {
    r.status = "fail";
    r.error = String(err).slice(0, 500);
  }
  results.push(r);
  log(r);
  return results;
}

// ─────────────────────────────── Brain Breaks ─────────────────────────────────

async function stageBrainBreaks(page) {
  const tests = [
    { name: "Toddlers too-high energy movement 5min", ageGroup: "Toddlers 1–2", roomEnergy: "Too high", duration: "5 min", type: "Movement" },
    { name: "Preschool scattered mindfulness 2min", ageGroup: "Preschool 3–4", roomEnergy: "Scattered", duration: "2 min", type: "Breathing" },
    { name: "Kindy too-low cognitive 10min", ageGroup: "Kindy 5+", roomEnergy: "Too low", duration: "10 min", type: "Pop quiz" },
  ];
  const results = [];
  for (const t of tests) {
    const r = { feature: "Brain Breaks", test: t.name, savedUrls: [] };
    try {
      await page.goto("/brain-breaks");
      await page.getByRole("button", { name: t.ageGroup, exact: true }).click();
      await page.getByRole("button", { name: new RegExp(t.roomEnergy, "i") }).first().click();
      await page.getByRole("button", { name: t.duration, exact: true }).click();
      await page.getByRole("button", { name: new RegExp(t.type, "i") }).first().click();
      await page.getByRole("button", { name: "Generate brain breaks" }).click();
      await page.waitForSelector("text=Launch on screen", { timeout: 60000 });
      const cards = await page.locator("text=Launch on screen").count();
      r.breaksReturned = cards;
      r.note = "No save/persist mechanism exists for brain breaks — ephemeral per-generation only (confirmed via /api/brain-break route, no DB write). Saved-at URL: N/A.";
      r.status = "pass";
    } catch (err) {
      r.status = "fail";
      r.error = String(err).slice(0, 500);
    }
    results.push(r);
    log(r);
  }
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "brain-breaks.png"), fullPage: true });
  // Launch one to check the play overlay renders
  try {
    await page.getByRole("button", { name: "Launch on screen" }).first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "brain-break-play-overlay.png"), fullPage: true });
  } catch (err) {
    log({ feature: "Brain Breaks", test: "launch overlay", status: "fail", error: String(err).slice(0, 300) });
  }
  return results;
}

// ─────────────────────────────── Worksheets ────────────────────────────────

async function stageWorksheets(page, context) {
  const results = [];
  await page.goto("/worksheets");
  await page.waitForLoadState("domcontentloaded");
  const rows = await page.locator("select").count();
  log({ feature: "Worksheets", test: "page load", rowsFound: rows });

  // Pull activity titles + set template overrides for variety, then print each in a new tab
  const activityRows = page.locator("div.divide-y > div");
  const rowCount = await activityRows.count();
  const templatesToTry = ["name_trace", "letter_colouring", "matching_pairs", "counting_groups", "card_set"];
  let tried = 0;
  for (let i = 0; i < rowCount && tried < 3; i++) {
    const row = activityRows.nth(i);
    const titleEl = row.locator("p.font-semibold").first();
    if ((await titleEl.count()) === 0) continue;
    const title = (await titleEl.textContent())?.trim();
    const select = row.locator("select");
    if ((await select.count()) === 0) continue;
    const templateType = templatesToTry[tried];
    const r = { feature: "Worksheets", test: `${title} -> ${templateType}`, savedUrls: [] };
    try {
      await select.selectOption(templateType);
      const [newPage] = await Promise.all([
        context.waitForEvent("page"),
        row.getByRole("button", { name: "Print" }).click(),
      ]);
      await newPage.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
      r.savedUrls.push(newPage.url());
      await newPage.waitForTimeout(2000);
      // Check for broken images
      const imgs = await newPage.locator("img").all();
      let brokenCount = 0;
      for (const img of imgs) {
        const natW = await img.evaluate((el) => el.naturalWidth).catch(() => 0);
        if (natW === 0) brokenCount++;
      }
      r.imageCount = imgs.length;
      r.brokenImages = brokenCount;
      await newPage.screenshot({ path: path.join(SCREENSHOT_DIR, `worksheet-${templateType}.png`), fullPage: true });
      await newPage.close();
      r.status = "pass";
      tried++;
    } catch (err) {
      r.status = "fail";
      r.error = String(err).slice(0, 500);
      tried++;
    }
    results.push(r);
    log(r);
  }
  return results;
}

// ─────────────────────────────── Auslan ────────────────────────────────────

async function stageAuslan(page) {
  const queries = ["more", "kangaroo", "toilet", "happy"];
  const results = [];
  for (const q of queries) {
    const r = { feature: "Auslan Dictionary", test: `search "${q}"` };
    try {
      await page.goto("/auslan");
      await page.locator('input[type=search]:not([name])').first().fill(q);
      await page.waitForTimeout(500);
      const resultCards = await page.locator("p.font-display.mt-2.font-semibold").count();
      r.resultsFound = resultCards;
      r.status = "pass";
    } catch (err) {
      r.status = "fail";
      r.error = String(err).slice(0, 300);
    }
    results.push(r);
    log(r);
  }
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "auslan-dictionary.png"), fullPage: true });
  return results;
}

// ─────────────────────────────── Posters ───────────────────────────────────

async function stagePosters(page) {
  const tests = [
    { name: "Allergy alert poster", input: "Allergy alert poster — this room has children with severe nut and dairy allergies, no outside food please" },
    { name: "Event flier", input: "Flier for our Bush Dance family event, Friday 24 July 3pm to 5pm, families bring a plate to share, gold coin donation" },
    { name: "Room rules poster", input: "Room rules poster for the Kookaburra Room toddlers — kind hands, walking feet, use your words, listen to educators" },
  ];
  const results = [];
  for (const t of tests) {
    const r = { feature: "Posters & Fliers", test: t.name, savedUrls: [] };
    try {
      await page.goto("/posters");
      await page.waitForLoadState("domcontentloaded");
      const textarea = page.locator("textarea").first();
      await textarea.fill(t.input);
      await page.getByRole("button", { name: "Generate wording" }).click();
      await page.waitForTimeout(15000); // AI copy + image search
      const saveBtn = page.getByRole("button", { name: /Save poster/i });
      await saveBtn.click();
      await page.waitForTimeout(3000);
      const savedLink = page.getByRole("link", { name: /Open edit \/ download/i });
      if (await savedLink.count() > 0) {
        const href = await savedLink.getAttribute("href");
        r.savedUrls.push(BASE_URL + href);
      }
      const errText = await page.locator("p").filter({ hasText: /error|failed/i }).allTextContents();
      r.errorsOnPage = errText;
      r.status = r.savedUrls.length > 0 ? "pass" : "fail";
    } catch (err) {
      r.status = "fail";
      r.error = String(err).slice(0, 500);
    }
    results.push(r);
    log(r);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `poster-${results.length}.png`), fullPage: true });
  }
  return results;
}

// ─────────────────────────────── Recipes ───────────────────────────────────

async function stageRecipes(page) {
  const tests = [
    { name: "Nut-free morning tea for toddlers", input: "A simple nut-free morning tea for 10 toddlers, no cooking required, ready in 10 minutes" },
    { name: "Vegetarian lunch for preschool", input: "A vegetarian, dairy-light lunch for 15 preschoolers that's easy to eat with a spoon" },
    { name: "Halal afternoon tea baking activity", input: "A halal afternoon tea snack for 12 kindergarten kids that doubles as a simple baking activity" },
  ];
  const results = [];
  for (const t of tests) {
    const r = { feature: "Recipes", test: t.name, savedUrls: [] };
    try {
      await page.goto("/recipes");
      const textarea = page.locator("textarea").first();
      await textarea.fill(t.input);
      await page.getByRole("button", { name: "Generate recipes" }).click();
      await page.waitForSelector("text=Save recipe", { timeout: 60000 });
      const saveButtons = await page.getByRole("button", { name: "Save recipe" }).all();
      r.recipesReturned = saveButtons.length;
      if (saveButtons.length > 0) {
        await saveButtons[0].click();
        await page.waitForTimeout(1500);
      }
      r.status = "pass";
    } catch (err) {
      r.status = "fail";
      r.error = String(err).slice(0, 500);
    }
    results.push(r);
    log(r);
  }
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "recipes.png"), fullPage: true });
  // Now visit /recipes to see saved list (recipes page itself lists saved? check)
  await page.goto("/recipes");
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "recipes-saved-state.png"), fullPage: true });
  results.push({ feature: "Recipes", test: "saved library location", savedUrls: [BASE_URL + "/recipes"] });
  return results;
}

// ─────────────────────────────── Meal Planner ──────────────────────────────

async function stageMealPlanner(page) {
  const results = [];
  const weeks = [
    { name: "This week AI fill (general)", weekParam: "" },
    { name: "Next week AI fill (general enrolled needs)", weekParam: "?week=" },
  ];
  for (const w of weeks) {
    const r = { feature: "Meal Planner", test: w.name, savedUrls: [] };
    try {
      let url = "/recipes/meal-planner";
      if (w.weekParam) {
        // compute next monday
        const d = new Date();
        d.setDate(d.getDate() + 7);
        url += `?week=${d.toISOString().slice(0, 10)}`;
      }
      await page.goto(url);
      await page.waitForLoadState("domcontentloaded");
      const fillBtn = page.getByRole("button", { name: /AI fill/i });
      await fillBtn.waitFor({ timeout: 10000 });
      const btnText = await fillBtn.textContent();
      r.emptySlotsBefore = btnText;
      if (!/all filled/i.test(btnText || "")) {
        await fillBtn.click();
        await page.waitForTimeout(25000); // AI fill can take a while for many slots
      }
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `meal-planner-${results.length + 1}.png`), fullPage: true });
      r.savedUrls.push(BASE_URL + url);
      // Grab grid text for quality check
      const gridText = await page.locator("table").innerText();
      r.gridSample = gridText.slice(0, 1500);
      r.status = "pass";
    } catch (err) {
      r.status = "fail";
      r.error = String(err).slice(0, 500);
    }
    results.push(r);
    log(r);
  }
  return results;
}

// ─────────────────────────────── Materials ─────────────────────────────────

async function stageMaterials(page) {
  const results = [];
  const r = { feature: "Materials", test: "add classroom + food items, view list" };
  try {
    await page.goto("/materials");
    await page.waitForLoadState("domcontentloaded");
    // Add a classroom material
    await page.locator("input[name=name]").fill("QA test — washable paint");
    await page.locator("select[name=category]").selectOption("classroom");
    await page.locator("input[name=quantity]").fill("6");
    await page.locator("input[name=unit]").fill("bottles");
    await page.locator("input[name=low_stock_threshold]").fill("2");
    await page.getByRole("button", { name: "Add" }).click();
    await page.waitForLoadState("domcontentloaded");

    // Add a food item
    await page.locator("input[name=name]").fill("QA test — rolled oats");
    await page.locator("select[name=category]").selectOption("food");
    await page.locator("input[name=quantity]").fill("3");
    await page.locator("input[name=unit]").fill("kg");
    await page.getByRole("button", { name: "Add" }).click();
    await page.waitForLoadState("domcontentloaded");

    r.savedUrls = [BASE_URL + "/materials"];
    const rowCount = await page.locator("li").count();
    r.materialRowCount = rowCount;
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "materials.png"), fullPage: true });
    r.status = "pass";
  } catch (err) {
    r.status = "fail";
    r.error = String(err).slice(0, 500);
  }
  results.push(r);
  log(r);
  return results;
}

// ─────────────────────────────── Worksheets (manual URL, no AI needed) ─────

async function stageWorksheetsManual(context) {
  const results = [];
  const cases = [
    {
      name: "name_trace — Priya",
      params: { type: "name_trace", title: "Name Writing Practice", name: "Priya" },
    },
    {
      name: "matching_pairs — farm animals to sounds",
      params: {
        type: "matching_pairs",
        title: "Farm Animal Sounds Matching",
        ml: ["Cow", "Dog", "Cat", "Duck"],
        mr: ["Moo", "Woof", "Meow", "Quack"],
        name: "Jack",
      },
    },
    {
      name: "counting_groups — 1 to 5 fruit counting",
      params: {
        type: "counting_groups",
        title: "How Many Fruits?",
        cg: ["🍎|Apples|3", "🍌|Bananas|5", "🍇|Grapes|2"],
      },
    },
    {
      name: "letter_colouring — letter M",
      params: { type: "letter_colouring", title: "Letter M", letter_text: "M" },
    },
    {
      name: "activity_sheet WITH image_subject (AI image dependency check)",
      params: {
        type: "activity_sheet",
        title: "Dinosaur Torn Paper Collage",
        material: ["coloured paper", "glue", "scissors"],
        image_subject: "a friendly cartoon dinosaur",
      },
    },
  ];

  for (const c of cases) {
    const r = { feature: "Printable Sheets / Worksheets", test: c.name, savedUrls: [] };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(c.params)) {
      if (Array.isArray(v)) v.forEach((val) => params.append(k, val));
      else params.set(k, v);
    }
    const url = `/worksheet?${params.toString()}`;
    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(4000); // allow any client-side image fetch to attempt/fail
      r.savedUrls.push(BASE_URL + url);
      const imgs = await page.locator("img").all();
      let brokenCount = 0;
      for (const img of imgs) {
        const natW = await img.evaluate((el) => el.naturalWidth).catch(() => 0);
        if (natW === 0) brokenCount++;
      }
      r.imageCount = imgs.length;
      r.brokenImages = brokenCount;
      const bodyText = await page.locator("body").innerText();
      r.hasErrorText = /couldn.?t generate|failed|error/i.test(bodyText);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `worksheet-manual-${c.params.type}.png`),
        fullPage: true,
      });
      r.status = "pass";
    } catch (err) {
      r.status = "fail";
      r.error = String(err).slice(0, 500);
    }
    await page.close();
    results.push(r);
    log(r);
  }
  return results;
}

// ─────────────────────────────── Posters manual (no AI) ────────────────────

async function stagePostersManual(page) {
  const results = [];
  const r = { feature: "Posters & Fliers", test: "Manual poster (no AI wording) — text + background + save", savedUrls: [] };
  try {
    await page.goto("/posters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500); // canvas mounts client-side (dynamic import, ssr:false)
    const nameInput = page.locator('input[value="My Poster"]');
    await nameInput.fill("QA Manual — Room Rules Poster");
    await page.getByRole("button", { name: "+ Big Heading" }).click();
    await page.getByRole("button", { name: "+ Subtitle" }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "poster-manual-canvas.png"), fullPage: true });
    await page.getByRole("button", { name: /Save poster/i }).click();
    await page.waitForTimeout(3000);
    const savedLink = page.getByRole("link", { name: /Open edit \/ download/i });
    if ((await savedLink.count()) > 0) {
      const href = await savedLink.getAttribute("href");
      r.savedUrls.push(BASE_URL + href);
      r.status = "pass";
    } else {
      const errText = await page.locator("body").innerText();
      r.error = errText.includes("error") ? "Save error banner shown" : "No save confirmation link found";
      r.status = "fail";
    }
  } catch (err) {
    r.status = "fail";
    r.error = String(err).slice(0, 500);
  }
  results.push(r);
  log(r);
  return results;
}

// ─────────────────────────────── AI-broken evidence captures ───────────────

async function stageAiBrokenEvidence(page) {
  const results = [];

  // Recipes
  try {
    await page.goto("/recipes");
    await page.locator("textarea").first().fill("A nut-free morning tea for 10 toddlers");
    await page.getByRole("button", { name: "Generate recipes" }).click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "recipes-BROKEN-500.png"), fullPage: true });
    const errText = await page.locator("p").filter({ hasText: /could not reach|error/i }).allTextContents();
    results.push(log({ feature: "Recipes", test: "AI generation (evidence capture)", status: "fail-blocked", errorShown: errText }));
  } catch (err) {
    log({ feature: "Recipes", test: "AI generation (evidence capture)", status: "fail", error: String(err).slice(0, 300) });
  }

  // Brain breaks
  try {
    await page.goto("/brain-breaks");
    await page.getByRole("button", { name: "Generate brain breaks" }).click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "brain-breaks-BROKEN-500.png"), fullPage: true });
    const errText = await page.locator("div.rounded-2xl.border.border-red-200").allTextContents();
    results.push(log({ feature: "Brain Breaks", test: "AI generation (evidence capture)", status: "fail-blocked", errorShown: errText }));
  } catch (err) {
    log({ feature: "Brain Breaks", test: "AI generation (evidence capture)", status: "fail", error: String(err).slice(0, 300) });
  }

  // Poster AI wording
  try {
    await page.goto("/posters");
    await page.waitForTimeout(1500);
    await page.locator("textarea").first().fill("Flier for Bush Dance Friday 3pm");
    await page.getByRole("button", { name: "Generate wording" }).click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "posters-ai-wording-BROKEN-500.png"), fullPage: true });
    const errText = await page.locator("p").filter({ hasText: /error|failed/i }).allTextContents();
    results.push(log({ feature: "Posters & Fliers", test: "AI wording generation (evidence capture)", status: "fail-blocked", errorShown: errText }));
  } catch (err) {
    log({ feature: "Posters & Fliers", test: "AI wording generation (evidence capture)", status: "fail", error: String(err).slice(0, 300) });
  }

  // Meal planner AI fill
  try {
    await page.goto("/recipes/meal-planner");
    await page.waitForLoadState("domcontentloaded");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "meal-planner-empty-no-recipes.png"), fullPage: true });
    const fillBtn = page.getByRole("button", { name: /AI fill/i });
    if ((await fillBtn.count()) > 0) {
      await fillBtn.click();
      await page.waitForTimeout(4000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "meal-planner-BROKEN-500.png"), fullPage: true });
    }
    results.push(log({ feature: "Meal Planner", test: "AI fill (evidence capture) — blocked, no saved recipes exist either since Recipes gen is down", status: "fail-blocked" }));
  } catch (err) {
    log({ feature: "Meal Planner", test: "AI fill (evidence capture)", status: "fail", error: String(err).slice(0, 300) });
  }

  return results;
}

// ─────────────────────────────── Materials v2 (fixed) ──────────────────────

async function stageMaterialsV2(page) {
  const results = [];
  const r = { feature: "Materials", test: "add classroom item then food item, verify both listed", savedUrls: [BASE_URL + "/materials"] };
  try {
    await page.goto("/materials");
    const addForm = page.locator("form", { has: page.locator('input[placeholder*="paint"]') });
    await addForm.locator("input[name=name]").fill("QA test — washable paint");
    await addForm.locator("select[name=category]").selectOption("classroom");
    await addForm.locator('input[placeholder="Quantity (optional)"]').fill("6");
    await addForm.locator('input[placeholder="Unit (optional)"]').fill("bottles");
    await addForm.locator('input[placeholder="Low-stock at (optional)"]').fill("2");
    await Promise.all([page.waitForLoadState("networkidle"), addForm.getByRole("button", { name: "Add" }).click()]);

    const addForm2 = page.locator("form", { has: page.locator('input[placeholder*="paint"]') });
    await addForm2.locator("input[name=name]").fill("QA test — rolled oats");
    await addForm2.locator("select[name=category]").selectOption("food");
    await addForm2.locator('input[placeholder="Quantity (optional)"]').fill("3");
    await addForm2.locator('input[placeholder="Unit (optional)"]').fill("kg");
    await Promise.all([page.waitForLoadState("networkidle"), addForm2.getByRole("button", { name: "Add" }).click()]);

    const bodyText = await page.locator("body").innerText();
    r.classroomItemAdded = bodyText.includes("washable paint");
    r.foodItemAdded = bodyText.includes("rolled oats");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "materials-v2.png"), fullPage: true });
    r.status = r.classroomItemAdded && r.foodItemAdded ? "pass" : "fail";
  } catch (err) {
    r.status = "fail";
    r.error = String(err).slice(0, 500);
  }
  results.push(r);
  log(r);
  return results;
}

// ─────────────────────────────── Activities library check ──────────────────

async function stageActivitiesCheck(page) {
  const results = [];
  const r = { feature: "Activities library", test: "check current library state", savedUrls: [BASE_URL + "/activities"] };
  try {
    await page.goto("/activities");
    await page.waitForLoadState("domcontentloaded");
    const count = await page.locator("a[href^='/activities/']").count();
    r.activityCount = count;
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "activities-library-state.png"), fullPage: true });
    r.status = "pass";
  } catch (err) {
    r.status = "fail";
    r.error = String(err).slice(0, 500);
  }
  results.push(r);
  log(r);
  return results;
}

// ─────────────────────────────── Generate Activity — QUALITY re-test ───────

async function stageGenerateQuality(page) {
  const tests = [
    {
      name: "Toddlers dinosaurs materials",
      setup: async () => {
        await page.goto("/generate");
        await page.locator("#focus_interest").fill("dinosaurs");
        await page.locator("#age_bracket").fill("Toddlers (2-3 years)");
        await page.locator("#time").fill("20");
        await page.locator("#group").selectOption("small_group");
      },
    },
    {
      name: "Preschool space craft",
      setup: async () => {
        await page.goto("/generate");
        await page.locator("#focus_interest").fill("outer space and rockets");
        await page.locator("#age_bracket").fill("Preschool (4-5 years)");
        await page.locator("#energy").selectOption("moderate");
        await page.locator("#time").fill("30");
      },
    },
    {
      name: "Kindergarten ocean sensory needs",
      setup: async () => {
        await page.goto("/generate");
        await page.locator("#focus_interest").fill("ocean animals");
        await page.locator("#age_bracket").fill("Kindergarten / school age (5+ years)");
        await page.locator("#additional_needs_field").fill("sensory sensitivity to loud noise, prefers quiet activities");
        await page.locator("#time").fill("15");
        await page.locator("#group").selectOption("whole_group");
      },
    },
  ];

  const results = [];
  for (const t of tests) {
    const r = { feature: "Generate Activity", test: t.name, savedUrls: [] };
    try {
      await t.setup();
      await page.getByRole("button", { name: /^Generate$/ }).click();
      await page.waitForSelector("text=Save to library", { timeout: 60000 });
      const cards = page
        .locator("div.rounded-2xl.border.border-coral-light.bg-white.p-5.shadow-sm")
        .filter({ has: page.locator("h3") });
      const count = await cards.count();
      r.suggestionsReturned = count;
      // Capture full text content of first suggestion for quality review
      const firstCard = cards.first();
      r.fullContent = (await firstCard.innerText()).slice(0, 3000);
      const saveBtn = firstCard.getByRole("button", { name: "Save to library" });
      await saveBtn.click();
      const link = firstCard.getByRole("link", { name: /Saved.*view/i });
      await link.waitFor({ timeout: 15000 });
      const href = await link.getAttribute("href");
      r.savedUrls.push(BASE_URL + href);
      r.status = "pass";
    } catch (err) {
      r.status = "fail";
      r.error = String(err).slice(0, 500);
    }
    results.push(r);
    log(r);
  }
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "generate-quality-01.png"), fullPage: true });
  return results;
}

// ─────────────────────────────── Brain Breaks — QUALITY re-test ────────────

async function stageBrainBreaksQuality(page) {
  const tests = [
    { name: "Toddlers too-high movement 5min", ageGroup: "Toddlers 1–2", roomEnergy: "Too high", duration: "5 min", type: "Movement" },
    { name: "Preschool scattered breathing 2min", ageGroup: "Preschool 3–4", roomEnergy: "Scattered", duration: "2 min", type: "Breathing" },
    { name: "Kindy too-low pop-quiz 10min", ageGroup: "Kindy 5+", roomEnergy: "Too low", duration: "10 min", type: "Pop quiz" },
  ];
  const results = [];
  for (const t of tests) {
    const r = { feature: "Brain Breaks", test: t.name };
    try {
      await page.goto("/brain-breaks");
      await page.getByRole("button", { name: t.ageGroup, exact: true }).click();
      await page.getByRole("button", { name: new RegExp(t.roomEnergy, "i") }).first().click();
      await page.getByRole("button", { name: t.duration, exact: true }).click();
      await page.getByRole("button", { name: new RegExp(t.type, "i") }).first().click();
      await page.getByRole("button", { name: "Generate brain breaks" }).click();
      await page.waitForSelector("text=Launch on screen", { timeout: 60000 });
      const cards = page.locator("div.rounded-2xl.border.bg-white.overflow-hidden");
      r.breaksReturned = await cards.count();
      r.fullContent = (await cards.first().innerText()).slice(0, 2000);
      // Launch the first one to inspect the interactive player content
      await cards.first().getByRole("button", { name: "Launch on screen" }).click();
      await page.waitForTimeout(1500);
      const overlayText = await page.locator("div.fixed.inset-0.z-50").innerText().catch(() => "");
      r.playerScreen1 = overlayText.slice(0, 800);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `brain-break-quality-${t.type.replace(/\s/g, "")}.png`), fullPage: true });
      await page.getByRole("button", { name: "✕ Exit" }).click().catch(() => {});
      r.status = "pass";
    } catch (err) {
      r.status = "fail";
      r.error = String(err).slice(0, 500);
    }
    results.push(r);
    log(r);
  }
  return results;
}

// ─────────────────────────────── Recipes — QUALITY re-test ─────────────────

async function stageRecipesQuality(page) {
  const tests = [
    { name: "Nut-free morning tea for toddlers", input: "A simple nut-free morning tea for 10 toddlers, no cooking required, ready in 10 minutes" },
    { name: "Vegetarian lunch for preschool", input: "A vegetarian, dairy-light lunch for 15 preschoolers that's easy to eat with a spoon" },
    { name: "Halal afternoon tea baking activity", input: "A halal afternoon tea snack for 12 kindergarten kids that doubles as a simple baking activity" },
  ];
  const results = [];
  for (const t of tests) {
    const r = { feature: "Recipes", test: t.name, savedUrls: [] };
    try {
      await page.goto("/recipes");
      await page.locator("textarea").first().fill(t.input);
      await page.getByRole("button", { name: "Generate recipes" }).click();
      await page.waitForSelector("text=Save recipe", { timeout: 60000 });
      const cards = page.locator("div.rounded-xl.border.border-coral-light.p-4").filter({ has: page.locator("h3") });
      r.recipesReturned = await cards.count();
      const firstCard = cards.first();
      r.fullContent = (await firstCard.innerText()).slice(0, 3000);
      await firstCard.getByRole("button", { name: "Save recipe" }).click();
      await page.waitForTimeout(1500);
      r.savedUrls.push(BASE_URL + "/recipes");
      r.status = "pass";
    } catch (err) {
      r.status = "fail";
      r.error = String(err).slice(0, 500);
    }
    results.push(r);
    log(r);
  }
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "recipes-quality.png"), fullPage: true });
  return results;
}

// ─────────────────────────────── Meal Planner — QUALITY re-test ────────────

async function stageMealPlannerQuality(page) {
  const results = [];
  const weekOffsets = [3, 4]; // weeks unlikely to have been touched before, for a genuinely empty grid
  for (const offset of weekOffsets) {
    const r = { feature: "Meal Planner", test: `Week +${offset} AI fill`, savedUrls: [] };
    try {
      const d = new Date();
      d.setDate(d.getDate() + offset * 7);
      const url = `/recipes/meal-planner?week=${d.toISOString().slice(0, 10)}`;
      await page.goto(url);
      await page.waitForLoadState("domcontentloaded");
      const fillBtn = page.getByRole("button", { name: /AI fill/i });
      await fillBtn.waitFor({ timeout: 10000 });
      const btnTextBefore = await fillBtn.textContent();
      r.emptySlotsBefore = btnTextBefore;
      await fillBtn.click();
      await page.waitForTimeout(30000); // 25 slots can take a while
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `meal-planner-quality-${offset}.png`), fullPage: true });
      const gridText = await page.locator("table").innerText();
      r.gridFull = gridText;
      const fillBtnAfter = page.getByRole("button", { name: /AI fill/i });
      r.emptySlotsAfter = await fillBtnAfter.textContent().catch(() => "N/A");
      r.savedUrls.push(BASE_URL + url);
      r.status = "pass";
    } catch (err) {
      r.status = "fail";
      r.error = String(err).slice(0, 800);
    }
    results.push(r);
    log(r);
  }
  return results;
}

// ─────────────────────────────── Posters AI wording — QUALITY re-test ──────

async function stagePostersAIQuality(page) {
  const tests = [
    { name: "Allergy alert poster", input: "Allergy alert poster — this room has children with severe nut and dairy allergies, no outside food please" },
    { name: "Bush Dance event flier", input: "Flier for our Bush Dance family event, Friday 24 July 3pm to 5pm, families bring a plate to share, gold coin donation" },
    { name: "Room rules poster", input: "Room rules poster for the Kookaburra Room toddlers — kind hands, walking feet, use your words, listen to educators" },
  ];
  const results = [];
  for (const t of tests) {
    const r = { feature: "Posters & Fliers (AI wording)", test: t.name, savedUrls: [] };
    try {
      await page.goto("/posters");
      await page.waitForTimeout(1500);
      await page.locator("textarea").first().fill(t.input);
      await page.getByRole("button", { name: "Generate wording" }).click();
      await page.waitForTimeout(15000);
      // Capture canvas text content via the JSON the canvas would save, but simplest is to screenshot + read visible text nodes
      const canvasArea = page.locator("div.flex-1.overflow-x-auto");
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `poster-ai-${results.length + 1}.png`), fullPage: true });
      const creditText = await page.locator("text=Background photo:").innerText().catch(() => null);
      r.imageCredit = creditText;
      const posterNameVal = await page.locator('input[value]').first().inputValue().catch(() => null);
      r.generatedTitle = posterNameVal;
      const saveBtn = page.getByRole("button", { name: /Save poster/i });
      await saveBtn.click();
      await page.waitForTimeout(3000);
      const savedLink = page.getByRole("link", { name: /Open edit \/ download/i });
      if ((await savedLink.count()) > 0) {
        const href = await savedLink.getAttribute("href");
        r.savedUrls.push(BASE_URL + href);
      }
      r.status = r.savedUrls.length > 0 ? "pass" : "fail";
    } catch (err) {
      r.status = "fail";
      r.error = String(err).slice(0, 500);
    }
    results.push(r);
    log(r);
  }
  return results;
}

// ─────────────────────────────── Worksheet image gen — retest ──────────────

async function stageWorksheetImageRetest(context) {
  const results = [];
  const cases = [
    { name: "activity_sheet image (cartoon dinosaur)", params: { type: "activity_sheet", title: "Dinosaur Torn Paper Collage", material: ["coloured paper", "glue", "scissors"], image_subject: "a friendly cartoon dinosaur" } },
    { name: "name_colouring image (rainbow)", params: { type: "name_colouring", title: "Name Colouring", name: "Amelia", image_subject: "a bright colourful rainbow with clouds" } },
  ];
  for (const c of cases) {
    const r = { feature: "Printable Sheets / Worksheets (image gen)", test: c.name, savedUrls: [] };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(c.params)) {
      if (Array.isArray(v)) v.forEach((val) => params.append(k, val));
      else params.set(k, v);
    }
    const url = `/worksheet?${params.toString()}`;
    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const genBtn = page.getByRole("button", { name: "Generate" });
      await genBtn.waitFor({ timeout: 10000 });
      await genBtn.click();
      await page.waitForTimeout(15000);
      r.savedUrls.push(BASE_URL + url);
      const imgs = await page.locator("img").all();
      let brokenCount = 0;
      for (const img of imgs) {
        const natW = await img.evaluate((el) => el.naturalWidth).catch(() => 0);
        if (natW === 0) brokenCount++;
      }
      r.imageCount = imgs.length;
      r.brokenImages = brokenCount;
      const bodyText = await page.locator("body").innerText();
      r.hasErrorText = /couldn.?t generate|failed|could not reach/i.test(bodyText);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `worksheet-image-retest-${c.params.type}.png`), fullPage: true });
      r.status = r.imageCount > 0 && brokenCount === 0 && !r.hasErrorText ? "pass" : "fail";
    } catch (err) {
      r.status = "fail";
      r.error = String(err).slice(0, 500);
    }
    await page.close();
    results.push(r);
    log(r);
  }
  return results;
}

// ─────────────────────────────── Main ──────────────────────────────────────

async function main() {
  const stage = process.argv[2] || "all";
  const browser = await chromium.launch();
  const { context, page } = await ensureLoggedIn(browser);
  page.setDefaultTimeout(30000);

  const all = [];
  try {
    if (stage === "generate" || stage === "all") all.push(...(await stageGenerate(page)));
    if (stage === "activities" || stage === "all") all.push(...(await stageActivities(page)));
    if (stage === "brainbreaks" || stage === "all") all.push(...(await stageBrainBreaks(page)));
    if (stage === "worksheets" || stage === "all") all.push(...(await stageWorksheets(page, context)));
    if (stage === "auslan" || stage === "all") all.push(...(await stageAuslan(page)));
    if (stage === "posters" || stage === "all") all.push(...(await stagePosters(page)));
    if (stage === "recipes" || stage === "all") all.push(...(await stageRecipes(page)));
    if (stage === "mealplanner" || stage === "all") all.push(...(await stageMealPlanner(page)));
    if (stage === "materials" || stage === "all") all.push(...(await stageMaterials(page)));
    if (stage === "worksheetsmanual") all.push(...(await stageWorksheetsManual(context)));
    if (stage === "postersmanual") all.push(...(await stagePostersManual(page)));
    if (stage === "aibroken") all.push(...(await stageAiBrokenEvidence(page)));
    if (stage === "materialsv2") all.push(...(await stageMaterialsV2(page)));
    if (stage === "activitiescheck") all.push(...(await stageActivitiesCheck(page)));
    if (stage === "generatequality") all.push(...(await stageGenerateQuality(page)));
    if (stage === "brainbreaksquality") all.push(...(await stageBrainBreaksQuality(page)));
    if (stage === "recipesquality") all.push(...(await stageRecipesQuality(page)));
    if (stage === "mealplannerquality") all.push(...(await stageMealPlannerQuality(page)));
    if (stage === "postersaiquality") all.push(...(await stagePostersAIQuality(page)));
    if (stage === "worksheetimageretest") all.push(...(await stageWorksheetImageRetest(context)));
  } finally {
    await browser.close();
  }

  console.log("FINAL::" + JSON.stringify(all, null, 2));
}

main().catch((err) => {
  console.error("FATAL", err);
  process.exit(1);
});
