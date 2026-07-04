// Local, network-free unit test for Task 2 of the storefront plan: guest
// checkout on the public GleeWorld store, per-ip/email rate limiting, and
// the access_token minted on the order. Same fetch-stub approach as
// logic_test.ts — no real Stripe or Supabase network calls are made.
//
// Run: cd supabase/functions && STRIPE_SECRET_KEY=sk_test_dummy \
//   deno run --allow-env --allow-net store-checkout/guest_test.ts

Deno.env.set('SUPABASE_URL', Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'srk_test');
Deno.env.set('SUPABASE_ANON_KEY', Deno.env.get('SUPABASE_ANON_KEY') ?? 'anon_test');
Deno.env.set('GW_PLATFORM_TENANT_ID', Deno.env.get('GW_PLATFORM_TENANT_ID') ?? '00000000-0000-0000-0000-000000000000');
// The payments seam constructs `new Stripe(STRIPE_SECRET_KEY)` at module
// load time; an empty string throws synchronously, so this must be set to
// *something* even though no real Stripe network call happens (the Stripe
// API call itself is intercepted by the fetch stub below).
Deno.env.set('STRIPE_SECRET_KEY', Deno.env.get('STRIPE_SECRET_KEY') ?? 'sk_test_dummy');

const PLATFORM_TENANT_ID = Deno.env.get('GW_PLATFORM_TENANT_ID')!;
const TENANT_ID = '22222222-2222-2222-2222-222222222222';
const PRODUCT_ID = '33333333-3333-3333-3333-333333333333';

// ---- fetch stub -----------------------------------------------------
type Scenario = {
  authOk: boolean;
  product: Record<string, unknown> | null;
  attemptsCount: number; // rows the rate-limit SELECT should report as "recent"
};
let scenario: Scenario = { authOk: true, product: null, attemptsCount: 0 };
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
      // Stripe SDK sends form-urlencoded bodies; leave as the raw string
      // rather than throwing, which would look like a network failure to
      // the SDK's retry logic and mask a real stub bug.
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
  if (url.includes('/rest/v1/gw_store_checkout_attempts')) {
    if (method === 'GET') {
      const rows = Array.from({ length: scenario.attemptsCount }, (_, i) => ({ id: `attempt-${i}` }));
      return json(rows);
    }
    // POST -> record this attempt.
    return json([{ id: 'attempt-new', ...(body as object) }]);
  }
  if (url.includes('/rest/v1/gw_products')) {
    return json(scenario.product ? [scenario.product] : []);
  }
  if (url.includes('/rest/v1/gw_store_orders')) {
    return json([{ id: 'order-1', ...(body as object) }]);
  }
  if (url.includes('/rest/v1/gw_store_order_items')) {
    return json(Array.isArray(body) ? body : [body]);
  }
  if (url.includes('/rest/v1/gw_tenants')) {
    return json([]);
  }
  if (url.includes('/rest/v1/gw_tenant_subscriptions')) {
    return json([{ status: 'active' }]);
  }
  if (url.includes('api.stripe.com/v1/checkout/sessions')) {
    return json({ id: 'cs_test_x', url: 'https://checkout.stripe.com/c/pay/cs_test_x' });
  }
  throw new Error(`unstubbed fetch: ${method} ${url}`);
}) as typeof fetch;

// Import AFTER the fetch stub + env vars are in place — index.ts reads env
// and the payments seam constructs its Stripe client at module-eval time.
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

const HOODIE = {
  id: PRODUCT_ID,
  name: 'Glee Hoodie',
  price: 19.99,
  sale_price: null,
  requires_shipping: true,
  manage_stock: false,
  stock_quantity: null,
};
const EBOOK = {
  id: PRODUCT_ID,
  name: 'Songwriting Guide (PDF)',
  price: 9.99,
  sale_price: null,
  requires_shipping: false,
  manage_stock: false,
  stock_quantity: null,
};
const VALID_SHIPPING = {
  name: 'Jane Doe',
  line1: '123 Main St',
  line2: 'Apt 4',
  city: 'Atlanta',
  state: 'GA',
  postal: '30301',
  country: 'US',
};

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failures++;
    console.error(`FAIL: ${msg}`);
  } else {
    console.log(`ok: ${msg}`);
  }
}

