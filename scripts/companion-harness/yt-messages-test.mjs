// Log every postMessage arriving from YouTube to see which events the
// embed actually delivers (onStateChange vs infoDelivery.playerState).
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();

await page.addInitScript(() => {
  window.__ytEvents = [];
  window.addEventListener('message', (e) => {
    if (!/youtube/.test(e.origin)) return;
    try {
      const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      window.__ytEvents.push({
        event: d.event,
        info: d.event === 'infoDelivery'
          ? { playerState: d.info?.playerState, currentTime: d.info?.currentTime, duration: d.info?.duration }
          : d.info,
      });
    } catch {}
  });
});

await page.goto('http://localhost:8080/harness.html', { waitUntil: 'networkidle' });
await page.getByTitle('Select audio source').click();
await page.getByPlaceholder('Paste YouTube URL…').fill('https://www.youtube.com/watch?v=jNQXAC9IVRw');
await page.keyboard.press('Enter');
await page.waitForTimeout(3000);
await page.getByRole('button', { name: 'Play', exact: true }).click();
await page.waitForTimeout(5000);

const events = await page.evaluate(() => window.__ytEvents);
const summary = {};
for (const e of events) summary[e.event] = (summary[e.event] || 0) + 1;
console.log('event counts:', summary);
console.log('states seen in infoDelivery:', [...new Set(events.filter(e => e.event === 'infoDelivery').map(e => e.info?.playerState))]);
console.log('sample infoDelivery:', events.filter(e => e.event === 'infoDelivery' && e.info?.playerState === 1).slice(0, 2));
console.log('onStateChange events:', events.filter(e => e.event === 'onStateChange'));
await browser.close();
