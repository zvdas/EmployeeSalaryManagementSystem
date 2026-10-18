// Records a walkthrough of the deployed app (see ../demo-script.md) to demo.webm.
//
//   npm install && npm run setup && npm run record   # records the live Render site
//   BASE_URL=http://localhost:3000 npm run record  # or any other instance
//
// Uses the locally installed Chrome (no browser download). The run is safe to repeat: it only
// seeds an empty database, and the employee it creates gets a unique email and is deleted again.
import { mkdirSync, renameSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL ?? 'https://acme-salary-management-ifym.onrender.com';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.join(HERE, 'demo.webm');
const VIEWPORT = { width: 1366, height: 820 };

const SHOTS_DIR = process.env.DEMO_SCREENSHOTS; // optional: save a frame per step for review

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Draws a visible cursor, because recorded videos don't show the real mouse pointer. */
function installCursor() {
  const add = () => {
    const dot = document.createElement('div');
    dot.id = 'demo-cursor';
    Object.assign(dot.style, {
      position: 'fixed', left: '-40px', top: '-40px', width: '22px', height: '22px',
      marginLeft: '-11px', marginTop: '-11px', borderRadius: '50%', zIndex: '2147483647',
      background: 'rgba(220, 38, 38, 0.35)', border: '2px solid rgba(220, 38, 38, 0.9)',
      pointerEvents: 'none', transition: 'transform 0.1s',
    });
    document.body.appendChild(dot);
    window.addEventListener('mousemove', (e) => {
      dot.style.left = `${e.clientX}px`;
      dot.style.top = `${e.clientY}px`;
    }, true);
    window.addEventListener('mousedown', () => (dot.style.transform = 'scale(0.7)'), true);
    window.addEventListener('mouseup', () => (dot.style.transform = 'scale(1)'), true);
  };
  if (document.body) add();
  else document.addEventListener('DOMContentLoaded', add);
}

function createDemo(page) {
  /** Glides the cursor to an element, then clicks it, so viewers can follow along. */
  async function click(locator, { wait = 700 } = {}) {
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 20 });
      await pause(250);
    }
    await locator.click();
    await pause(wait);
  }

  async function type(locator, text) {
    await click(locator, { wait: 150 });
    await locator.fill('');
    await locator.pressSequentially(text, { delay: 55 });
    await pause(400);
  }

  /** Picks an option in an Angular Material select identified by its label. */
  async function choose(scope, label, option) {
    await click(scope.getByRole('combobox', { name: label }), { wait: 500 });
    await click(page.getByRole('option', { name: option, exact: true }), { wait: 900 });
  }

  async function scrollTo(locator, { wait = 2500 } = {}) {
    await locator.evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    await pause(wait);
  }

  let shot = 0;
  async function snapshot(label) {
    if (!SHOTS_DIR) return;
    mkdirSync(SHOTS_DIR, { recursive: true });
    const file = `${String(++shot).padStart(2, '0')}-${label}.png`;
    await page.screenshot({ path: path.join(SHOTS_DIR, file) });
  }

  return { click, type, choose, scrollTo, snapshot };
}

async function wakeUp() {
  // Free-tier Render instances sleep when idle; the first request can take up to a minute.
  for (let attempt = 1; attempt <= 12; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(20_000) });
      if (res.ok) return;
    } catch {
      // still waking up
    }
    console.log(`Waiting for ${BASE_URL} to wake up (attempt ${attempt})...`);
    await pause(5_000);
  }
  throw new Error(`${BASE_URL} did not respond`);
}

/**
 * The walkthrough shows the 10k dataset, so start from an empty DB (it seeds) or a full one.
 * Returns whether seeding is needed, decided from the API rather than from what is on screen.
 */
async function needsSeeding() {
  const res = await fetch(`${BASE_URL}/api/seed/status`);
  const { employeeCount } = await res.json();
  if (employeeCount !== 0 && employeeCount !== 10_000) {
    throw new Error(
      `The database has ${employeeCount} employees; the demo needs 0 (it will seed 10,000) ` +
        'or exactly 10,000. Reset the database (on Render: restart the service) and try again.',
    );
  }
  return employeeCount === 0;
}

async function existingEmail() {
  const res = await fetch(`${BASE_URL}/api/employees?pageSize=1&sortBy=employeeCode`);
  const body = await res.json();
  return body.items[0].email;
}

