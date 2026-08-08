// Edge function: mint a signed state token and return the Stripe OAuth URL
// the frontend should redirect to. Standard OAuth Connect flow — the tenant
// creates or signs into their own Stripe account on Stripe's hosted page,
// then authorizes GleeWorld as a platform. Money always lives in their
// account; GleeWorld only holds the connection.
//
// Why an edge fn (and not just a client-built URL): the state param MUST be
// signed server-side so the callback can trust {tenant_id, slug, return_path}
// came from an authenticated admin session on this platform and hasn't been
// tampered with. Client-generated state would let anyone mint a link that
// binds any Stripe account to any tenant.
//
// Flow:
//   1. Verify caller JWT and tenant_role (admin / super-admin).
//   2. Validate the requested return_path against a small allowlist.
//   3. Sign a 10-minute state token: {tenant_id, slug, user_id, return_path, nonce, exp}.
//   4. Return { url: 'https://connect.stripe.com/oauth/authorize?...' } for
//      the frontend to `window.location.href` to.

import { verifyJwtClaims } from '../_shared/verifyJwt.ts';
import { signState } from '../_shared/oauthState.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Only allow return_paths we recognize. Blocks a hostile page from setting
// return_path=https://evil.com or return_path=/admin/delete-everything.
const RETURN_PATH_ALLOWLIST = new Set([
  '/dashboard/store',
  '/dashboard/box-office',
  '/dashboard/fees',
  '/store',
]);

const ROLES_ALLOWED = ['owner', 'admin', 'super-admin', 'super_admin'];

async function pgRead<T>(table: string, query: string): Promise<T[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`PostgREST GET ${table} failed: ${res.status}`);
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const clientId = Deno.env.get('STRIPE_CONNECT_CLIENT_ID');
    const stateSecret = Deno.env.get('STRIPE_OAUTH_STATE_SECRET');
    if (!clientId) throw new Error('STRIPE_CONNECT_CLIENT_ID missing');
    if (!stateSecret) throw new Error('STRIPE_OAUTH_STATE_SECRET missing');

    // Auth: decode the JWT for tenant_id / tenant_role. Same pattern as the
    // existing box-office-connect-onboarding function so the security model
    // stays consistent across Connect surfaces.
    const authHeader = req.headers.get('Authorization') ?? '';
    const accessToken = authHeader.replace(/^Bearer\s+/i, '');
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Missing Authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const claims = (await verifyJwtClaims(accessToken)) ?? {};
    const tenantId = claims.tenant_id as string | undefined;
    const tenantRole = claims.tenant_role as string | undefined;
    const userId = claims.sub as string | undefined;
    const userEmail = claims.email as string | undefined;
    if (!tenantId) throw new Error('JWT missing tenant_id claim');
    if (!ROLES_ALLOWED.includes(tenantRole ?? '')) {
      return new Response(JSON.stringify({ error: `Only tenant admins can connect Stripe (role: ${tenantRole ?? 'none'})` }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Body: optional return_path (defaults to /dashboard/store). Also allows
    // GET with ?return_path=… for flexibility.
    let bodyReturnPath: string | undefined;
    if (req.method === 'POST') {
      try {
        const parsed = await req.json();
        bodyReturnPath = parsed?.return_path;
      } catch {
        // ignore — return_path stays undefined
      }
    } else {
      const u = new URL(req.url);
      bodyReturnPath = u.searchParams.get('return_path') ?? undefined;
    }
    const returnPath = bodyReturnPath ?? '/dashboard/store';
    if (!RETURN_PATH_ALLOWLIST.has(returnPath)) {
      return new Response(JSON.stringify({ error: `return_path not allowed: ${returnPath}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Look up the tenant slug for the eventual redirect-back URL. Slug is the
    // subdomain — the callback needs it because Stripe pings back on
    // supabase.gleeworld.org (platform-wide), not per-tenant.
    const rows = await pgRead<{ id: string; slug: string; name: string }>(
      'gw_tenants',
      `id=eq.${tenantId}&select=id,slug,name`,
    );
    const tenant = rows[0];
    if (!tenant) throw new Error(`Tenant not found for id=${tenantId}`);

    // 10-minute state — Stripe OAuth completes in seconds; 10 minutes is
    // generous headroom for a slow signup.
    const exp = Math.floor(Date.now() / 1000) + 600;
    const nonce = crypto.randomUUID();
    const state = await signState(
      {
        tenant_id: tenantId,
        tenant_slug: tenant.slug,
        user_id: userId,
        return_path: returnPath,
        nonce,
        exp,
      },
      stateSecret,
    );

    // stripe_landing=register hints Stripe to show the "Create account"
    // screen first for merchants who don't already have Stripe — but the
    // page still exposes "Sign in" for those who do. always_prompt=true
    // forces Stripe to show the authorization page even if the merchant
    // has previously connected, so they can pick a different account if
    // they want to. always_prompt would need account URL param support
    // in newer Stripe API versions — skipping for now.
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: 'read_write',
      state,
      stripe_landing: 'register',
    });
    if (userEmail) params.set('stripe_user[email]', userEmail);
    if (tenant.name) params.set('stripe_user[business_name]', tenant.name);
    params.set('redirect_uri', `${SUPABASE_URL.replace(/http:\/\/kong:8000/, 'https://supabase.gleeworld.org')}/functions/v1/stripe-oauth-callback`);

    const url = `https://connect.stripe.com/oauth/authorize?${params.toString()}`;

    return new Response(JSON.stringify({ url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[stripe-oauth-start]', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
