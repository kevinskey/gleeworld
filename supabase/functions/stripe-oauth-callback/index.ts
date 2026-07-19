// Edge function: OAuth callback from Stripe Connect. Stripe redirects back
// here with ?code=xxx&state=yyy after the merchant creates or signs in to
// their Stripe account and authorizes GleeWorld as a platform.
//
// This endpoint is PUBLIC (Stripe hits it without a session), so the ONLY
// authentication is the HMAC signature on the state token — reject anything
// unsigned, tampered, or expired. State also carries the tenant_id + slug so
// we know which row to update and where to redirect the user back to.
//
// Flow:
//   1. Verify state (HMAC + not-expired).
//   2. Exchange the code for tokens at connect.stripe.com/oauth/token.
//   3. Extract stripe_user_id (the connected account id).
//   4. Fetch the account to snapshot charges_enabled / payouts_enabled.
//   5. Persist all three to gw_tenants for the tenant in state.
//   6. 302 redirect back to <slug>.gleeworld.org<return_path>?stripe=connected.
//
// Errors always redirect back with ?stripe=error&reason=<code> instead of
// dumping JSON — the user is inside a browser navigation, not a fetch, so
// they need somewhere to land.

import { verifyState } from '../_shared/oauthState.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

interface StatePayload {
  tenant_id: string;
  tenant_slug: string;
  user_id?: string;
  return_path: string;
  nonce: string;
  exp: number;
}

function errorRedirect(slug: string | null, returnPath: string, reason: string): Response {
  const safeSlug = slug ?? 'app';
  const url = `https://${safeSlug}.gleeworld.org${returnPath}?stripe=error&reason=${encodeURIComponent(reason)}`;
  return new Response(null, { status: 302, headers: { Location: url } });
}

async function pgUpdate(table: string, query: string, patch: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`PostgREST PATCH ${table} failed: ${res.status} ${await res.text()}`);
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const stripeError = url.searchParams.get('error');
  const stripeErrorDesc = url.searchParams.get('error_description');

  // Best-effort state decode so we can redirect back to the right place even
  // on Stripe-side errors.
  const stateSecret = Deno.env.get('STRIPE_OAUTH_STATE_SECRET') ?? '';
  const decoded = state ? await verifyState<StatePayload>(state, stateSecret) : null;
  const returnPath = decoded?.return_path ?? '/dashboard/store';
  const slug = decoded?.tenant_slug ?? null;

  // Merchant declined authorization on the Stripe page.
  if (stripeError) {
    console.warn('[stripe-oauth-callback] stripe returned error', stripeError, stripeErrorDesc);
    return errorRedirect(slug, returnPath, stripeError);
  }

  if (!code || !state) return errorRedirect(slug, returnPath, 'missing_code_or_state');
  if (!decoded) return errorRedirect(slug, returnPath, 'invalid_state');
  if (!decoded.exp || decoded.exp * 1000 < Date.now()) return errorRedirect(slug, returnPath, 'expired_state');

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY missing');

    // Exchange the authorization code for tokens. Stripe returns the
    // connected account's stripe_user_id — this is the acct_XXXX we store
    // as gw_tenants.stripe_account_id (same field, same semantics as the
    // API-based Standard flow).
    const tokenParams = new URLSearchParams();
    tokenParams.set('grant_type', 'authorization_code');
    tokenParams.set('code', code);
    const tokenRes = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error('[stripe-oauth-callback] token exchange failed', tokenJson);
      return errorRedirect(slug, returnPath, tokenJson.error ?? 'token_exchange_failed');
    }
    const stripeUserId = tokenJson.stripe_user_id as string | undefined;
    if (!stripeUserId) return errorRedirect(slug, returnPath, 'no_stripe_user_id');

    // Snapshot the account's charges/payouts state so the UI can flip out of
    // the "connect" banner on the return trip. The webhook (account.updated)
    // keeps this fresh if Stripe re-verifies later.
    let chargesEnabled = false;
    let payoutsEnabled = false;
    try {
      const acctRes = await fetch(`https://api.stripe.com/v1/accounts/${stripeUserId}`, {
        headers: { Authorization: `Bearer ${stripeKey}` },
      });
      if (acctRes.ok) {
        const acct = await acctRes.json();
        chargesEnabled = !!acct.charges_enabled;
        payoutsEnabled = !!acct.payouts_enabled;
      }
    } catch (err) {
      console.warn('[stripe-oauth-callback] account fetch failed (non-fatal)', err);
    }

    await pgUpdate('gw_tenants', `id=eq.${decoded.tenant_id}`, {
      stripe_account_id: stripeUserId,
      stripe_charges_enabled: chargesEnabled,
      stripe_payouts_enabled: payoutsEnabled,
    });

    const back = `https://${decoded.tenant_slug}.gleeworld.org${returnPath}?stripe=connected`;
    return new Response(null, { status: 302, headers: { Location: back } });
  } catch (e) {
    console.error('[stripe-oauth-callback]', e);
    return errorRedirect(slug, returnPath, 'server_error');
  }
});
