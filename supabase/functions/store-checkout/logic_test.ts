// Local, network-free unit test for store-checkout's pure request-handling
// logic: auth gate, store_type validation, the 'store' add-on gate, and
// server-side price computation. No real Stripe or Supabase network calls
// are made — every `fetch` the handler performs (GoTrue auth check,
// PostgREST reads/writes, and even the Stripe Checkout Session creation,
// which the Stripe SDK issues via the platform `fetch`) is intercepted by
// a stub keyed on request URL, so this exercises the exact code path in
// index.ts, just against fixtures instead of a live stack.
//
// Run: cd supabase/functions && STRIPE_SECRET_KEY=sk_test_dummy \
//   SUPABASE_URL=http://kong:8000 SUPABASE_SERVICE_ROLE_KEY=srk \
//   SUPABASE_ANON_KEY=anon GW_PLATFORM_TENANT_ID=00000000-0000-0000-0000-000000000000 \
//   deno run --allow-env --allow-net store-checkout/logic_test.ts
//
// (env vars are also set programmatically below via Deno.env.set so a bare
// `deno run --allow-env --allow-net store-checkout/logic_test.ts` works.)

Deno.env.set('SUPABASE_URL', Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'srk_test');
Deno.env.set('SUPABASE_ANON_KEY', Deno.env.get('SUPABASE_ANON_KEY') ?? 'anon_test');
Deno.env.set('GW_PLATFORM_TENANT_ID', Deno.env.get('GW_PLATFORM_TENANT_ID') ?? '00000000-0000-0000-0000-000000000000');
// The payments seam constructs `new Stripe(STRIPE_SECRET_KEY)` at module
// load time; an empty string throws synchronously (see Task 3 report), so
// this must be set to *something* even though no real Stripe network call
// happens (the Stripe API call itself is intercepted by the fetch stub
// below, same as every other endpoint).
Deno.env.set('STRIPE_SECRET_KEY', Deno.env.get('STRIPE_SECRET_KEY') ?? 'sk_test_dummy');

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const TENANT_ID = '22222222-2222-2222-2222-222222222222';
const PRODUCT_ID = '33333333-3333-3333-3333-333333333333';

// ---- fetch stub -----------------------------------------------------
// Scenario state the router below reads from; each test case configures
// it before invoking the handler.
type Scenario = {
  authOk: boolean;
  subs: Array<{ status: string }>;
  product: Record<string, unknown> | null;
  tenantStripeAccount: string | null;
};
let scenario: Scenario = { authOk: true, subs: [], product: null, tenantStripeAccount: null };
const calls: { url: string; method: string; body: unknown }[] = [];

const origFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
  const method = (init?.method ?? 'GET').toUpperCase();
  // PostgREST bodies are JSON; the Stripe SDK sends
  // application/x-www-form-urlencoded bodies (e.g.
  // "mode=payment&line_items[0]..."), so only attempt JSON parsing —
  // a thrown SyntaxError here would look to the Stripe SDK like a
  // network-level failure and trigger its connection-error retry path,
  // masking what's actually a test-stub bug (learned the hard way).
  let body: unknown = init?.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      // leave as the raw (form-urlencoded) string
    }
  }
  calls.push({ url, method, body });

  const json = (b: unknown, status = 200) =>
    Promise.resolve(new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } }));

  if (url.includes('/auth/v1/user')) {
    return scenario.authOk
      ? json({ id: 'user-1', email: 'buyer@example.com' })
      : json({ error: 'invalid token' }, 401);
  }
  if (url.includes('/rest/v1/gw_tenant_subscriptions')) {
    return json(scenario.subs);
  }
  if (url.includes('/rest/v1/gw_products')) {
    return json(scenario.product ? [scenario.product] : []);
  }
  if (url.includes('/rest/v1/gw_store_orders')) {
    // POST → pre-create the order; return a representation row.
    return json([{ id: 'order-1', ...(body as object) }]);
  }
  if (url.includes('/rest/v1/gw_store_order_items')) {
    return json(Array.isArray(body) ? body : [body]);
  }
  if (url.includes('/rest/v1/gw_tenants')) {
    return json(scenario.tenantStripeAccount ? [{ stripe_account_id: scenario.tenantStripeAccount }] : []);
  }
  if (url.includes('api.stripe.com/v1/checkout/sessions')) {
    return json({ id: 'cs_test_fake', url: 'https://checkout.stripe.com/c/pay/cs_test_fake' });
  }
  throw new Error(`unstubbed fetch: ${method} ${url}`);
}) as typeof fetch;

