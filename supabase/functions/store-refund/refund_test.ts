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
Deno.env.set('SUPABASE_ANON_KEY', Deno.env.get('SUPABASE_ANON_KEY') ?? 'anon_test');
Deno.env.set('STRIPE_SECRET_KEY', Deno.env.get('STRIPE_SECRET_KEY') ?? 'sk_test_dummy');

const ORDER_ID = '11111111-1111-1111-1111-111111111111';
const REFUNDED_ORDER_ID = '22222222-2222-2222-2222-222222222222';
const UNKNOWN_ORDER_ID = '99999999-9999-9999-9999-999999999999';
const TENANT_ORDER_ID = '33333333-3333-3333-3333-333333333333';
const GLEEWORLD_ORDER_ID = '44444444-4444-4444-4444-444444444444';
const FAILED_ORDER_ID = '55555555-5555-5555-5555-555555555555';
const NO_ACCOUNT_TENANT_ORDER_ID = '66666666-6666-6666-6666-666666666666';
const PAYMENT_INTENT = 'pi_test_abc123';
const TENANT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const NO_ACCOUNT_TENANT_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const TENANT_STRIPE_ACCOUNT_ID = 'acct_test_connected123';

// ---- seed "table" -------------------------------------------------------
type OrderRow = {
  provider_payment_intent_id: string | null;
  status: string;
  store_type: string;
  tenant_id: string | null;
};
const ordersById: Record<string, OrderRow | undefined> = {
  [ORDER_ID]: { provider_payment_intent_id: PAYMENT_INTENT, status: 'paid', store_type: 'gleeworld', tenant_id: null },
  [REFUNDED_ORDER_ID]: { provider_payment_intent_id: PAYMENT_INTENT, status: 'refunded', store_type: 'gleeworld', tenant_id: null },
  [TENANT_ORDER_ID]: { provider_payment_intent_id: PAYMENT_INTENT, status: 'paid', store_type: 'tenant', tenant_id: TENANT_ID },
  [GLEEWORLD_ORDER_ID]: { provider_payment_intent_id: PAYMENT_INTENT, status: 'paid', store_type: 'gleeworld', tenant_id: null },
  [FAILED_ORDER_ID]: { provider_payment_intent_id: PAYMENT_INTENT, status: 'failed', store_type: 'gleeworld', tenant_id: null },
  [NO_ACCOUNT_TENANT_ORDER_ID]: { provider_payment_intent_id: PAYMENT_INTENT, status: 'paid', store_type: 'tenant', tenant_id: NO_ACCOUNT_TENANT_ID },
};

// ---- gw_tenants "table" ---------------------------------------------------
const tenantsById: Record<string, { stripe_account_id: string | null } | undefined> = {
  [TENANT_ID]: { stripe_account_id: TENANT_STRIPE_ACCOUNT_ID },
  [NO_ACCOUNT_TENANT_ID]: { stripe_account_id: null },
};

// ---- caller scenario ------------------------------------------------------
// authOk: whether /auth/v1/user resolves to a real user (i.e. a bearer
// token was presented at all). isAdmin: the gw_profiles row's admin flags
// (authenticateCaller's tenant-agnostic gate). tenantId: the signature-
// verified `tenant_id` claim on the caller's own JWT (null for a
// GleeWorld-platform-side caller) — this is what verifyJwtClaims hands
// back and what the handler must match against the *order's* tenant_id
// before ever touching Stripe/the RPC.
type Scenario = { authOk: boolean; isAdmin: boolean; tenantId: string | null };
let scenario: Scenario = { authOk: true, isAdmin: true, tenantId: null };