// ---- (a) guest checkout on the public GleeWorld store: no Authorization,
//      store_type='gleeworld' -> 200 with a server-computed amount_cents
//      and an access_token, and the token is threaded into the Stripe
//      success_url. ---------------------------------------------------
{
  scenario = { authOk: true, product: HOODIE, attemptsCount: 0 };
  calls.length = 0;
  const res = await handler(
    req(
      {
        store_type: 'gleeworld',
        items: [{ product_id: PRODUCT_ID, quantity: 1, price: 1 }],
        buyer_email: 'guest@example.com',
        shipping_address: VALID_SHIPPING,
      },
      { 'x-forwarded-for': '9.9.9.9' },
    ),
  );
  assert(res.status === 200, `guest checkout (no auth) -> 200 (got ${res.status}, body ${await res.clone().text()})`);
  const outBody = await res.json();
  assert(typeof outBody.access_token === 'string' && outBody.access_token.length === 48, `response includes a 24-byte hex access_token (got ${JSON.stringify(outBody)})`);
  assert(outBody.order_id === 'order-1', 'response echoes the pre-created order id');

  const orderPost = calls.find((c) => c.url.includes('/rest/v1/gw_store_orders') && c.method === 'POST');
  assert(!!orderPost, 'a POST to gw_store_orders was made to pre-create the pending order');
  assert(
    (orderPost?.body as any)?.amount_cents === Math.round(19.99 * 100),
    `order amount_cents is server-computed from gw_products, not the client's price (got ${JSON.stringify(orderPost?.body)})`,
  );
  assert((orderPost?.body as any)?.access_token === outBody.access_token, 'the same access_token minted is stored on the order');
  assert((orderPost?.body as any)?.buyer_user_id === null, 'guest order has no buyer_user_id (no JWT presented)');
  assert((orderPost?.body as any)?.tenant_id === PLATFORM_TENANT_ID, 'guest order is attributed to the platform tenant');

  const sessionCall = calls.find((c) => c.url.includes('api.stripe.com/v1/checkout/sessions'));
  const sessionBody = String(sessionCall?.body ?? '');
  assert(sessionBody.includes(`t%3D${outBody.access_token}`) || sessionBody.includes(`t=${outBody.access_token}`), `Stripe success_url carries &t=<access_token> (body: ${sessionBody.slice(0, 300)})`);
  // Regression: only tenant-store orders redirect to the tenant site root.
  // The platform ('gleeworld') store must keep landing on /shop/success,
  // which renders the platform's own success page (Shop.tsx), not
  // PublicSiteView.tsx's tenant banner.
  const successUrl = new URLSearchParams(sessionBody).get('success_url') ?? '';
  assert(successUrl.includes('/shop/success'), `gleeworld order success_url still points at /shop/success (got ${successUrl})`);
}

// ---- (b) tenant store, no auth -> still 401 (guest checkout does NOT
//      weaken the tenant path). ----------------------------------------
{
  scenario = { authOk: true, product: HOODIE, attemptsCount: 0 };
  const res = await handler(
    req({ store_type: 'tenant', items: [{ product_id: PRODUCT_ID, quantity: 1 }], buyer_email: 'b@x.com' }),
  );
  assert(res.status === 401, `store_type='tenant' with no Authorization -> 401 (got ${res.status})`);
}

// ---- (c) rate limit: 5 recent attempts already recorded for this ip ->
//      the 6th request in the window is rejected with 429. --------------
{
  scenario = { authOk: true, product: HOODIE, attemptsCount: 5 };
  calls.length = 0;
  const res = await handler(
    req(
      { store_type: 'gleeworld', items: [{ product_id: PRODUCT_ID, quantity: 1 }], buyer_email: 'guest2@example.com' },
      { 'x-forwarded-for': '9.9.9.9' },
    ),
  );
  assert(res.status === 429, `6th attempt within the window -> 429 (got ${res.status}, body ${await res.clone().text()})`);
  const orderPost = calls.find((c) => c.url.includes('/rest/v1/gw_store_orders') && c.method === 'POST');
  assert(!orderPost, 'no order is created once the rate limit is hit');
}