async function main() {
  await wakeUp();
  const seed = await needsSeeding();
  const videoDir = path.join(HERE, '.video-tmp');
  mkdirSync(videoDir, { recursive: true });

  const browser = await chromium.launch({ channel: 'chrome' });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: videoDir, size: VIEWPORT },
    acceptDownloads: true,
    locale: 'en-US',
  });
  await context.addInitScript(installCursor);
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  const { click, type, choose, scrollTo, snapshot } = createDemo(page);
  const runId = Date.now().toString(36);

  try {
    // 1. Empty database: the app offers to load sample data.
    await page.goto(`${BASE_URL}/employees`);
    if (seed) {
      // The dialog opens after the app's own status request, so wait for it to appear.
      const seedButton = page.getByRole('button', { name: 'Load full 10,000' });
      await seedButton.waitFor({ state: 'visible' });
      await pause(3500);
      await snapshot('seed-prompt');
      await click(seedButton, { wait: 500 });
      await page.getByText(/Loaded 10,000 employees/).waitFor();
      await pause(2500);
    }
    await page.getByText(/of 10,?000/).waitFor();
    await pause(2500);
    await snapshot('employee-list');

    // 2-4. Search, dependent filters, sorting by USD salary.
    const search = page.getByRole('textbox', { name: 'Search' });
    await type(search, 'sharma');
    await pause(2500);
    await type(search, '');
    await pause(1200);
    await choose(page, 'Country', 'India');
    await choose(page, 'Department', 'Engineering');
    await choose(page, 'Job title', 'Software Engineer');
    await pause(1500);
    const salaryHeader = page.getByRole('columnheader', { name: /Salary/ });
    await click(salaryHeader, { wait: 1500 });
    await click(salaryHeader, { wait: 2500 });
    await snapshot('filtered-sorted');
    await click(page.getByRole('button', { name: /Clear filters/ }), { wait: 2000 });

    // 5. Add an employee: client-side validation first, then a valid save.
    // A name the seed never generates, and a unique email, so only the demo's own row is touched.
    const name = 'Ines Valdivia-Kato';
    const email = `ines.demo.${runId}@acme.example`;
    await click(page.getByRole('button', { name: 'Add employee' }));
    let dialog = page.getByRole('dialog');
    await type(dialog.getByRole('textbox', { name: 'Full name' }), 'P');
    await type(dialog.getByRole('textbox', { name: 'Email' }), 'not-an-email');
    await type(dialog.getByRole('spinbutton', { name: 'Annual salary' }), '0');
    await type(dialog.getByRole('textbox', { name: 'Hire date' }), '1/1/2099');
    await click(dialog.getByRole('button', { name: 'Add employee' }), { wait: 3000 });
    await snapshot('validation-errors');

    await type(dialog.getByRole('textbox', { name: 'Full name' }), name);
    await type(dialog.getByRole('textbox', { name: 'Email' }), email);
    await choose(dialog, 'Department', 'Engineering');
    await choose(dialog, 'Job title', 'Senior Software Engineer');
    await choose(dialog, 'Country', 'Germany');
    await type(dialog.getByRole('spinbutton', { name: 'Annual salary' }), '98000');
    await type(dialog.getByRole('textbox', { name: 'Hire date' }), '3/15/2024');
    await pause(1500);
    await click(dialog.getByRole('button', { name: 'Add employee' }), { wait: 2500 });
    await dialog.waitFor({ state: 'detached' });

    // Find the new employee.
    await type(search, email);
    await page.getByRole('button', { name: `Edit ${name}` }).waitFor();
    await pause(2500);

    // 6-7. Edit: a duplicate email is rejected by the server, inline; then a salary change.
    await click(page.getByRole('button', { name: `Edit ${name}` }));
    dialog = page.getByRole('dialog');
    const emailInput = dialog.getByRole('textbox', { name: 'Email' });
    await type(emailInput, await existingEmail());
    await click(dialog.getByRole('button', { name: 'Save changes' }), { wait: 3000 });
    await snapshot('duplicate-email');
    await type(emailInput, email);
    await type(dialog.getByRole('spinbutton', { name: 'Annual salary' }), '104000');
    await click(dialog.getByRole('button', { name: 'Save changes' }), { wait: 2500 });
    await dialog.waitFor({ state: 'detached' });
    await pause(1500);

    // Delete it again (with confirmation), which also keeps repeated runs clean.
    await click(page.getByRole('button', { name: `Delete ${name}` }));
    await pause(1200);
    await click(page.getByRole('dialog').getByRole('button', { name: 'Delete' }), { wait: 2500 });
    await type(search, '');
    await pause(1200);

    // 8. Export the filtered list as CSV.
    await choose(page, 'Country', 'Germany');
    const download = page.waitForEvent('download');
    await click(page.getByRole('button', { name: /Export CSV/ }), { wait: 500 });
    await (await download).cancel();
    await pause(2000);
    await click(page.getByRole('button', { name: /Clear filters/ }), { wait: 1500 });

    // 9-12. Insights.
    await click(page.getByRole('link', { name: /Insights/ }), { wait: 4000 });
    await snapshot('insights-kpis');
    await scrollTo(page.getByRole('heading', { name: 'By country' }), { wait: 4500 });
    await snapshot('by-country');
    const jobTitles = page.locator('mat-card', {
      has: page.getByRole('heading', { name: 'Job titles in a country' }),
    });
    await scrollTo(jobTitles, { wait: 1500 });
    await choose(jobTitles, 'Country', 'Germany');
    await pause(3000);
    await snapshot('job-titles-germany');
    const departments = page.locator('mat-card', {
      has: page.getByRole('heading', { name: 'Departments' }),
    });
    await scrollTo(departments, { wait: 1500 });
    await choose(departments, 'Country', 'United States');
    await pause(3000);
    await snapshot('departments-us');
    await scrollTo(page.getByRole('heading', { name: 'Salary distribution (USD)' }), {
      wait: 4500,
    });
    await snapshot('distribution');

    // 13. Swagger UI: run an endpoint from the docs.
    await page.goto(`${BASE_URL}/api/docs/`);
    await pause(3000);
    const summaryOp = page.locator('.opblock-summary', { hasText: '/insights/summary' });
    await click(summaryOp, { wait: 1500 });
    await click(page.getByRole('button', { name: 'Try it out' }), { wait: 1000 });
    await click(page.getByRole('button', { name: 'Execute' }), { wait: 1500 });
    await scrollTo(page.locator('.responses-wrapper').first(), { wait: 5000 });
    await snapshot('swagger');
  } finally {
    const video = page.video();
    await context.close(); // finalises the recording
    if (video) renameSync(await video.path(), OUTPUT);
    await browser.close();
    rmSync(videoDir, { recursive: true, force: true });
  }
  console.log(`Saved ${path.relative(process.cwd(), OUTPUT)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
