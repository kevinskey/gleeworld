// Local, network-free unit test for store-admin-orders: the admin-gated,
// tenant-scoped order read used by the Product Management "Orders" admin
// screen. Same fetch-stub approach as store-refund/refund_test.ts — no real
// Supabase/PostgREST network calls are made.
//
// Run: cd supabase/functions && deno run --allow-env --allow-net \
//   store-admin-orders/admin_orders_test.ts

Deno.env.set('SUPABASE_URL', Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'srk_test');
Deno.env.set('SUPABASE_ANON_KEY', Deno.env.get('SUPABASE_ANON_KEY') ?? 'anon_test');

const TENANT_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const TENANT_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const ORDER_A = '11111111-1111-1111-1111-111111111111';
const ORDER_B = '22222222-2222-2222-2222-222222222222';
const UNKNOWN_ORDER = '99999999-9999-9999-9999-999999999999';

// ---- seed "tables" -------------------------------------------------------
const ordersById: Record<string, any> = {
  [ORDER_A]: {
    id: ORDER_A, status: 'paid', store_type: 'gleeworld', buyer_email: 'a@example.com',
    amount_cents: 2500, currency: 'usd', requires_shipping: false,
    ship_to_name: null, ship_to_line1: null, ship_to_line2: null, ship_to_city: null,
    ship_to_state: null, ship_to_postal: null, ship_to_country: null,
    provider_payment_intent_id: 'pi_a', created_at: '2026-07-01T00:00:00Z', updated_at: '2026-07-01T00:00:00Z',
    tenant_id: TENANT_A,
  },
  [ORDER_B]: {
    id: ORDER_B, status: 'paid', store_type: 'tenant', buyer_email: 'b@example.com',
    amount_cents: 5000, currency: 'usd', requires_shipping: true,
    ship_to_name: 'B Buyer', ship_to_line1: '1 Main St', ship_to_line2: null, ship_to_city: 'Metropolis',
    ship_to_state: 'NY', ship_to_postal: '10001', ship_to_country: 'US',
    provider_payment_intent_id: 'pi_b', created_at: '2026-07-02T00:00:00Z', updated_at: '2026-07-02T00:00:00Z',
    tenant_id: TENANT_B,
  },
};
const itemsByOrder: Record<string, any[]> = {
  [ORDER_A]: [
    { id: 'item-1', order_id: ORDER_A, tenant_id: TENANT_A, product_id: 'prod-1', variant_id: null, unit_price_cents: 2500, quantity: 1, is_digital: true, gw_products: { name: 'Digital Score' } },
  ],
  [ORDER_B]: [
    { id: 'item-2', order_id: ORDER_B, tenant_id: TENANT_B, product_id: 'prod-2', variant_id: null, unit_price_cents: 5000, quantity: 1, is_digital: false, gw_products: { name: 'T-Shirt' } },
  ],
};

// ---- caller scenario ------------------------------------------------------
// authOk: whether /auth/v1/user resolves (i.e. a bearer token was presented
// and GoTrue accepts its signature). claims: the decoded JWT payload
// verifyJwtClaims would hand back (tenant_id / tenant_role).
type Scenario = { authOk: boolean; claims: Record<string, unknown> };
let scenario: Scenario = { authOk: true, claims: { tenant_id: TENANT_A, tenant_role: 'admin' } };