// ---- (d) with a JWT presented on the guest storefront, buyer_user_id is
//      still set from the verified claims. ------------------------------
{
  scenario = { authOk: true, product: HOODIE, attemptsCount: 0 };
  calls.length = 0;
  const res = await handler(
    req(
      {
        store_type: 'gleeworld',
        items: [{ product_id: PRODUCT_ID, quantity: 1 }],
        buyer_email: 'member@example.com',
        shipping_address: VALID_SHIPPING,
      },
      { Authorization: `Bearer ${VALID_JWT}`, 'x-forwarded-for': '5.5.5.5' },
    ),
  );
  assert(res.status === 200, `gleeworld checkout with a valid JWT -> 200 (got ${res.status})`);
  const orderPost = calls.find((c) => c.url.includes('/rest/v1/gw_store_orders') && c.method === 'POST');
  assert((orderPost?.body as any)?.buyer_user_id === 'user-1', `buyer_user_id set from verified JWT claims.sub (got ${JSON.stringify(orderPost?.body)})`);
}

// ---- (e) rate-limit filter values are encodeURIComponent'd — a
//      malicious/odd email must not be able to inject extra PostgREST
//      filter clauses via the `or=(...)` expression. ---------------------
{
  scenario = { authOk: true, product: HOODIE, attemptsCount: 0 };
  calls.length = 0;
  const trickyEmail = 'a+b@example.com,ip.eq.10.0.0.1';
  await handler(
    req(
      { store_type: 'gleeworld', items: [{ product_id: PRODUCT_ID, quantity: 1 }], buyer_email: trickyEmail },
      { 'x-forwarded-for': '7.7.7.7' },
    ),
  );
  const attemptsGet = calls.find((c) => c.url.includes('/rest/v1/gw_store_checkout_attempts') && c.method === 'GET');
  assert(!!attemptsGet, 'a GET to gw_store_checkout_attempts was made for the rate-limit check');
  assert(!!attemptsGet && !attemptsGet.url.includes(trickyEmail), `raw email is not present unescaped in the filter URL (got ${attemptsGet?.url})`);
  assert(!!attemptsGet && attemptsGet.url.includes(encodeURIComponent(trickyEmail)), `email is present encodeURIComponent'd in the filter URL (got ${attemptsGet?.url})`);
}