// verifyJwtClaims decodes the JWT payload itself via atob() on the token's
// middle segment (same as store-admin-orders/admin_orders_test.ts) — it
// doesn't ask PostgREST for claims — so the stub needs a real-shaped (if
// fake-signed) JWT whose payload carries `scenario.tenantId`.
function fakeJwt(tenantId: string | null): string {
  const b64url = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64url({ alg: 'none' })}.${b64url({ tenant_id: tenantId })}.sig`;
}
function bearerFor(tenantId: string | null): Record<string, string> {
  return { Authorization: `Bearer ${fakeJwt(tenantId)}` };
}

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
  // tenant lookup (Connect account resolution for store_type='tenant' orders)
  if (url.includes('/rest/v1/gw_tenants')) {
    const m = url.match(/[?&]id=eq\.([^&]+)/);
    const id = m ? decodeURIComponent(m[1]) : '';
    const row = tenantsById[id];
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
  scenario = { authOk: true, isAdmin: false, tenantId: null };
  calls.length = 0;
  const res = await handler(req({ order_id: ORDER_ID }, bearerFor(null)));
  assert(res.status === 403, `non-admin caller -> 403 (got ${res.status})`);
  assert(!calls.some((c) => c.url.includes('api.stripe.com')), 'no Stripe call made for a non-admin caller');
}

// ---- (c) admin caller, known paid order, caller's own tenant_id matches
//      the order's tenant_id (both null: a GleeWorld-platform-side admin
//      refunding a GleeWorld-store order) -> Stripe refund issued, then the
//      RPC is called, response is {ok:true}. -------------------------------
{
  scenario = { authOk: true, isAdmin: true, tenantId: null };
  calls.length = 0;
  const res = await handler(req({ order_id: ORDER_ID }, bearerFor(null)));
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
  scenario = { authOk: true, isAdmin: true, tenantId: null };
  calls.length = 0;
  const res = await handler(req({ order_id: UNKNOWN_ORDER_ID }, bearerFor(null)));
  assert(res.status === 404, `unknown order -> 404 (got ${res.status})`);
  assert(!calls.some((c) => c.url.includes('api.stripe.com')), 'no Stripe call for an unknown order');
}

// ---- (e) idempotent second call: order already 'refunded' -> must not
//      error; per the documented choice, the Stripe call is skipped (the
//      RPC's own already_refunded idempotency covers the DB side) and the
//      response is still {ok:true}. -----------------------------------------
{
  scenario = { authOk: true, isAdmin: true, tenantId: null };
  calls.length = 0;
  const res = await handler(req({ order_id: REFUNDED_ORDER_ID }, bearerFor(null)));
  assert(res.status === 200, `second call on an already-refunded order -> 200, not an error (got ${res.status}, body ${await res.clone().text()})`);
  const outBody = await res.json();
  assert(outBody.ok === true, `idempotent second call still returns {ok:true} (got ${JSON.stringify(outBody)})`);
  assert(!calls.some((c) => c.url.includes('api.stripe.com')), 'Stripe is NOT re-hit for an already-refunded order (documented idempotency choice)');
}

// ---- (f) malformed order_id (not a UUID) -> 400, rejected before any
//      lookup/interpolation. ------------------------------------------------
{
  scenario = { authOk: true, isAdmin: true, tenantId: null };
  calls.length = 0;
  const res = await handler(req({ order_id: "not-a-uuid; drop table gw_store_orders;" }, bearerFor(null)));
  assert(res.status === 400, `non-UUID order_id -> 400 (got ${res.status})`);
  // Auth runs before body validation (calls to /auth/v1/user and
  // /rest/v1/gw_profiles are expected), but the bad id must never reach
  // the order lookup, Stripe, or the RPC.
  assert(!calls.some((c) => c.url.includes('/rest/v1/gw_store_orders')), 'malformed order_id never reaches the order lookup');
  assert(!calls.some((c) => c.url.includes('api.stripe.com')), 'malformed order_id never reaches Stripe');
  assert(!calls.some((c) => c.url.includes('rpc/gw_store_refund_order')), 'malformed order_id never reaches the RPC');
}

// ---- (g) store_type='tenant' order -> Stripe refund carries a
//      Stripe-Account header equal to the tenant's connected account
//      (Connect direct charge; platform key alone can't see the PI). -------
{
  scenario = { authOk: true, isAdmin: true, tenantId: TENANT_ID };
  calls.length = 0;
  const res = await handler(req({ order_id: TENANT_ORDER_ID }, bearerFor(TENANT_ID)));
  assert(res.status === 200, `tenant-store refund -> 200 (got ${res.status}, body ${await res.clone().text()})`);
  const stripeCall = calls.find((c) => c.url.includes('api.stripe.com/v1/refunds'));
  assert(!!stripeCall, 'a Stripe refund POST was issued for a tenant-store order');
  assert(
    stripeCall?.headers['stripe-account'] === TENANT_STRIPE_ACCOUNT_ID,
    `Stripe call carries Stripe-Account: <tenant's connected account> (got ${stripeCall?.headers['stripe-account']})`,
  );
}

// ---- (h) store_type='gleeworld' order -> Stripe refund issued on the
//      platform account, NO Stripe-Account header. -------------------------
{
  scenario = { authOk: true, isAdmin: true, tenantId: null };
  calls.length = 0;
  const res = await handler(req({ order_id: GLEEWORLD_ORDER_ID }, bearerFor(null)));
  assert(res.status === 200, `gleeworld-store refund -> 200 (got ${res.status}, body ${await res.clone().text()})`);
  const stripeCall = calls.find((c) => c.url.includes('api.stripe.com/v1/refunds'));
  assert(!!stripeCall, 'a Stripe refund POST was issued for a gleeworld-store order');
  assert(!('stripe-account' in stripeCall!.headers), 'no Stripe-Account header on a platform (gleeworld) order refund');
}

