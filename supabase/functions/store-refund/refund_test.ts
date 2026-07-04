// Local, network-free unit test for store-refund: the admin-gated edge
// function that refunds a paid gw_store_orders row in Stripe AND reflects
// it in the DB via gw_store_refund_order. Same fetch-stub approach as
// store-checkout/guest_test.ts and store-order-status/status_test.ts — no
// real Supabase/PostgREST/Stripe network calls are made.
//
// Run: cd supabase/functions && STRIPE_SECRET_KEY=sk_test_dummy \
//   deno run --allow-env --allow-net store-refund/refund_test.ts

Deno.env.set('SUPABASE_URL', Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'srk_test');
Deno.env.set('STRIPE_SECRET_KEY', Deno.env.get('STRIPE_SECRET_KEY') ?? 'sk_test_dummy');

const ORDER_ID = '11111111-1111-1111-1111-111111111111';
const REFUNDED_ORDER_ID = '22222222-2222-2222-2222-222222222222';
const UNKNOWN_ORDER_ID = '99999999-9999-9999-9999-999999999999';
const PAYMENT_INTENT = 'pi_test_abc123';

// ---- seed "table" -------------------------------------------------------
const ordersById: Record<string, { provider_payment_intent_id: string | null; status: string } | undefined> = {
  [ORDER_ID]: { provider_payment_intent_id: PAYMENT_INTENT, status: 'paid' },
  [REFUNDED_ORDER_ID]: { provider_payment_intent_id: PAYMENT_INTENT, status: 'refunded' },
};

// ---- caller scenario ------------------------------------------------------
// authOk: whether /auth/v1/user resolves to a real user (i.e. a bearer
// token was presented at all). isAdmin: the gw_profiles row's admin flags.
type Scenario = { authOk: boolean; isAdmin: boolean };
let scenario: Scenario = { authOk: true, isAdmin: true };

const calls: { url: string; method: string; headers: Record<string, string>; body: unknown }[] = [];

const origFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
  const method = (init?.method ?? 'GET').toUpperCase();
  const headers: Record<string, string> = {};
  if (init?.headers) {
    for (const [k, v] of Object.entries(init.headers as Record<string, string>)) headers[k.toLowerCase()] = v;
  }
  let body: unknown = init?.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      // Stripe sends form-urlencoded bodies — leave as the raw string.
    }
  }
  calls.push({ url, method, headers, body });

  const json = (b: unknown, status = 200) =>
    Promise.resolve(new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } }));

  // GoTrue: authenticateCaller's supabase.auth.getUser(token)
  if (url.includes('/auth/v1/user')) {
    return scenario.authOk ? json({ id: 'user-1', email: 'admin@example.com' }) : json({ error: 'invalid token' }, 401);
  }
  // authenticateCaller's admin-role lookup
  if (url.includes('/rest/v1/gw_profiles')) {
    return json([{ role: scenario.isAdmin ? 'admin' : 'member', is_admin: scenario.isAdmin, is_super_admin: false }]);
  }
  // order lookup
  if (url.includes('/rest/v1/gw_store_orders')) {
    const m = url.match(/[?&]id=eq\.([^&]+)/);
    const id = m ? decodeURIComponent(m[1]) : '';
    const row = ordersById[id];
    return json(row ? [row] : []);
  }
  // Stripe refund
  if (url.includes('api.stripe.com/v1/refunds')) {
    return json({ id: 're_test_1', status: 'succeeded' });
  }
  // gw_store_refund_order RPC
  if (url.includes('/rest/v1/rpc/gw_store_refund_order')) {
    const orderId = (body as any)?.p_order_id;
    const row = ordersById[orderId];
    if (row?.status === 'refunded') return json({ already_refunded: true });
    return json({ ok: true, order_id: orderId });
  }
  throw new Error(`unstubbed fetch: ${method} ${url}`);
}) as typeof fetch;

// Import AFTER the fetch stub + env vars are in place.
const { handler } = await import('./index.ts');

