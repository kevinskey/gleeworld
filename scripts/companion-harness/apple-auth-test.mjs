// Verifies the Apple Music sign-in → re-queue path with a mocked MusicKit:
// pick a song while signed out, click "Sign in to Apple Music", and assert
// that setQueue runs BEFORE play (the empty-queue bug this fixes).
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', (m) => { if (/AudioContext|apple/i.test(m.text())) console.log('[console]', m.text()); });

await page.addInitScript(() => {
  const kit = {
    musicUserToken: null,
    _queue: null,
    calls: [],
    addEventListener() {},
    async authorize() { this.musicUserToken = 'fake-user-token'; return 'ok'; },
    async setQueue(q) { this.calls.push(['setQueue', JSON.stringify(q)]); this._queue = q; },
    async play() {
      this.calls.push(['play', this._queue ? 'QUEUED' : 'EMPTY']);
      if (!this._queue) throw new Error('play() on empty queue');
    },
    async pause() { this.calls.push(['pause']); },
    async stop() {},
    seekToTime() {},
  };
  window.__mockKit = kit;
  window.MusicKit = {
    configure: async () => {},
    getInstance: () => kit,
  };
});

await page.goto('http://localhost:8080/harness.html', { waitUntil: 'networkidle' });
await page.getByTitle('Select audio source').click();
await page.getByPlaceholder('Search Apple Music…').fill('amazing grace');
await page.locator('button:has(img[src*="mzstatic"])').first().waitFor({ timeout: 15000 });
await page.locator('button:has(img[src*="mzstatic"])').first().click();
await page.waitForTimeout(2000);

const probe = async () => JSON.parse(await page.locator('#probe').innerText());
console.log('after pick (signed out):', await probe());

// The sign-in button should be visible in the strip
const signIn = page.getByRole('button', { name: /Sign in to Apple Music/ });
await signIn.waitFor({ timeout: 5000 });
await signIn.click();
await page.waitForTimeout(2500);

const p = await probe();
const calls = await page.evaluate(() => window.__mockKit.calls);
console.log('after sign-in:', p);
console.log('musickit calls:', calls);

const queuedThenPlayed =
  calls.some((c) => c[0] === 'setQueue') &&
  calls.some((c) => c[0] === 'play' && c[1] === 'QUEUED');
console.log('\n=== SUMMARY ===');
console.log('setQueue before play (no empty-queue play):', queuedThenPlayed);
console.log('needsAuth cleared:', p.appleMusicNeedsAuth === false);
console.log('isPlaying:', p.isPlaying);
await browser.close();
