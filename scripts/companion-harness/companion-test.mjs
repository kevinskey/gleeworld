// Headless reproduction of the viewer's audio companion: Apple search +
// YouTube load/play, against the real components served by the local Vite
// dev server (harness.html).
import { chromium } from 'playwright';

const BASE = 'http://localhost:8080/harness.html';
const YT_URL = 'https://www.youtube.com/watch?v=jNQXAC9IVRw'; // "Me at the zoo", 19s, public

const log = (...a) => console.log('[test]', ...a);

const browser = await chromium.launch();
const page = await browser.newPage();

page.on('console', (m) => {
  const t = m.text();
  if (/AudioContext|apple|musickit|youtube|error/i.test(t)) console.log('[console]', m.type(), t);
});
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('requestfailed', (r) => {
  if (!/favicon/.test(r.url())) console.log('[reqfail]', r.url().slice(0, 120), r.failure()?.errorText);
});

const probe = async () => JSON.parse(await page.locator('#probe').innerText());

await page.goto(BASE, { waitUntil: 'networkidle' });
log('page loaded, probe:', await probe());

// --- open the source picker popover ---
await page.getByTitle('Select audio source').click();
await page.getByText('Select Audio Source').waitFor({ timeout: 5000 });
log('source picker opened');

// --- Apple Music search ---
await page.getByPlaceholder('Search Apple Music…').fill('amazing grace');
// wait for results or error
const appleResult = await Promise.race([
  page.locator('button:has(img[src*="mzstatic"])').first().waitFor({ timeout: 15000 }).then(() => 'RESULTS'),
  page.locator('text=/search failed|token|unavailable/i').first().waitFor({ timeout: 15000 }).then(async () =>
    'ERROR: ' + (await page.locator('.text-rose-500').first().innerText().catch(() => '?'))),
]).catch((e) => 'TIMEOUT: ' + e.message.split('\n')[0]);
log('apple search →', appleResult);

let appleLoad = 'skipped';
if (appleResult === 'RESULTS') {
  await page.locator('button:has(img[src*="mzstatic"])').first().click();
  await page.waitForTimeout(4000);
  const p = await probe();
  appleLoad = JSON.stringify(p);
  log('after picking apple song, probe:', p);
}

// --- reopen picker for YouTube ---
const pickerOpen = await page.getByPlaceholder('Paste YouTube URL…').isVisible().catch(() => false);
if (!pickerOpen) {
  await page.getByTitle('Select audio source').click();
  await page.getByText('Select Audio Source').waitFor({ timeout: 5000 });
}
await page.getByPlaceholder('Paste YouTube URL…').fill(YT_URL);
await page.keyboard.press('Enter');
await page.waitForTimeout(3500); // watchdog flips playerReady at 2s
let p = await probe();
log('after loadYouTube, probe:', p);
const iframeCount = await page.locator('div[data-floating-youtube-player] iframe').count();
log('hidden yt iframe count:', iframeCount);

// --- press play ---
await page.getByRole('button', { name: 'Play', exact: true }).click();
// poll for isPlaying up to 12s
let playing = false;
for (let i = 0; i < 24; i++) {
  await page.waitForTimeout(500);
  p = await probe();
  if (p.isPlaying) { playing = true; break; }
}
log('after play click, probe:', p);
log('YOUTUBE PLAYING:', playing);

// duration/currentTime advancing?
let paused = false;
if (playing) {
  const t1 = p.currentTime;
  await page.waitForTimeout(3000);
  p = await probe();
  log('3s later currentTime:', p.currentTime, '(was', t1 + '), duration:', p.duration);

  // now pause — button should be in Pause state
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(400);
    p = await probe();
    if (!p.isPlaying) { paused = true; break; }
  }
  log('after pause click, isPlaying:', p.isPlaying);
}
console.log('youtube paused ok:', paused);

console.log('\n=== SUMMARY ===');
console.log('apple search:', appleResult);
console.log('apple load:', appleLoad);
console.log('youtube playing:', playing);

await browser.close();