function req(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/store-refund', {
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

// ---- (a) no Authorization header -> 401, no downstream calls ------------
{
  calls.length = 0;
  const res = await handler(req({ order_id: ORDER_ID }));
  assert(res.status === 401, `no auth -> 401 (got ${res.status})`);
  assert(!calls.some((c) => c.url.includes('api.stripe.com')), 'no Stripe call made without auth');
}

// ---- (b) authenticated but non-admin -> 403 ------------------------------
{
  scenario = { authOk: true, isAdmin: false };
  calls.length = 0;
  const res = await handler(req({ order_id: ORDER_ID }, { Authorization: 'Bearer user_token' }));
  assert(res.status === 403, `non-admin caller -> 403 (got ${res.status})`);
  assert(!calls.some((c) => c.url.includes('api.stripe.com')), 'no Stripe call made for a non-admin caller');
}

// ---- (c) admin caller, known paid order -> Stripe refund issued, then the
//      RPC is called, response is {ok:true}. -------------------------------
{
  scenario = { authOk: true, isAdmin: true };
  calls.length = 0;
  const res = await handler(req({ order_id: ORDER_ID }, { Authorization: 'Bearer admin_token' }));
  assert(res.status === 200, `admin refund -> 200 (got ${res.status}, body ${await res.clone().text()})`);
  const outBody = await res.json();
  assert(outBody.ok === true, `response is {ok:true} (got ${JSON.stringify(outBody)})`);

  const stripeCall = calls.find((c) => c.url.includes('api.stripe.com/v1/refunds'));
  assert(!!stripeCall, 'a Stripe refund POST was issued');
  assert(String(stripeCall?.body).includes(`payment_intent=${PAYMENT_INTENT}`), `Stripe call carries the order's payment_intent (got ${stripeCall?.body})`);
  assert(!!stripeCall?.headers['idempotency-key'], 'Stripe refund POST carries an Idempotency-Key header');
  assert(stripeCall?.headers['idempotency-key'] === `refund-${ORDER_ID}`, `Idempotency-Key is refund-<order_id> (got ${stripeCall?.headers['idempotency-key']})`);
  assert(!('authorization' in stripeCall!.headers) || stripeCall!.headers['authorization'].startsWith('Bearer '), 'Stripe call is bearer-authenticated');

  const rpcCall = calls.find((c) => c.url.includes('/rest/v1/rpc/gw_store_refund_order'));
  assert(!!rpcCall, 'gw_store_refund_order RPC was called');
  assert((rpcCall?.body as any)?.p_order_id === ORDER_ID, `RPC called with p_order_id (got ${JSON.stringify(rpcCall?.body)})`);

  // Ordering: Stripe must be called before the DB is told the order is refunded.
  const stripeIdx = calls.findIndex((c) => c.url.includes('api.stripe.com/v1/refunds'));
  const rpcIdx = calls.findIndex((c) => c.url.includes('/rest/v1/rpc/gw_store_refund_order'));
  assert(stripeIdx < rpcIdx, 'Stripe refund happens before the gw_store_refund_order RPC call');
}

// ---- (d) unknown order_id -> 404, no Stripe/RPC calls --------------------
{
  scenario = { authOk: true, isAdmin: true };
  calls.length = 0;
  const res = await handler(req({ order_id: UNKNOWN_ORDER_ID }, { Authorization: 'Bearer admin_token' }));
  assert(res.status === 404, `unknown order -> 404 (got ${res.status})`);
  assert(!calls.some((c) => c.url.includes('api.stripe.com')), 'no Stripe call for an unknown order');
}

// ---- (e) idempotent second call: order already 'refunded' -> must not
//      error; per the documented choice, the Stripe call is skipped (the
//      RPC's own already_refunded idempotency covers the DB side) and the
//      response is still {ok:true}. -----------------------------------------
{
  scenario = { authOk: true, isAdmin: true };
  calls.length = 0;
  const res = await handler(req({ order_id: REFUNDED_ORDER_ID }, { Authorization: 'Bearer admin_token' }));
  assert(res.status === 200, `second call on an already-refunded order -> 200, not an error (got ${res.status}, body ${await res.clone().text()})`);
  const outBody = await res.json();
  assert(outBody.ok === true, `idempotent second call still returns {ok:true} (got ${JSON.stringify(outBody)})`);
  assert(!calls.some((c) => c.url.includes('api.stripe.com')), 'Stripe is NOT re-hit for an already-refunded order (documented idempotency choice)');
}

// ---- (f) malformed order_id (not a UUID) -> 400, rejected before any
//      lookup/interpolation. ------------------------------------------------
{
  scenario = { authOk: true, isAdmin: true };
  calls.length = 0;
  const res = await handler(req({ order_id: "not-a-uuid; drop table gw_store_orders;" }, { Authorization: 'Bearer admin_token' }));
  assert(res.status === 400, `non-UUID order_id -> 400 (got ${res.status})`);
  // Auth runs before body validation (calls to /auth/v1/user and
  // /rest/v1/gw_profiles are expected), but the bad id must never reach
  // the order lookup, Stripe, or the RPC.
  assert(!calls.some((c) => c.url.includes('/rest/v1/gw_store_orders')), 'malformed order_id never reaches the order lookup');
  assert(!calls.some((c) => c.url.includes('api.stripe.com')), 'malformed order_id never reaches Stripe');
  assert(!calls.some((c) => c.url.includes('rpc/gw_store_refund_order')), 'malformed order_id never reaches the RPC');
}

globalThis.fetch = origFetch;

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed.`);
  Deno.exit(1);
}
console.log('\nstore-refund refund_test passed');
// index.ts's module-level `Deno.serve(handler)` starts a live listener as a
// side effect of the import above; without an explicit exit the process
// would hang open on that listener instead of returning a pass/fail code.
Deno.exit(0);
