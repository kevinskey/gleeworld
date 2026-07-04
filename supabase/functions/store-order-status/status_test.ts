// Local, network-free unit test for store-order-status's request-handling
// logic: this endpoint is the anti-IDOR gate for the guest post-checkout
// success page. It must return order status/entitlements ONLY when the
// caller-supplied `t` query param exactly matches the order's opaque
// `access_token` — a missing, blank, or wrong token, or an unknown order
// id, must all yield 403 with NO order data (never buyer PII, never
// status leaked to a guesser).
//
// No real Supabase/PostgREST network calls are made — every `fetch` the
// handler performs is intercepted by a stub keyed on request URL, which
// mimics PostgREST's real server-side AND-filtering: the stub only
// returns a row when BOTH id=eq.<order> AND access_token=eq.<t> match a
// seeded order (a wrong token must produce an empty array, exactly like
// a real `...&id=eq.X&access_token=eq.wrong...` query would against
// Postgres, not a fetch-then-compare-in-JS shortcut).
//
// Run: cd supabase/functions && deno run --allow-env --allow-net \
//   store-order-status/status_test.ts

Deno.env.set('SUPABASE_URL', Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'srk_test');

const ORDER_ID = 'order-1';
const ACCESS_TOKEN = 'tok_correct_abc123';
const WRONG_TOKEN = 'tok_wrong_zzz999';
const UNKNOWN_ORDER_ID = 'order-does-not-exist';

// ---- seed "table" ------------------------------------------------------
const ordersById: Record<string, { status: string; access_token: string } | undefined> = {
  [ORDER_ID]: { status: 'paid', access_token: ACCESS_TOKEN },
};
const entitlementsByOrder: Record<string, Array<{ product_id: string; download_token: string }>> = {
  [ORDER_ID]: [{ product_id: 'prod-1', download_token: 'dl_tok_1' }],
};

const calls: { url: string; method: string }[] = [];

const origFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
  const method = (init?.method ?? 'GET').toUpperCase();
  calls.push({ url, method });

  const json = (b: unknown, status = 200) =>
    Promise.resolve(new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } }));

  if (url.includes('/rest/v1/gw_store_orders')) {
    // Real PostgREST would AND both filters server-side; replicate that
    // here instead of just looking the order up by id and comparing the
    // token in JS, so a handler bug that forgets the access_token filter
    // would still (wrongly) pass a naive test but fails this one.
    const idMatch = url.match(/[?&]id=eq\.([^&]+)/);
    const tokenMatch = url.match(/[?&]access_token=eq\.([^&]+)/);
    if (!idMatch || !tokenMatch) return json([]); // no token filter present at all -> no rows, ever
    const id = decodeURIComponent(idMatch[1]);
    const token = decodeURIComponent(tokenMatch[1]);
    const row = ordersById[id];
    const matches = row && token && row.access_token === token;
    return json(matches ? [{ status: row!.status }] : []);
  }
  if (url.includes('/rest/v1/gw_store_entitlements')) {
    const m = url.match(/order_id=eq\.([^&]+)/);
    const orderId = m ? decodeURIComponent(m[1]) : '';
    return json(entitlementsByOrder[orderId] ?? []);
  }
  throw new Error(`unstubbed fetch: ${method} ${url}`);
}) as typeof fetch;

// Import AFTER the fetch stub + env vars are in place, since index.ts may
// read SUPABASE_* env at module-evaluation time.
const { handler } = await import('./index.ts');

function req(qs: string): Request {
  return new Request(`http://localhost/store-order-status${qs}`, { method: 'GET' });
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

// ---- (a) valid token -> 200 {status:'paid', entitlements:[...]} -------
{
  calls.length = 0;
  const res = await handler(req(`?order=${ORDER_ID}&t=${ACCESS_TOKEN}`));
  assert(res.status === 200, `valid token -> 200 (got ${res.status})`);
  const body = await res.json();
  assert(body.status === 'paid', `status is 'paid' (got ${JSON.stringify(body.status)})`);
  assert(Array.isArray(body.entitlements) && body.entitlements.length === 1, `entitlements array present (got ${JSON.stringify(body.entitlements)})`);
  assert(body.entitlements[0].product_id === 'prod-1', 'entitlement has product_id');
  assert(body.entitlements[0].download_token === 'dl_tok_1', 'entitlement has download_token');
  // No buyer PII of any kind should ever be present on this response.
  assert(!('buyer_email' in body), 'response never includes buyer_email');
  assert(!('buyer_user_id' in body), 'response never includes buyer_user_id');
  const ordersCall = calls.find((c) => c.url.includes('/rest/v1/gw_store_orders'));
  assert(!!ordersCall, 'a gw_store_orders lookup was issued');
  assert(ordersCall!.url.includes(`id=eq.${ORDER_ID}`), 'lookup filters by order id');
  assert(ordersCall!.url.includes(`access_token=eq.${ACCESS_TOKEN}`), 'lookup filters by access_token server-side (the anti-IDOR gate)');
}

// ---- (b) wrong token -> 403, no order data -----------------------------
{
  const res = await handler(req(`?order=${ORDER_ID}&t=${WRONG_TOKEN}`));
  assert(res.status === 403, `wrong token -> 403 (got ${res.status})`);
  const body = await res.json();
  assert(body.status === undefined, 'wrong token response carries no status');
  assert(body.entitlements === undefined, 'wrong token response carries no entitlements');
}

// ---- (c) missing token -> 403 ------------------------------------------
{
  const res = await handler(req(`?order=${ORDER_ID}`));
  assert(res.status === 403, `missing token -> 403 (got ${res.status})`);
}

// ---- (c2) blank token -> 403 -------------------------------------------
{
  const res = await handler(req(`?order=${ORDER_ID}&t=`));
  assert(res.status === 403, `blank token -> 403 (got ${res.status})`);
}

// ---- (d) unknown order -> 403 -------------------------------------------
{
  const res = await handler(req(`?order=${UNKNOWN_ORDER_ID}&t=${ACCESS_TOKEN}`));
  assert(res.status === 403, `unknown order -> 403 (got ${res.status})`);
}

// ---- (e) pending order -> 200 {status:'pending'} with NO entitlements ---
// (only paid orders should ever surface entitlements)
{
  ordersById['order-2'] = { status: 'pending', access_token: 'tok_pending_1' };
  const res = await handler(req(`?order=order-2&t=tok_pending_1`));
  assert(res.status === 200, `pending order, correct token -> 200 (got ${res.status})`);
  const body = await res.json();
  assert(body.status === 'pending', `status is 'pending' (got ${JSON.stringify(body.status)})`);
  assert(Array.isArray(body.entitlements) && body.entitlements.length === 0, 'pending order has no entitlements');
}

globalThis.fetch = origFetch;

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed.`);
  Deno.exit(1);
}
console.log('\nstore-order-status status_test passed');
// index.ts's module-level `Deno.serve(handler)` starts a live listener as a
// side effect of the import above; without an explicit exit the process
// would hang open on that listener instead of returning a pass/fail code.
Deno.exit(0);