// verifyJwtClaims decodes the JWT payload itself via atob() on the token's
// middle segment — it doesn't ask PostgREST for claims. So the stub needs a
// real-shaped (if fake-signed) JWT whose payload matches `scenario.claims`.
function fakeJwt(payload: Record<string, unknown>): string {
  const b64url = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64url({ alg: 'none' })}.${b64url(payload)}.sig`;
}

// Mimics PostgREST's column projection for `select=a,b,c` so the mock
// doesn't silently leak fields (e.g. tenant_id) that the real query never
// asked for. Embedded-resource specs like `gw_products(name)` are kept
// whole (matched by the key before the `(`).
function project(row: Record<string, unknown>, selectParam: string | null): Record<string, unknown> {
  if (!selectParam) return row;
  const fields = selectParam.split(',').map((f) => f.split('(')[0]);
  const out: Record<string, unknown> = {};
  for (const f of fields) if (f in row) out[f] = row[f];
  return out;
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
    try { body = JSON.parse(body); } catch { /* leave as-is */ }
  }
  calls.push({ url, method, headers, body });

  const json = (b: unknown, status = 200) =>
    Promise.resolve(new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } }));

  // GoTrue: verifyJwtClaims's signature check.
  if (url.includes('/auth/v1/user')) {
    return scenario.authOk ? json({ id: 'user-1', email: 'admin@example.com' }) : json({ error: 'invalid token' }, 401);
  }
  // order lookup (single or list)
  if (url.includes('/rest/v1/gw_store_orders')) {
    const idMatch = url.match(/[?&]id=eq\.([^&]+)/);
    const tenantMatch = url.match(/[?&]tenant_id=eq\.([^&]+)/);
    const selectMatch = url.match(/[?&]select=([^&]+)/);
    const select = selectMatch ? decodeURIComponent(selectMatch[1]) : null;
    const tenant = tenantMatch ? decodeURIComponent(tenantMatch[1]) : null;
    if (idMatch) {
      const id = decodeURIComponent(idMatch[1]);
      const row = ordersById[id];
      const match = row && (!tenant || row.tenant_id === tenant) ? [project(row, select)] : [];
      return json(match);
    }
    // list: every order whose tenant_id matches
    const rows = Object.values(ordersById)
      .filter((o: any) => !tenant || o.tenant_id === tenant)
      .map((o: any) => project(o, select));
    return json(rows);
  }
  // order items lookup
  if (url.includes('/rest/v1/gw_store_order_items')) {
    const orderMatch = url.match(/[?&]order_id=eq\.([^&]+)/);
    const tenantMatch = url.match(/[?&]tenant_id=eq\.([^&]+)/);
    const selectMatch = url.match(/[?&]select=([^&]+)/);
    const select = selectMatch ? decodeURIComponent(selectMatch[1]) : null;
    const tenant = tenantMatch ? decodeURIComponent(tenantMatch[1]) : null;
    const orderId = orderMatch ? decodeURIComponent(orderMatch[1]) : '';
    const rows = (itemsByOrder[orderId] ?? [])
      .filter((it) => !tenant || it.tenant_id === tenant)
      .map((it) => project(it, select));
    return json(rows);
  }
  throw new Error(`unstubbed fetch: ${method} ${url}`);
}) as typeof fetch;

// Import AFTER the fetch stub + env vars are in place.
const { handler } = await import('./index.ts');

function req(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/store-admin-orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

function authHeaderFor(s: Scenario): Record<string, string> {
  return s.authOk ? { Authorization: `Bearer ${fakeJwt(s.claims)}` } : {};
}

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) { failures++; console.error(`FAIL: ${msg}`); }
  else console.log(`ok: ${msg}`);
}

// ---- (a) no Authorization header -> 401, no downstream calls -------------
{
  calls.length = 0;
  const res = await handler(req({}));
  assert(res.status === 401, `no auth -> 401 (got ${res.status})`);
  assert(!calls.some((c) => c.url.includes('/rest/v1/gw_store_orders')), 'no order lookup made without auth');
}

// ---- (b) valid JWT but not an admin tenant_role -> 403 -------------------
{
  scenario = { authOk: true, claims: { tenant_id: TENANT_A, tenant_role: 'member' } };
  calls.length = 0;
  const res = await handler(req({}, authHeaderFor(scenario)));
  assert(res.status === 403, `non-admin tenant_role -> 403 (got ${res.status})`);
  assert(!calls.some((c) => c.url.includes('/rest/v1/gw_store_orders')), 'no order lookup made for a non-admin caller');
}

// ---- (c) admin, but JWT has no tenant_id -> 401 ---------------------------
{
  scenario = { authOk: true, claims: { tenant_role: 'admin' } };
  calls.length = 0;
  const res = await handler(req({}, authHeaderFor(scenario)));
  assert(res.status === 401, `missing tenant_id -> 401 (got ${res.status})`);
}

// ---- (d) admin caller -> list returns ONLY this tenant's orders ----------
{
  scenario = { authOk: true, claims: { tenant_id: TENANT_A, tenant_role: 'admin' } };
  calls.length = 0;
  const res = await handler(req({}, authHeaderFor(scenario)));
  assert(res.status === 200, `admin list -> 200 (got ${res.status})`);
  const body = await res.json();
  assert(Array.isArray(body.orders), 'response has an orders array');
  assert(body.orders.length === 1 && body.orders[0].id === ORDER_A, `list scoped to tenant A only (got ${JSON.stringify(body.orders.map((o: any) => o.id))})`);
  assert(!('tenant_id' in body.orders[0]), 'order list rows do not leak tenant_id');
  const listCall = calls.find((c) => c.url.includes('/rest/v1/gw_store_orders'));
  assert(!!listCall && listCall.url.includes(`tenant_id=eq.${TENANT_A}`), 'the PostgREST call itself carries tenant_id=eq.<caller tenant>');
}

// ---- (e) tenant B admin cannot fetch tenant A's order by id (cross-tenant
//      IDOR) -> 404, not the order. -----------------------------------------
{
  scenario = { authOk: true, claims: { tenant_id: TENANT_B, tenant_role: 'admin' } };
  calls.length = 0;
  const res = await handler(req({ order_id: ORDER_A }, authHeaderFor(scenario)));
  assert(res.status === 404, `cross-tenant order_id -> 404, not the other tenant's order (got ${res.status})`);
}