// ---- (f) IP key must be the trusted x-real-ip, not a client-controllable
//      X-Forwarded-For value. A card-tester rotates a spoofed left-most
//      X-Forwarded-For entry per request while nginx's X-Real-IP (the real,
//      unforgeable client IP) stays constant — both requests must still be
//      keyed on the SAME ip bucket for the rate limiter to have any teeth.
{
  scenario = { authOk: true, product: HOODIE, attemptsCount: 0 };
  calls.length = 0;
  await handler(
    req(
      { store_type: 'gleeworld', items: [{ product_id: PRODUCT_ID, quantity: 1 }], buyer_email: 'card-test-1@example.com' },
      { 'x-real-ip': '55.55.55.55', 'x-forwarded-for': '1.1.1.1, 55.55.55.55' },
    ),
  );
  const get1 = calls.find((c) => c.url.includes('/rest/v1/gw_store_checkout_attempts') && c.method === 'GET');
  const post1 = calls.find((c) => c.url.includes('/rest/v1/gw_store_checkout_attempts') && c.method === 'POST');

  calls.length = 0;
  await handler(
    req(
      { store_type: 'gleeworld', items: [{ product_id: PRODUCT_ID, quantity: 1 }], buyer_email: 'card-test-2@example.com' },
      { 'x-real-ip': '55.55.55.55', 'x-forwarded-for': '2.2.2.2, 55.55.55.55' },
    ),
  );
  const get2 = calls.find((c) => c.url.includes('/rest/v1/gw_store_checkout_attempts') && c.method === 'GET');
  const post2 = calls.find((c) => c.url.includes('/rest/v1/gw_store_checkout_attempts') && c.method === 'POST');

  assert(!!get1 && get1.url.includes(encodeURIComponent('55.55.55.55')), `rate-limit lookup keys on trusted x-real-ip, not spoofed x-forwarded-for[0] (got ${get1?.url})`);
  assert(!!get1 && !get1.url.includes('1.1.1.1'), `spoofed x-forwarded-for first hop (1.1.1.1) is not used as the ip key (got ${get1?.url})`);
  assert(!!get2 && !get2.url.includes('2.2.2.2'), `spoofed x-forwarded-for first hop (2.2.2.2) is not used as the ip key (got ${get2?.url})`);
  assert(!!post1 && !!post2 && (post1.body as any)?.ip === (post2.body as any)?.ip, `both requests record the SAME ip bucket despite different spoofed X-Forwarded-For values (got ${JSON.stringify((post1?.body as any)?.ip)} vs ${JSON.stringify((post2?.body as any)?.ip)})`);
  assert((post1?.body as any)?.ip === '55.55.55.55', `recorded ip is the trusted x-real-ip (got ${JSON.stringify((post1?.body as any)?.ip)})`);

  // Same trusted ip, already at the 5-attempt ceiling -> throttled, even
  // though this request's spoofed X-Forwarded-For first hop has never been
  // seen before (a card-tester cannot reset their own bucket by rotating it).
  scenario = { authOk: true, product: HOODIE, attemptsCount: 5 };
  const throttled = await handler(
    req(
      { store_type: 'gleeworld', items: [{ product_id: PRODUCT_ID, quantity: 1 }], buyer_email: 'card-test-4@example.com' },
      { 'x-real-ip': '55.55.55.55', 'x-forwarded-for': '3.3.3.3, 55.55.55.55' },
    ),
  );
  assert(throttled.status === 429, `request throttled based on x-real-ip regardless of a fresh spoofed x-forwarded-for (got ${throttled.status})`);
}

// ---- (g) fallback: no x-real-ip header (e.g. direct-to-origin test
//      traffic) -> use the LAST X-Forwarded-For hop (proxy-appended real
//      IP), never the first (client-controllable) entry. ------------------
{
  scenario = { authOk: true, product: HOODIE, attemptsCount: 0 };
  calls.length = 0;
  await handler(
    req(
      { store_type: 'gleeworld', items: [{ product_id: PRODUCT_ID, quantity: 1 }], buyer_email: 'card-test-3@example.com' },
      { 'x-forwarded-for': '6.6.6.6, 77.77.77.77' },
    ),
  );
  const post3 = calls.find((c) => c.url.includes('/rest/v1/gw_store_checkout_attempts') && c.method === 'POST');
  assert((post3?.body as any)?.ip === '77.77.77.77', `no x-real-ip -> falls back to the LAST X-Forwarded-For hop, not the spoofable first one (got ${JSON.stringify((post3?.body as any)?.ip)})`);
}

// ---- (h) shipping_address is persisted on the order when the cart
//      requires shipping (Task 6 gap: `store-checkout` received
//      shipping_address but never wrote ship_to_* to gw_store_orders). ----
{
  scenario = { authOk: true, product: HOODIE, attemptsCount: 0 };
  calls.length = 0;
  const res = await handler(
    req(
      {
        store_type: 'gleeworld',
        items: [{ product_id: PRODUCT_ID, quantity: 1 }],
        buyer_email: 'ship@example.com',
        shipping_address: VALID_SHIPPING,
      },
      { 'x-forwarded-for': '8.8.8.1' },
    ),
  );
  assert(res.status === 200, `physical item + valid shipping_address -> 200 (got ${res.status}, body ${await res.clone().text()})`);
  const orderPost = calls.find((c) => c.url.includes('/rest/v1/gw_store_orders') && c.method === 'POST');
  const b = (orderPost?.body ?? {}) as any;
  assert(b.ship_to_name === VALID_SHIPPING.name, `ship_to_name persisted (got ${JSON.stringify(b)})`);
  assert(b.ship_to_line1 === VALID_SHIPPING.line1, `ship_to_line1 persisted (got ${JSON.stringify(b)})`);
  assert(b.ship_to_line2 === VALID_SHIPPING.line2, `ship_to_line2 persisted (got ${JSON.stringify(b)})`);
  assert(b.ship_to_city === VALID_SHIPPING.city, `ship_to_city persisted (got ${JSON.stringify(b)})`);
  assert(b.ship_to_state === VALID_SHIPPING.state, `ship_to_state persisted (got ${JSON.stringify(b)})`);
  assert(b.ship_to_postal === VALID_SHIPPING.postal, `ship_to_postal persisted (got ${JSON.stringify(b)})`);
  assert(b.ship_to_country === VALID_SHIPPING.country, `ship_to_country persisted (got ${JSON.stringify(b)})`);
  assert(b.requires_shipping === true, `requires_shipping is true on the order (got ${JSON.stringify(b)})`);
}

