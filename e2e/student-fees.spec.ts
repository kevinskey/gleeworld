// End-to-end spec for the Student Fees feature (Task 17).
//
// STATUS: READY TO RUN — requires post-Task-18 deploy of the gw_student_fees
// migration + Stripe Connect webhook to be live on the target tenant.
// DO NOT run npm run e2e against prod until that deploy is confirmed.
//
// ─── Pre-requisites ──────────────────────────────────────────────────────────
//
//   1. Migration deployed (Task 1 / Task 18):
//        gw_student_fees, gw_payment_plans, gw_fee_templates tables must exist.
//
//   2. Stripe test-mode Connect account (Task 9 / Task 10):
//        VITE_STRIPE_PUBLISHABLE_KEY must be a test-mode key (pk_test_…).
//        The tenant must have a connected Stripe account in test mode.
//        Use card 4242 4242 4242 4242, exp 12/34, CVC 123.
//
//   3. Env vars for the seed helper (set in shell or .env.e2e):
//        GW_E2E_SUPABASE_URL       — https://supabase.gleeworld.org
//        GW_E2E_SERVICE_ROLE_KEY   — service_role JWT
//        GW_E2E_DEMO_USER_ID       — UUID of demo@gleeworld.org on tenant A
//        GW_E2E_TENANT_A_ID        — tenant_id UUID for tenant A (optional, skips lookup)
//        GW_E2E_TENANT_B_ID        — tenant_id UUID for tenant B (optional, skips lookup)
//        GW_E2E_TENANT_A_SLUG      — slug for tenant A   (default: demo)
//        GW_E2E_TENANT_B_SLUG      — slug for tenant B   (default: tenant-b)
//        GW_E2E_TENANT_B_USER_ID   — UUID of demo user on tenant B
//        GW_E2E_TENANT_B_EMAIL     — login email for tenant B's demo user
//        GW_E2E_TENANT_B_PASSWORD  — login password for tenant B's demo user
//
// ─── How to run ──────────────────────────────────────────────────────────────
//
//   Against the demo tenant (post-deploy):
//     export PLAYWRIGHT_BASE_URL=https://demo.gleeworld.org
//     export GW_E2E_SUPABASE_URL=https://supabase.gleeworld.org
//     export GW_E2E_SERVICE_ROLE_KEY=<service_role_jwt>
//     export GW_E2E_DEMO_USER_ID=<uuid>
//     export GW_E2E_TENANT_A_SLUG=demo
//     export GW_E2E_TENANT_B_SLUG=<another-tenant-slug>
//     export GW_E2E_TENANT_B_EMAIL=demo@<other-tenant>.gleeworld.org
//     export GW_E2E_TENANT_B_PASSWORD=<password>
//     npm run e2e -- --grep "student fees"
//
//   Headed (watch it run):
//     HEADED=1 npm run e2e:headed -- --grep "student fees"
//
//   Single spec:
//     npx playwright test e2e/student-fees.spec.ts
//
// ─── Stripe notes ────────────────────────────────────────────────────────────
//
//   Spec 1 drives Stripe Checkout in test mode. The checkout URL will be on
//   checkout.stripe.com (hosted Checkout) or an embedded checkout iframe
//   depending on how PayFeeButton is wired (Task 10 / Task 9).
//
//   If the tenant uses Stripe Connect Express (as established in partner
//   marketplace), the Checkout session must include `on_behalf_of` or
//   `transfer_data.destination` pointing at the tenant's connected account ID.
//   The spec asserts the redirect happens; it does NOT mock Stripe — it uses
//   real test-mode checkout so webhook delivery (Task 11) is exercised too.
//
//   After checkout, the Stripe webhook fires → edge function updates
//   gw_student_fees.status = 'paid' + paid_at + stripe_payment_intent_id.
//   The spec then re-checks the row via the UI (the page re-loads or
//   subscribes to realtime). Allow up to 30s for webhook propagation.

