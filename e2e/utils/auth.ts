// Auth helpers for GleeWorld e2e specs.
//
// Uses the demo tenant credentials that ship with the app. Password on
// record for demo@ was `GleeDemo2026!` per prior harness sessions —
// verify against reality before running against prod. demo-admin@ was
// STALE as of 2026-07-04; use demo@ unless you've refreshed.

import { expect, type Page } from '@playwright/test';

export const DEMO_EMAIL = process.env.GW_E2E_EMAIL || 'demo@gleeworld.org';
export const DEMO_PASSWORD = process.env.GW_E2E_PASSWORD || 'GleeDemo2026!';

/** Signs in via /auth. Waits until the app-shell is visible before returning. */
export async function signIn(
  page: Page,
  email: string = DEMO_EMAIL,
  password: string = DEMO_PASSWORD,
): Promise<void> {
  await page.goto('/auth');
  await page.getByLabel(/email/i).first().fill(email);
  await page.getByLabel(/password/i).first().fill(password);
  // Sign In / Continue / Log In — one of these labels will match.
  const submit = page
    .getByRole('button', { name: /sign in|log in|continue/i })
    .first();
  await submit.click();
  // A signed-in user lands in the SPA shell; wait for the dashboard nav.
  await expect(page.locator('body')).not.toHaveClass(/auth-page/i, { timeout: 20_000 });
  await page.waitForURL(/dashboard|studio|fan|academy|admin/, { timeout: 20_000 });
}