// ---- (f) admin fetches their own order by id -> order + items with
//      embedded product name. ------------------------------------------------
{
  scenario = { authOk: true, claims: { tenant_id: TENANT_B, tenant_role: 'super-admin' } };
  calls.length = 0;
  const res = await handler(req({ order_id: ORDER_B }, authHeaderFor(scenario)));
  assert(res.status === 200, `own-tenant order detail -> 200 (got ${res.status}, ${await res.clone().text()})`);
  const body = await res.json();
  assert(body.order?.id === ORDER_B, 'order detail returns the requested order');
  assert(Array.isArray(body.items) && body.items.length === 1, 'order detail returns its line items');
  assert(body.items[0]?.gw_products?.name === 'T-Shirt', `line item embeds product name (got ${JSON.stringify(body.items[0])})`);
}

// ---- (g) malformed order_id -> 400, no lookups ----------------------------
{
  scenario = { authOk: true, claims: { tenant_id: TENANT_A, tenant_role: 'admin' } };
  calls.length = 0;
  const res = await handler(req({ order_id: "'; drop table gw_store_orders;" }, authHeaderFor(scenario)));
  assert(res.status === 400, `non-UUID order_id -> 400 (got ${res.status})`);
  assert(!calls.some((c) => c.url.includes('/rest/v1/gw_store_orders')), 'malformed order_id never reaches the order lookup');
}

// ---- (h) unknown order_id -> 404 ------------------------------------------
{
  scenario = { authOk: true, claims: { tenant_id: TENANT_A, tenant_role: 'admin' } };
  calls.length = 0;
  const res = await handler(req({ order_id: UNKNOWN_ORDER }, authHeaderFor(scenario)));
  assert(res.status === 404, `unknown order_id -> 404 (got ${res.status})`);
}

globalThis.fetch = origFetch;

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed.`);
  Deno.exit(1);
}
console.log('\nstore-admin-orders admin_orders_test passed');
// index.ts's module-level `Deno.serve(handler)` starts a live listener as a
// side effect of the import above; without an explicit exit the process
// would hang open on that listener instead of returning a pass/fail code.
Deno.exit(0);