// ---- (i) tenant order whose tenant has no stripe_account_id on file ->
//      400, no Stripe call. --------------------------------------------------
{
  scenario = { authOk: true, isAdmin: true, tenantId: NO_ACCOUNT_TENANT_ID };
  calls.length = 0;
  const res = await handler(req({ order_id: NO_ACCOUNT_TENANT_ORDER_ID }, bearerFor(NO_ACCOUNT_TENANT_ID)));
  assert(res.status === 400, `tenant with no connected account -> 400 (got ${res.status})`);
  assert(!calls.some((c) => c.url.includes('api.stripe.com')), 'no Stripe call when the tenant has no connected account');
}

// ---- (j) non-'paid', non-'refunded' order (e.g. 'failed') -> 409, and
//      NEITHER Stripe nor the RPC is called, even though a payment_intent
//      is on file. --------------------------------------------------------
{
  scenario = { authOk: true, isAdmin: true, tenantId: null };
  calls.length = 0;
  const res = await handler(req({ order_id: FAILED_ORDER_ID }, bearerFor(null)));
  assert(res.status === 409, `non-paid, non-refunded order -> 409 (got ${res.status})`);
  const outBody = await res.json();
  assert(outBody.error === 'order not refundable', `error body says not refundable (got ${JSON.stringify(outBody)})`);
  assert(outBody.status === 'failed', `error body echoes the order's status (got ${JSON.stringify(outBody)})`);
  assert(!calls.some((c) => c.url.includes('api.stripe.com')), 'no Stripe call for a non-refundable order');
  assert(!calls.some((c) => c.url.includes('rpc/gw_store_refund_order')), 'no RPC call for a non-refundable order');
}

// ---- (k) CROSS-TENANT: an admin whose verified JWT tenant_id does NOT
//      match the order's tenant_id -> 403 forbidden, and NEITHER Stripe NOR
//      the RPC is ever called. This is the actual hole being closed: a
//      tenant-A admin (or a GleeWorld-platform-side admin with no
//      tenant_id) must not be able to refund tenant-B's order just by
//      knowing/guessing its order_id. isAdmin is tenant-agnostic (true for
//      any admin), so this must be caught by the tenant_id comparison, not
//      the admin-role gate. ---------------------------------------------
{
  scenario = { authOk: true, isAdmin: true, tenantId: NO_ACCOUNT_TENANT_ID };
  calls.length = 0;
  const res = await handler(req({ order_id: TENANT_ORDER_ID }, bearerFor(NO_ACCOUNT_TENANT_ID)));
  assert(res.status === 403, `cross-tenant admin -> 403 (got ${res.status}, body ${await res.clone().text()})`);
  const outBody = await res.json();
  assert(
    outBody.error === 'forbidden: order belongs to another tenant',
    `error body names the forbidden reason (got ${JSON.stringify(outBody)})`,
  );
  assert(!calls.some((c) => c.url.includes('api.stripe.com')), 'no Stripe call for a cross-tenant refund attempt');
  assert(!calls.some((c) => c.url.includes('rpc/gw_store_refund_order')), 'no RPC call for a cross-tenant refund attempt');
}

// ---- (k2) CROSS-TENANT, platform order: a tenant admin (real tenant_id)
//      must not be able to refund a GleeWorld-platform-store order
//      (tenant_id: null) either -> 403, no Stripe/RPC. -------------------
{
  scenario = { authOk: true, isAdmin: true, tenantId: TENANT_ID };
  calls.length = 0;
  const res = await handler(req({ order_id: GLEEWORLD_ORDER_ID }, bearerFor(TENANT_ID)));
  assert(res.status === 403, `tenant admin refunding a platform order -> 403 (got ${res.status})`);
  assert(!calls.some((c) => c.url.includes('api.stripe.com')), 'no Stripe call for a tenant admin on a platform order');
  assert(!calls.some((c) => c.url.includes('rpc/gw_store_refund_order')), 'no RPC call for a tenant admin on a platform order');
}

// ---- (l) internal (service-role) caller bypasses the tenant check: an
//      internal call has no user tenant_id of its own and must still be
//      allowed to refund any tenant's order. -----------------------------
{
  scenario = { authOk: true, isAdmin: true, tenantId: null };
  calls.length = 0;
  const res = await handler(req({ order_id: TENANT_ORDER_ID }, { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` }));
  assert(res.status === 200, `internal/service-role caller -> 200 regardless of tenant (got ${res.status}, body ${await res.clone().text()})`);
  assert(calls.some((c) => c.url.includes('api.stripe.com')), 'internal caller still triggers the Stripe refund');
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
