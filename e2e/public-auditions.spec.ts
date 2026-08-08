// End-to-end spec for anonymous audition submission.
//
// Appointments are deliberately absent: main's appointment-booking block
// completes a booking inline on the public page via gw_booking_public_submit,
// so there is no /book page to exercise.
//
// ─── Why this suite exists ───────────────────────────────────────────────────
//
// Every unit test around this feature passes with its dependencies faked, so
// none of them can see a broken seam. That is not hypothetical: the audition
// confirmation email had green unit tests while being physically unsendable,
// because public-intake posted a body shape the receiving function does not
// destructure. Only a real browser run catches that class of defect.
//
// The load-bearing test is the last one. It completes an audition as a stranger
// and then SIGNS IN with the credentials that submission created. Nothing else
// proves the whole chain — browser → edge function → database → account
// provisioning → auto-confirm — actually works.
//
// ─── Prerequisites ───────────────────────────────────────────────────────────
//
//   1. Migration applied:
//        supabase/migrations/20260806120000_public_intake.sql
//   2. Edge functions deployed:  bash scripts/deploy-functions.sh
//        public-intake, send-booking-confirmation-email
//   3. Frontend deployed:        bash scripts/deploy-frontend.sh
//
//   ORDER MATTERS. Functions before the migration leaves the rate-limit table
//   missing, and public-intake is deliberately unauthenticated — that rate
//   limit is the only protection it has.
//
//   4. Seeding env (audition test only — the other three need nothing):
//        GW_E2E_SUPABASE_URL      https://supabase.gleeworld.org
//        GW_E2E_SERVICE_ROLE_KEY  service_role JWT
//        GW_E2E_TENANT_ID         tenant uuid the run targets
//
//      Without these the audition test SKIPS with a reason rather than
//      failing, so a partial environment does not read as a broken feature.
//
// ─── Why seeding is required ─────────────────────────────────────────────────
//
// The date picker reads `audition_time_blocks` (is_active = true). Measured
// 2026-08-08: there are ZERO active rows platform-wide, so no date can be
// chosen and the interview cannot be completed — by a test or by a real
// visitor. This suite seeds one block for the run and deletes it afterwards.
//
// ─── How to run ──────────────────────────────────────────────────────────────
//
//   Against a tenant subdomain (NOT the apex — the apex renders marketing):
//     PLAYWRIGHT_BASE_URL=https://demo.gleeworld.org \
//     GW_E2E_SUPABASE_URL=https://supabase.gleeworld.org \
//     GW_E2E_SERVICE_ROLE_KEY=… GW_E2E_TENANT_ID=… \
//     npx playwright test e2e/public-intake.spec.ts
//
//   Watch it: add HEADED=1
//
// ─── What it leaves behind ───────────────────────────────────────────────────
//
// The audition test creates a REAL account and audition row. Emails carry a
// gw-e2e+ tag so they are trivial to find:
//
//   DELETE FROM audition_applications WHERE email LIKE 'gw-e2e+%@example.com';
//   -- then remove the matching auth users via the admin API
//
// Run it against demo, never a customer's tenant.

import { test, expect, type Page } from '@playwright/test';

const SUPABASE_URL = process.env.GW_E2E_SUPABASE_URL ?? '';
const SERVICE_KEY = process.env.GW_E2E_SERVICE_ROLE_KEY ?? '';
const TENANT_ID = process.env.GW_E2E_TENANT_ID ?? '';
const canSeed = !!(SUPABASE_URL && SERVICE_KEY && TENANT_ID);

/** Unique per run, so the per-email rate limit and the existing-account branch
 *  cannot make repeat runs flaky. */
const RUN_ID = `${Date.now()}`;
const EMAIL = `gw-e2e+${RUN_ID}@example.com`;
const PASSWORD = 'e2e-correct-horse-battery';

/** 50+ words — canLeavePage('personal') counts them. */
const PERSONALITY = Array.from({ length: 60 }, (_, i) => `word${i}`).join(' ');

async function rest(path: string, init: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init.headers ?? {}),
    },
  });
}

let seededBlockId: string | null = null;

/** A visitor with no session at all. Reusing a signed-in context would hide the
 *  exact bug this feature removes. */
async function asStranger(page: Page) {
  await page.context().clearCookies();
  await page.addInitScript(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* storage may be blocked; cleared cookies are what matter */
    }
  });
}