// Import AFTER the fetch stub + env vars are in place, since the payments
// seam constructs its Stripe client (and index.ts reads SUPABASE_URL etc.)
// at module-evaluation time.
const { handler } = await import('./index.ts');

function fakeJwt(payload: Record<string, unknown>): string {
  const b64url = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64url({ alg: 'none' })}.${b64url(payload)}.sig`;
}
const VALID_JWT = fakeJwt({ tenant_id: TENANT_ID, sub: 'user-1' });

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

// ---- (a) missing/blank Authorization -> 401 --------------------------
{
  scenario = { authOk: true, subs: [], product: null, tenantStripeAccount: null };
  const res = await handler(req({ store_type: 'tenant', items: [{ product_id: PRODUCT_ID, quantity: 1 }], buyer_email: 'b@x.com' }));
  assert(res.status === 401, `no Authorization header -> 401 (got ${res.status})`);
}
{
  scenario = { authOk: true, subs: [], product: null, tenantStripeAccount: null };
  const res = await handler(
    req({ store_type: 'tenant', items: [{ product_id: PRODUCT_ID, quantity: 1 }], buyer_email: 'b@x.com' }, { Authorization: 'Bearer ' }),
  );
  assert(res.status === 401, `blank bearer token -> 401 (got ${res.status})`);
}
{
  // Well-formed token, but GoTrue rejects the signature (expired/forged).
  scenario = { authOk: false, subs: [], product: null, tenantStripeAccount: null };
  const res = await handler(
    req(
      { store_type: 'tenant', items: [{ product_id: PRODUCT_ID, quantity: 1 }], buyer_email: 'b@x.com' },
      { Authorization: `Bearer ${VALID_JWT}` },
    ),
  );
  assert(res.status === 401, `GoTrue-rejected signature -> 401 (got ${res.status})`);
}

// ---- (b) invalid store_type -> 400 ------------------------------------
{
  scenario = { authOk: true, subs: [], product: null, tenantStripeAccount: null };
  const res = await handler(
    req(
      { store_type: 'not-a-real-store', items: [{ product_id: PRODUCT_ID, quantity: 1 }], buyer_email: 'b@x.com' },
      { Authorization: `Bearer ${VALID_JWT}` },
    ),
  );
  assert(res.status === 400, `invalid store_type -> 400 (got ${res.status})`);
  const b = await res.json();
  assert(b.error === 'bad store_type', `error message is 'bad store_type' (got ${JSON.stringify(b)})`);
}

// ---- (c) tenant store, no active 'store' subscription -> 403 ---------
{
  scenario = { authOk: true, subs: [], product: null, tenantStripeAccount: null }; // no rows at all
  const res = await handler(
    req(
      { store_type: 'tenant', items: [{ product_id: PRODUCT_ID, quantity: 1 }], buyer_email: 'b@x.com' },
      { Authorization: `Bearer ${VALID_JWT}` },
    ),
  );
  assert(res.status === 403, `no store subscription row -> 403 (got ${res.status})`);
  const b = await res.json();
  assert(b.error === 'Store add-on not enabled', `error message names the add-on (got ${JSON.stringify(b)})`);
}
{
  scenario = { authOk: true, subs: [{ status: 'cancelled' }], product: null, tenantStripeAccount: null };
  const res = await handler(
    req(
      { store_type: 'tenant', items: [{ product_id: PRODUCT_ID, quantity: 1 }], buyer_email: 'b@x.com' },
      { Authorization: `Bearer ${VALID_JWT}` },
    ),
  );
  assert(res.status === 403, `cancelled store subscription -> 403 (got ${res.status})`);
}

// ---- (d) valid request: server computes amount_cents, ignores any -----
//         client-sent price, and the pre-created order carries it.
{
  scenario = {
    authOk: true,
    subs: [{ status: 'active' }],
    product: {
      id: PRODUCT_ID,
      name: 'Glee Hoodie',
      price: 19.99,
      sale_price: null,
      requires_shipping: true,
      manage_stock: false,
      stock_quantity: null,
    },
    tenantStripeAccount: 'acct_test_123',
  };
  calls.length = 0;
  const clientQuantity = 2;
  const res = await handler(
    req(
      {
        store_type: 'tenant',
        items: [
          // Client sends no price field the server would ever read; even if
          // it tried to smuggle one in, the handler never looks at it.
          { product_id: PRODUCT_ID, quantity: clientQuantity, price: 1, unit_price_cents: 1 },
        ],
        buyer_email: 'b@x.com',
      },
      { Authorization: `Bearer ${VALID_JWT}` },
    ),
  );
  const expectedCents = Math.round(19.99 * 100) * clientQuantity; // 3998
  assert(res.status === 200, `valid request -> 200 (got ${res.status}, body ${await res.clone().text()})`);
  const outBody = await res.json();
  assert(typeof outBody.url === 'string' && outBody.url.includes('checkout.stripe.com'), `response has a checkout url (got ${JSON.stringify(outBody)})`);
  assert(outBody.order_id === 'order-1', `response echoes the pre-created order id`);

  const orderPost = calls.find((c) => c.url.includes('/rest/v1/gw_store_orders') && c.method === 'POST');
  assert(!!orderPost, 'a POST to gw_store_orders was made to pre-create the pending order');
  assert(
    (orderPost?.body as any)?.amount_cents === expectedCents,
    `pre-created order amount_cents is server-computed (${expectedCents}), not the client's price/unit_price_cents (got ${JSON.stringify(orderPost?.body)})`,
  );
  assert((orderPost?.body as any)?.status === 'pending', 'pre-created order status is pending');

  const itemsPost = calls.find((c) => c.url.includes('/rest/v1/gw_store_order_items') && c.method === 'POST');
  const itemsBody = (itemsPost?.body ?? []) as Array<Record<string, unknown>>;
  assert(itemsBody.length === 1, 'one order item row was inserted');
  assert(
    itemsBody[0]?.unit_price_cents === Math.round(19.99 * 100),
    `order item unit_price_cents comes from the looked-up product, not the client (got ${JSON.stringify(itemsBody[0])})`,
  );
  assert(itemsBody[0]?.quantity === clientQuantity, 'order item quantity matches the request');
  assert(
    (orderPost?.body as any)?.buyer_user_id === 'user-1',
    `pre-created order links to the verified JWT subject as buyer_user_id (got ${JSON.stringify(orderPost?.body)})`,
  );
}

