// Local, network-free unit test for Task 2 of the Tenant Store add-on: guest
// (no JWT) checkout on a TENANT storefront, resolved via a `tenant_slug` in
// the body. Same fetch-stub approach as logic_test.ts/guest_test.ts — no
// real Stripe or Supabase network calls are made.
//
// Run: cd supabase/functions && STRIPE_SECRET_KEY=sk_test_dummy \
//   deno run --allow-env --allow-net store-checkout/tenant_guest_test.ts

Deno.env.set('SUPABASE_URL', Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'srk_test');
Deno.env.set('SUPABASE_ANON_KEY', Deno.env.get('SUPABASE_ANON_KEY') ?? 'anon_test');
Deno.env.set('GW_PLATFORM_TENANT_ID', Deno.env.get('GW_PLATFORM_TENANT_ID') ?? '00000000-0000-0000-0000-000000000000');
// The payments seam constructs `new Stripe(STRIPE_SECRET_KEY)` at module
// load time; an empty string throws synchronously, so this must be set to
// *something* even though no real Stripe network call happens (the Stripe
// API call itself is intercepted by the fetch stub below).
Deno.env.set('STRIPE_SECRET_KEY', Deno.env.get('STRIPE_SECRET_KEY') ?? 'sk_test_dummy');

const TENANT_ID = '44444444-4444-4444-4444-444444444444';
const NO_ADDON_TENANT_ID = '55555555-5555-5555-5555-555555555555';
const NOT_READY_TENANT_ID = '66666666-6666-6666-6666-666666666666';
const PRODUCT_ID = '33333333-3333-3333-3333-333333333333';
const JWT_TENANT_ID = '22222222-2222-2222-2222-222222222222';

// ---- fetch stub -----------------------------------------------------
// Keyed by slug so a single stub can serve every scenario below without
// re-registering per test case.
const TENANTS_BY_SLUG: Record<string, { id: string; stripe_account_id: string | null }> = {
  'good-tenant': { id: TENANT_ID, stripe_account_id: 'acct_test_tenant' },
  'no-addon-tenant': { id: NO_ADDON_TENANT_ID, stripe_account_id: 'acct_test_no_addon' },
  'not-ready-tenant': { id: NOT_READY_TENANT_ID, stripe_account_id: null },
  // Not resolved via a slug (the JWT case resolves tenantId from
  // claims.tenant_id directly) — present here only so the `id=eq.` Connect
  // account lookup in the stub below can find it by id.
  'jwt-tenant-not-used-by-slug': { id: JWT_TENANT_ID, stripe_account_id: 'acct_test_jwt' },
};
const SUBS_BY_TENANT: Record<string, Array<{ status: string }>> = {
  [TENANT_ID]: [{ status: 'active' }],
  [NO_ADDON_TENANT_ID]: [{ status: 'cancelled' }],
  [NOT_READY_TENANT_ID]: [{ status: 'active' }],
  [JWT_TENANT_ID]: [{ status: 'active' }],
};
const PRODUCT = {
  id: PRODUCT_ID,
  name: 'Glee Hoodie',
  price: 19.99,
  sale_price: null,
  requires_shipping: false,
  manage_stock: false,
  stock_quantity: null,
};

const calls: { url: string; method: string; body: unknown }[] = [];

const origFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
  const method = (init?.method ?? 'GET').toUpperCase();
  let body: unknown = init?.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      // Stripe SDK sends form-urlencoded bodies; leave as the raw string.
    }
  }
  calls.push({ url, method, body });

  const json = (b: unknown, status = 200) =>
    Promise.resolve(new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } }));

  if (url.includes('/auth/v1/user')) {
    // A JWT is presented only in scenario (e); always valid when present.
    return json({ id: 'user-1', email: 'buyer@example.com' });
  }
  if (url.includes('/rest/v1/gw_store_checkout_attempts')) {
    return method === 'GET' ? json([]) : json([{ id: 'attempt-1' }]);
  }
  if (url.includes('/rest/v1/gw_tenants')) {
    const m = url.match(/slug=eq\.([^&]+)/);
    if (m) {
      const slug = decodeURIComponent(m[1]);
      const t = TENANTS_BY_SLUG[slug];
      return json(t ? [{ id: t.id }] : []);
    }
    const idm = url.match(/id=eq\.([^&]+)/);
    if (idm) {
      const id = decodeURIComponent(idm[1]);
      const entry = Object.values(TENANTS_BY_SLUG).find((t) => t.id === id);
      return json(entry ? [{ stripe_account_id: entry.stripe_account_id }] : []);
    }
    return json([]);
  }
  if (url.includes('/rest/v1/gw_tenant_subscriptions')) {
    const m = url.match(/tenant_id=eq\.([^&]+)/);
    const tenantId = m ? decodeURIComponent(m[1]) : '';
    return json(SUBS_BY_TENANT[tenantId] ?? []);
  }
  if (url.includes('/rest/v1/gw_products')) {
    return json([PRODUCT]);
  }
  if (url.includes('/rest/v1/gw_store_orders')) {
    return json([{ id: 'order-1', ...(body as object) }]);
  }
  if (url.includes('/rest/v1/gw_store_order_items')) {
    return json(Array.isArray(body) ? body : [body]);
  }
  if (url.includes('api.stripe.com/v1/checkout/sessions')) {
    return json({ id: 'cs_test_tenant', url: 'https://checkout.stripe.com/c/pay/cs_test_tenant' });
  }
  throw new Error(`unstubbed fetch: ${method} ${url}`);
}) as typeof fetch;