import { test, expect, type Page } from '@playwright/test';
import {
  seedFeeForDemoUser,
  cleanupSeededFees,
  tenantASlug,
  tenantBSlug,
} from './helpers/feeSeed';
import { signIn, DEMO_EMAIL, DEMO_PASSWORD } from './utils/auth';

// ─────────────────────────────────────────────────────────────────────────────
// Spec 1: Student pay flow
// ─────────────────────────────────────────────────────────────────────────────

test.describe('student fees', () => {
  test.afterEach(async () => {
    await cleanupSeededFees();
  });

  test('student sees owed balance and can pay via Stripe test checkout', async ({ page }) => {
    // 1. Seed a $25 fee for the demo user on tenant A.
    const _feeId = await seedFeeForDemoUser({
      amount: 25,
      name: 'E2E Trip Deposit',
      category: 'trip',
      tenantSlug: tenantASlug,
    });

    // 2. Sign in as demo student.
    await signIn(page, DEMO_EMAIL, DEMO_PASSWORD);

    // 3. Navigate to My Fees page.
    await page.goto('/dashboard/my-fees');

    // 4. Fee row is visible with correct amount and name.
    await expect(page.getByText('E2E Trip Deposit')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/\$25(\.00)?/, { exact: false })).toBeVisible({ timeout: 10_000 });

    // The fee should be in a "pending" / "owed" state (not already paid).
    // The exact label depends on StudentFeeCard — look for absence of "Paid" badge.
    await expect(page.getByText(/^paid$/i)).not.toBeVisible();

    // 5. Click the Pay button for this fee.
    //    StudentFeeCard wraps each fee in a card; the Pay button is co-located.
    //    We scope to the card containing the fee name to avoid clicking a wrong
    //    Pay button if other fees exist on the demo tenant.
    const feeCard = page.locator('[data-testid="fee-card"], .fee-card, li, article').filter({
      has: page.getByText('E2E Trip Deposit'),
    }).first();

    // Fallback: if the card locator is too broad, click the first Pay button.
    const payBtn = feeCard.getByRole('button', { name: /pay/i }).first();
    const payBtnFallback = page.getByRole('button', { name: /pay/i }).first();
    const btn = (await payBtn.isVisible({ timeout: 3_000 }).catch(() => false))
      ? payBtn
      : payBtnFallback;

    // Clicking Pay triggers a redirect to Stripe Checkout.
    // We allow up to 20s for the Stripe redirect to resolve.
    const [stripeResponse] = await Promise.all([
      page.waitForURL(/checkout\.stripe\.com|pay\.stripe\.com/, { timeout: 20_000 }),
      btn.click(),
    ]);

    // 6. Complete Stripe test checkout.
    //    Stripe Checkout renders in the same tab for hosted checkout.
    await fillStripeTestCard(page);

    // 7. Stripe redirects back to the app after successful payment.
    //    The success_url is typically /dashboard/my-fees?payment=success or similar.
    await page.waitForURL(/dashboard\/my-fees|fees.*success|payment.*success/, {
      timeout: 30_000,
    });

    // 8. The fee row now shows "Paid" status.
    //    The webhook may take a few seconds to propagate; retry-aware assertion.
    await expect(page.getByText(/paid/i).first()).toBeVisible({ timeout: 30_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Spec 2: Tenant isolation
  // ─────────────────────────────────────────────────────────────────────────

  test('tenant isolation — tenant B cannot see tenant A fees', async ({ page }) => {
    // 1. Seed a fee on tenant A only.
    await seedFeeForDemoUser({
      tenantSlug: tenantASlug,
      amount: 500,
      name: 'Only A sees this',
      category: 'tuition',
    });

    // 2. Sign in as tenant B's demo user.
    //    Tenant B is a separate GleeWorld tenant with its own subdomain.
    const tenantBEmail = process.env.GW_E2E_TENANT_B_EMAIL;
    const tenantBPassword = process.env.GW_E2E_TENANT_B_PASSWORD;

    if (!tenantBEmail || !tenantBPassword) {
      test.skip(
        'GW_E2E_TENANT_B_EMAIL / GW_E2E_TENANT_B_PASSWORD not set — skipping isolation test',
      );
      return;
    }

    // Navigate to tenant B's subdomain.
    const tenantBBase = `https://${tenantBSlug}.gleeworld.org`;
    await page.goto(`${tenantBBase}/auth`);
    await page.getByLabel(/email/i).first().fill(tenantBEmail);
    await page.getByLabel(/password/i).first().fill(tenantBPassword);
    await page.getByRole('button', { name: /sign in|log in|continue/i }).first().click();
    await page.waitForURL(/dashboard|studio|fan|academy|admin/, { timeout: 20_000 });

    // 3. Navigate to My Fees on tenant B.
    await page.goto(`${tenantBBase}/dashboard/my-fees`);

    // 4. The fee seeded on tenant A must NOT appear on tenant B's page.
    //    Give the page time to load before asserting absence.
    await page.waitForLoadState('networkidle', { timeout: 15_000 });
    await expect(page.getByText('Only A sees this')).not.toBeVisible({ timeout: 10_000 });

    // 5. Extra guard: also verify the fee is NOT returned by a direct API call
    //    made with tenant B's auth token. We evaluate inside the page context so
    //    the Supabase client carries tenant B's session cookie/JWT.
    const leakedFees = await page.evaluate(async (feeName: string) => {
      // The app exposes its Supabase client on window in dev/e2e builds only.
      // If not available we skip the API-level assertion.
      const w = window as unknown as { __gw_supabase?: { from: (...a: unknown[]) => unknown } };
      if (!w.__gw_supabase) return null;
      const { data } = await (w.__gw_supabase as any)
        .from('gw_student_fees')
        .select('id, name')
        .eq('name', feeName);
      return data ?? [];
    }, 'Only A sees this');

    if (leakedFees !== null) {
      // If the client was accessible, assert the query returned nothing.
      expect(
        leakedFees,
        'RLS must prevent tenant B from reading tenant A fees via Supabase JS client',
      ).toHaveLength(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fill in the Stripe test card on the Stripe-hosted Checkout page.
 *
 * Stripe Checkout field placeholders and labels differ slightly between
 * Stripe versions; we try the most common selectors with fallbacks.
 *
 * IMPORTANT: This only works in Stripe TEST MODE (pk_test_…).
 * Using this card against a live-mode key will fail (which is intended —
 * you should not be running E2E with real money).
 */
async function fillStripeTestCard(page: Page): Promise<void> {
  // Stripe Checkout may briefly show a loading spinner.
  await page.waitForLoadState('domcontentloaded', { timeout: 20_000 });

  // Card number — Stripe uses a hidden iframe; try direct input first,
  // then fall back to the iframe approach if needed.
  const cardNumber = page.getByPlaceholder('1234 1234 1234 1234').or(
    page.getByLabel(/card number/i),
  );
  const cardExpiry = page.getByPlaceholder('MM / YY').or(page.getByLabel(/expir/i));
  const cardCvc = page.getByPlaceholder('CVC').or(page.getByPlaceholder('CVV')).or(
    page.getByLabel(/cvc|cvv/i),
  );

  await cardNumber.fill('4242424242424242');
  await cardExpiry.fill('12 / 34');
  await cardCvc.fill('123');

  // Full name field (present in some Checkout configurations).
  const nameField = page.getByPlaceholder(/full name|name on card/i);
  if (await nameField.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await nameField.fill('E2E Test Student');
  }

  // Billing postal / ZIP code (US cards).
  const zipField = page.getByPlaceholder(/zip|postal/i).or(page.getByLabel(/zip|postal/i));
  if (await zipField.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await zipField.fill('10001');
  }

  // Submit payment.
  const submitBtn = page
    .getByRole('button', { name: /pay|submit|place order/i })
    .first();
  await submitBtn.click();
}