// ---- (e) non-UUID product_id -> 400 'bad product_id' -------------------
// Regression guard for the raw-interpolation PostgREST filter hardening:
// a malformed/malicious product_id must be rejected before it is ever
// concatenated into a query string, not just fail a downstream lookup.
{
  scenario = { authOk: true, subs: [{ status: 'active' }], product: null, tenantStripeAccount: 'acct_test_123' };
  const res = await handler(
    req(
      { store_type: 'tenant', items: [{ product_id: "not-a-uuid&tenant_id=eq.other", quantity: 1 }], buyer_email: 'b@x.com' },
      { Authorization: `Bearer ${VALID_JWT}` },
    ),
  );
  assert(res.status === 400, `non-UUID product_id -> 400 (got ${res.status})`);
  const b = await res.json();
  assert(b.error === 'bad product_id', `error message is 'bad product_id' (got ${JSON.stringify(b)})`);
}

// ---- (f) missing buyer_email -> 400 (not a 500 at insert) ---------------
{
  scenario = {
    authOk: true,
    subs: [{ status: 'active' }],
    product: {
      id: PRODUCT_ID,
      name: 'Glee Hoodie',
      price: 19.99,
      sale_price: null,
      requires_shipping: true,
      manage_stock: false,
      stock_quantity: null,
    },
    tenantStripeAccount: 'acct_test_123',
  };
  const res = await handler(
    req(
      { store_type: 'tenant', items: [{ product_id: PRODUCT_ID, quantity: 1 }], buyer_email: '' },
      { Authorization: `Bearer ${VALID_JWT}` },
    ),
  );
  assert(res.status === 400, `missing buyer_email -> 400, not 500 (got ${res.status})`);
}

globalThis.fetch = origFetch;

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed.`);
  Deno.exit(1);
}
console.log('\nstore-checkout logic_test passed');
// index.ts's module-level `Deno.serve(handler)` (kept so the file is a
// faithful, directly-deployable edge function) starts a live listener as
// a side effect of the import above; without an explicit exit the process
// would hang open on that listener instead of returning a pass/fail code.
Deno.exit(0);
