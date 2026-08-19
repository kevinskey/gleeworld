import { describe, it, expect } from 'vitest';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { billingPortalErrorMessage } from '../billingPortalError';

function httpError(status: number, body: unknown): FunctionsHttpError {
  const response = new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
  return new FunctionsHttpError(response);
}

describe('billingPortalErrorMessage', () => {
  it('turns the 404 no-customer error into the pick-a-plan message', async () => {
    const error = httpError(404, { error: 'no_stripe_customer_for_tenant' });
    expect(await billingPortalErrorMessage(error, null)).toBe(
      'No Stripe billing on file yet — pick a plan in the Plan tab first.',
    );
  });

  it('explains admin_only instead of the generic non-2xx message', async () => {
    const error = httpError(403, { error: 'admin_only' });
    expect(await billingPortalErrorMessage(error, null)).toBe(
      'Only workspace admins can open the billing portal.',
    );
  });

  it('gives a retry message for Stripe-side failures', async () => {
    const error = httpError(502, { error: 'stripe_portal_failed' });
    expect(await billingPortalErrorMessage(error, null)).toBe(
      "Stripe couldn't open the billing portal — try again in a moment.",
    );
  });

  it('passes through unrecognized error codes verbatim', async () => {
    const error = httpError(500, { error: 'some_new_failure' });
    expect(await billingPortalErrorMessage(error, null)).toBe('some_new_failure');
  });

  it('returns null on success', async () => {
    expect(await billingPortalErrorMessage(null, { url: 'https://billing.stripe.com/x' })).toBeNull();
  });
});
