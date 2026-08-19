// Playwright config for GleeWorld end-to-end audits.
//
// Runs against a LOCAL preview of the built dist by default. Point at
// prod (demo.gleeworld.org) by overriding PLAYWRIGHT_BASE_URL.
//
// Chrome flags:
//   --use-fake-ui-for-media-stream  ─ auto-accept mic permission prompt
//   --use-fake-device-for-media-stream ─ synthesize mic so audio flows
//   --autoplay-policy=no-user-gesture-required ─ let audio elements play
//                                                without a click
//
// Runs headless by default; flip HEADED=1 to watch the browser. Use
// npm run e2e (defined in package.json after `npm install --legacy-peer-deps
// -D @playwright/test playwright-core`).

import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4199';
const headed = process.env.HEADED === '1';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      headless: !headed,
      channel: 'chrome',
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--autoplay-policy=no-user-gesture-required',
      ],
    },
  },
  projects: [
    {
      name: 'chrome',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