test.describe('public auditions — no login wall', () => {
  test.beforeEach(async ({ page }) => {
    await asStranger(page);
  });

  test('/auditions opens on a question, not on a password', async ({ page }) => {
    await page.goto('/auditions');
    await expect(page).not.toHaveURL(/\/auth/);

    // The old flow put account creation FIRST, so six pages of answers were
    // lost when the session turned out not to exist. The account step is last
    // now: the first screen must ask for a name and show no password field.
    await expect(page.getByLabel(/first name|your name/i).first()).toBeVisible();
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
  });

  test.describe('full audition submission', () => {
    test.beforeAll(async () => {
      if (!canSeed) return;
      // The picker needs an active time block; there are none in the wild.
      const start = new Date();
      start.setDate(start.getDate() + 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 3);
      const res = await rest('audition_time_blocks', {
        method: 'POST',
        body: JSON.stringify({
          start_date: start.toISOString().slice(0, 10),
          end_date: end.toISOString().slice(0, 10),
          is_active: true,
          appointment_duration_minutes: 15,
          tenant_id: TENANT_ID,
        }),
      });
      const rows = await res.json().catch(() => null);
      seededBlockId = Array.isArray(rows) && rows[0]?.id ? rows[0].id : null;
    });

    test.afterAll(async () => {
      // Leave the environment as we found it, even if the test failed.
      if (seededBlockId) {
        await rest(`audition_time_blocks?id=eq.${seededBlockId}`, { method: 'DELETE' });
      }
    });

    test('finishing the audition registers a usable account', async ({ page }) => {
      test.skip(
        !canSeed,
        'needs GW_E2E_SUPABASE_URL, GW_E2E_SERVICE_ROLE_KEY and GW_E2E_TENANT_ID to seed an audition time block',
      );
      expect(seededBlockId, 'seeding an audition time block failed').toBeTruthy();

      await page.goto('/auditions');
      const next = () => page.getByRole('button', { name: /next|continue/i }).first();

      // 1 — basic
      await page.getByLabel(/first name/i).fill('E2E');
      await page.getByLabel(/last name/i).fill('Visitor');
      await page.getByLabel(/^email/i).fill(EMAIL);
      await page.getByLabel(/phone/i).fill('5555550123');
      await next().click();

      // 2 — musical background: sectionType is the only hard requirement.
      await page.getByLabel(/^vocal$/i).first().click();
      await next().click();

      // 3 — music skills: nothing required.
      await next().click();

      // 4 — personal: 50-word minimum, counted by canLeavePage.
      await page.getByLabel(/describe your personality/i).fill(PERSONALITY);
      await next().click();

      // 5 — scheduling: date, time, shirt size, and a selfie. The selfie is
      // real: Chrome runs with --use-fake-device-for-media-stream (see
      // playwright.config.ts), so getUserMedia resolves against a synthetic
      // camera and capturePhoto() writes a genuine data URL.
      await page.getByRole('button', { name: /choose|select|pick|date/i }).first().click();
      await page.locator('[role="gridcell"]:not([aria-disabled="true"])').first().click();

      await page.getByLabel(/preferred time/i).click();
      await page.getByRole('option').first().click();

      await page.getByLabel(/^size/i).click();
      await page.getByRole('option', { name: 'M', exact: true }).click();

      const camera = page.getByRole('button', { name: /start camera/i });
      await camera.click();
      const shoot = page.getByRole('button', { name: /take photo/i });
      await expect(shoot).toBeVisible({ timeout: 20_000 });
      await shoot.click();
      await expect(page.getByRole('button', { name: /retake/i })).toBeVisible({
        timeout: 20_000,
      });
      await next().click();

      // 6 — account, LAST. This is the reordering the feature exists for.
      const pw = page.locator('input[type="password"]');
      await expect(
        pw.first(),
        'the account step must be reachable at the END of the interview',
      ).toBeVisible();
      await pw.nth(0).fill(PASSWORD);
      if (await pw.nth(1).isVisible().catch(() => false)) await pw.nth(1).fill(PASSWORD);

      await page.getByRole('button', { name: /submit|finish/i }).first().click();

      await expect(
        page.getByText(/congratulation|thank you|received/i).first(),
      ).toBeVisible({ timeout: 30_000 });
      await expect(page).not.toHaveURL(/\/auth/);

      // The real assertion: the account exists AND is confirmed. Had
      // public-intake used a plain signUp instead of admin-createUser with
      // email_confirm, this sign-in fails and the visitor is stranded —
      // precisely the bug this feature was built to remove.
      await page.goto('/auth');
      await page.getByLabel(/^email/i).fill(EMAIL);
      await page.locator('input[type="password"]').first().fill(PASSWORD);
      await page.getByRole('button', { name: /sign in|log in/i }).first().click();

      await expect(
        page,
        'the account the audition created should sign in with no email confirmation step',
      ).toHaveURL(/\/dashboard|\/auditioner/, { timeout: 30_000 });
    });
  });
});