// ---- (i) physical item with NO shipping_address -> 400 -------------------
{
  scenario = { authOk: true, product: HOODIE, attemptsCount: 0 };
  calls.length = 0;
  const res = await handler(
    req(
      { store_type: 'gleeworld', items: [{ product_id: PRODUCT_ID, quantity: 1 }], buyer_email: 'noship@example.com' },
      { 'x-forwarded-for': '8.8.8.2' },
    ),
  );
  assert(res.status === 400, `physical item, no shipping_address -> 400 (got ${res.status})`);
  const b = await res.json();
  assert(b.error === 'shipping address required for physical items', `error names the requirement (got ${JSON.stringify(b)})`);
  const orderPost = calls.find((c) => c.url.includes('/rest/v1/gw_store_orders') && c.method === 'POST');
  assert(!orderPost, 'no order is created when a required shipping address is missing');
}

// ---- (i2) physical item with an INCOMPLETE shipping_address (missing
//      city) -> 400, same as fully absent. ---------------------------------
{
  scenario = { authOk: true, product: HOODIE, attemptsCount: 0 };
  calls.length = 0;
  const res = await handler(
    req(
      {
        store_type: 'gleeworld',
        items: [{ product_id: PRODUCT_ID, quantity: 1 }],
        buyer_email: 'partial@example.com',
        shipping_address: { name: 'Jane Doe', line1: '123 Main St', state: 'GA', postal: '30301' },
      },
      { 'x-forwarded-for': '8.8.8.3' },
    ),
  );
  assert(res.status === 400, `physical item, incomplete shipping_address (missing city) -> 400 (got ${res.status})`);
  const orderPost = calls.find((c) => c.url.includes('/rest/v1/gw_store_orders') && c.method === 'POST');
  assert(!orderPost, 'no order is created for an incomplete shipping address');
}

// ---- (j) digital-only cart -> 200, no shipping_address required, and no
//      ship_to_* fields land on the order. ---------------------------------
{
  scenario = { authOk: true, product: EBOOK, attemptsCount: 0 };
  calls.length = 0;
  const res = await handler(
    req(
      { store_type: 'gleeworld', items: [{ product_id: PRODUCT_ID, quantity: 1 }], buyer_email: 'digital@example.com' },
      { 'x-forwarded-for': '8.8.8.4' },
    ),
  );
  assert(res.status === 200, `digital-only cart, no shipping_address -> 200 (got ${res.status}, body ${await res.clone().text()})`);
  const orderPost = calls.find((c) => c.url.includes('/rest/v1/gw_store_orders') && c.method === 'POST');
  const b = (orderPost?.body ?? {}) as any;
  assert(b.requires_shipping === false, `requires_shipping is false for a digital-only order (got ${JSON.stringify(b)})`);
  assert(b.ship_to_name == null, `no ship_to_name set for a digital order (got ${JSON.stringify(b)})`);
}

globalThis.fetch = origFetch;

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed.`);
  Deno.exit(1);
}
console.log('\nstore-checkout guest_test passed');
// index.ts's module-level `Deno.serve(handler)` starts a live listener as a
// side effect of the import above; without an explicit exit the process
// would hang open on that listener instead of returning a pass/fail code.
Deno.exit(0);