// Import AFTER the fetch stub + env vars are in place.
const { handler } = await import('./index.ts');

function fakeJwt(payload: Record<string, unknown>): string {
  const b64url = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64url({ alg: 'none' })}.${b64url(payload)}.sig`;
}
const VALID_JWT = fakeJwt({ tenant_id: JWT_TENANT_ID, sub: 'user-1' });

function req(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/store-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failures++;
    console.error(`FAIL: ${msg}`);
  } else {
    console.log(`ok: ${msg}`);
  }
}

// ---- (a) guest + valid tenant_slug + active store sub + stripe_account_id
//      -> 200, order attributed to the resolved tenant, Stripe session
//      created with the tenant's Connect account. ------------------------
{
  calls.length = 0;
  const res = await handler(
    req(
      { store_type: 'tenant', tenant_slug: 'good-tenant', items: [{ product_id: PRODUCT_ID, quantity: 1 }], buyer_email: 'guest@example.com' },
      { 'x-forwarded-for': '10.10.10.1' },
    ),
  );
  assert(res.status === 200, `guest + valid slug + active sub + connected account -> 200 (got ${res.status}, body ${await res.clone().text()})`);
  const outBody = await res.json();
  assert(outBody.order_id === 'order-1', 'response echoes the pre-created order id');

  const orderPost = calls.find((c) => c.url.includes('/rest/v1/gw_store_orders') && c.method === 'POST');
  assert((orderPost?.body as any)?.tenant_id === TENANT_ID, `order is attributed to the slug-resolved tenant (got ${JSON.stringify(orderPost?.body)})`);
  assert((orderPost?.body as any)?.buyer_user_id === null, 'guest order has no buyer_user_id (no JWT presented)');

  const sessionCall = calls.find((c) => c.url.includes('api.stripe.com/v1/checkout/sessions'));
  assert(!!sessionCall, 'a Stripe checkout session was created');
  // The Stripe SDK sends the Connect account as a header on the raw fetch
  // request, which this stub does not capture separately from url/body —
  // assert indirectly instead: the resolved tenant's own gw_tenants row (by
  // id, not the platform's) was looked up server-side for stripe_account_id.
  const tenantAcctLookup = calls.find((c) => c.url.includes('/rest/v1/gw_tenants') && c.url.includes(`id=eq.${TENANT_ID}`));
  assert(!!tenantAcctLookup, `the resolved tenant's stripe_account_id was looked up server-side (calls: ${JSON.stringify(calls.map(c => c.url))})`);
}

// ---- (b) tenant_slug for a tenant WITHOUT the store add-on -> 403 -------
{
  calls.length = 0;
  const res = await handler(
    req(
      { store_type: 'tenant', tenant_slug: 'no-addon-tenant', items: [{ product_id: PRODUCT_ID, quantity: 1 }], buyer_email: 'guest2@example.com' },
      { 'x-forwarded-for': '10.10.10.2' },
    ),
  );
  assert(res.status === 403, `slug for a tenant without the store add-on -> 403 (got ${res.status})`);
  const b = await res.json();
  assert(b.error === 'Store add-on not enabled', `error names the add-on (got ${JSON.stringify(b)})`);
}

// ---- (c) tenant has the sub but NULL stripe_account_id -> 400 'store not
//      ready'. -----------------------------------------------------------
{
  calls.length = 0;
  const res = await handler(
    req(
      { store_type: 'tenant', tenant_slug: 'not-ready-tenant', items: [{ product_id: PRODUCT_ID, quantity: 1 }], buyer_email: 'guest3@example.com' },
      { 'x-forwarded-for': '10.10.10.3' },
    ),
  );
  assert(res.status === 400, `sub active but no connected Stripe account -> 400 (got ${res.status})`);
  const b = await res.json();
  assert(b.error === 'store not ready', `error message is 'store not ready' (got ${JSON.stringify(b)})`);
}

// ---- (d) guest tenant checkout with NO tenant_slug -> 401 (can't resolve
//      which tenant). -----------------------------------------------------
{
  calls.length = 0;
  const res = await handler(
    req(
      { store_type: 'tenant', items: [{ product_id: PRODUCT_ID, quantity: 1 }], buyer_email: 'guest4@example.com' },
      { 'x-forwarded-for': '10.10.10.4' },
    ),
  );
  assert(res.status === 401, `guest tenant checkout with no tenant_slug -> 401 (got ${res.status})`);
  const orderPost = calls.find((c) => c.url.includes('/rest/v1/gw_store_orders') && c.method === 'POST');
  assert(!orderPost, 'no order is created when the tenant cannot be resolved');
}

// ---- (d2) malformed tenant_slug (fails ^[a-z0-9-]+$) -> 401, and is never
//      concatenated raw into the PostgREST filter. ------------------------
{
  calls.length = 0;
  const res = await handler(
    req(
      { store_type: 'tenant', tenant_slug: 'Not A Slug!', items: [{ product_id: PRODUCT_ID, quantity: 1 }], buyer_email: 'guest5@example.com' },
      { 'x-forwarded-for': '10.10.10.5' },
    ),
  );
  assert(res.status === 401, `malformed tenant_slug -> 401 (got ${res.status})`);
  const tenantsLookup = calls.find((c) => c.url.includes('/rest/v1/gw_tenants') && c.url.includes('slug=eq.'));
  assert(!tenantsLookup, 'a malformed slug never reaches the gw_tenants lookup');
}

// ---- (d3) tenant_slug that does not match any tenant -> 404 -------------
{
  calls.length = 0;
  const res = await handler(
    req(
      { store_type: 'tenant', tenant_slug: 'no-such-tenant', items: [{ product_id: PRODUCT_ID, quantity: 1 }], buyer_email: 'guest6@example.com' },
      { 'x-forwarded-for': '10.10.10.6' },
    ),
  );
  assert(res.status === 404, `unknown tenant_slug -> 404 (got ${res.status})`);
  const b = await res.json();
  assert(b.error === 'store not found', `error message names the missing store (got ${JSON.stringify(b)})`);
}

// ---- (e) a logged-in JWT tenant order still works unchanged, and a guest
//      slug (if somehow also sent) never overrides the verified JWT's
//      tenant_id. ---------------------------------------------------------
{
  calls.length = 0;
  const res = await handler(
    req(
      {
        store_type: 'tenant',
        tenant_slug: 'no-addon-tenant', // must be ignored — JWT wins
        items: [{ product_id: PRODUCT_ID, quantity: 1 }],
        buyer_email: 'member@example.com',
      },
      { Authorization: `Bearer ${VALID_JWT}`, 'x-forwarded-for': '10.10.10.7' },
    ),
  );
  assert(res.status === 200, `JWT tenant checkout -> 200, unaffected by guest slug support (got ${res.status}, body ${await res.clone().text()})`);
  const orderPost = calls.find((c) => c.url.includes('/rest/v1/gw_store_orders') && c.method === 'POST');
  assert((orderPost?.body as any)?.tenant_id === JWT_TENANT_ID, `order uses claims.tenant_id, NOT the (unrelated, no-addon) slug tenant (got ${JSON.stringify(orderPost?.body)})`);
  assert((orderPost?.body as any)?.buyer_user_id === 'user-1', 'JWT order carries buyer_user_id from verified claims');
}

globalThis.fetch = origFetch;

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed.`);
  Deno.exit(1);
}
console.log('\nstore-checkout tenant_guest_test passed');
// index.ts's module-level `Deno.serve(handler)` starts a live listener as a
// side effect of the import above; without an explicit exit the process
// would hang open on that listener instead of returning a pass/fail code.
Deno.exit(0);
