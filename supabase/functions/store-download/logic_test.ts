// Local, network-free unit test for store-download's pure request-handling
// logic: missing token, invalid token, expired entitlement, and the happy
// path (valid entitlement + product with a digital_object_key -> presigned
// 302 + download-evidence PATCH). No real Supabase/PostgREST or DO Spaces
// network calls are made — every `fetch` the handler performs is
// intercepted by a stub keyed on request URL/method, so this exercises the
// exact code path in index.ts against fixtures instead of a live stack.
//
// aws4fetch's `AwsClient.sign()` is pure crypto (HMAC-SHA256 via
// SubtleCrypto) — it never makes a network call itself, so signing works
// offline against dummy SPACES_* credentials. The only network fetch that
// happens anywhere in this test is Deno resolving the `esm.sh/aws4fetch`
// module specifier itself, which is why `--allow-net` is still passed; no
// request the *handler* makes at runtime touches the network.
//
// Run: cd supabase/functions && SPACES_KEY=dummykey SPACES_SECRET=dummysecret \
//   SPACES_BUCKET=dummy-bucket SPACES_REGION=nyc3 SUPABASE_URL=http://kong:8000 \
//   SUPABASE_SERVICE_ROLE_KEY=srk deno run --allow-env --allow-net store-download/logic_test.ts
//
// (env vars are also set programmatically below via Deno.env.set so a bare
// `deno run --allow-env --allow-net store-download/logic_test.ts` works.)

Deno.env.set('SUPABASE_URL', Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'srk_test');
Deno.env.set('SPACES_KEY', Deno.env.get('SPACES_KEY') ?? 'dummykey');
Deno.env.set('SPACES_SECRET', Deno.env.get('SPACES_SECRET') ?? 'dummysecret');
Deno.env.set('SPACES_BUCKET', Deno.env.get('SPACES_BUCKET') ?? 'dummy-bucket');
Deno.env.set('SPACES_REGION', Deno.env.get('SPACES_REGION') ?? 'nyc3');

const VALID_TOKEN = 'tok_valid_abc123';
const EXPIRED_TOKEN = 'tok_expired_xyz789';
const UNKNOWN_TOKEN = 'tok_does_not_exist';
const NO_FILE_TOKEN = 'tok_no_digital_file';
const ENTITLEMENT_ID = 'ent-1';
const PRODUCT_ID = 'prod-1';
const NO_FILE_PRODUCT_ID = 'prod-2';

// ---- fetch stub -----------------------------------------------------
// Scenario state the router below reads from; a small in-memory "table" of
// entitlements keyed by download_token, plus a products lookup by id.
const entitlementsByToken: Record<string, Record<string, unknown> | undefined> = {
  [VALID_TOKEN]: {
    id: ENTITLEMENT_ID,
    product_id: PRODUCT_ID,
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // +1h
    download_count: 2,
  },
  [EXPIRED_TOKEN]: {
    id: 'ent-2',
    product_id: PRODUCT_ID,
    expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // -1h (past)
    download_count: 0,
  },
  [NO_FILE_TOKEN]: {
    id: 'ent-3',
    product_id: NO_FILE_PRODUCT_ID,
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    download_count: 0,
  },
};
const productsById: Record<string, Record<string, unknown> | undefined> = {
  [PRODUCT_ID]: { digital_object_key: 'downloads/sheet-music/some-anthem.pdf' },
  [NO_FILE_PRODUCT_ID]: { digital_object_key: null },
};

const calls: { url: string; method: string; body: unknown }[] = [];

// When true, the fetch stub rejects the entitlements PATCH (simulating a
// transient PostgREST failure) instead of returning 204. Used to prove the
// evidence write is fire-and-forget and never blocks delivery.
let failEvidencePatch = false;

const origFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
  const method = (init?.method ?? 'GET').toUpperCase();
  let body: unknown = init?.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      // leave as-is
    }
  }
  calls.push({ url, method, body });

  const json = (b: unknown, status = 200) =>
    Promise.resolve(new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } }));

  if (url.includes('/rest/v1/gw_store_entitlements')) {
    // 204 is a null-body status; a "null" JSON string body would throw when
    // constructing the Response (matches PostgREST's real empty PATCH reply).
    if (method === 'PATCH') {
      if (failEvidencePatch) return Promise.reject(new Error('simulated PostgREST 500'));
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    // GET by download_token=eq.<token>
    const m = url.match(/download_token=eq\.([^&]+)/);
    const token = m ? decodeURIComponent(m[1]) : '';
    const row = entitlementsByToken[token];
    return json(row ? [row] : []);
  }
  if (url.includes('/rest/v1/gw_products')) {
    const m = url.match(/id=eq\.([^&]+)/);
    const id = m ? decodeURIComponent(m[1]) : '';
    const row = productsById[id];
    return json(row ? [row] : []);
  }
  throw new Error(`unstubbed fetch: ${method} ${url}`);
}) as typeof fetch;

// Import AFTER the fetch stub + env vars are in place, since index.ts reads
// SPACES_* / SUPABASE_* env at module-evaluation time.
const { handler } = await import('./index.ts');

function req(qs: string): Request {
  return new Request(`http://localhost/store-download${qs}`, { method: 'GET' });
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

// ---- (a) no token param -> 400 ----------------------------------------
{
  const res = await handler(req(''));
  assert(res.status === 400, `no token -> 400 (got ${res.status})`);
}

// ---- (b) token not found -> 403 ---------------------------------------
{
  const res = await handler(req(`?token=${UNKNOWN_TOKEN}`));
  assert(res.status === 403, `unknown token -> 403 (got ${res.status})`);
}

// ---- (c) expired entitlement -> 403 ------------------------------------
{
  const res = await handler(req(`?token=${EXPIRED_TOKEN}`));
  assert(res.status === 403, `expired entitlement -> 403 (got ${res.status})`);
}

// ---- (d) valid + unexpired entitlement, product has digital_object_key ->
//         302 to a presigned URL (AWS signature query params present), and
//         a PATCH incrementing download_count was issued.
{
  calls.length = 0;
  const res = await handler(req(`?token=${VALID_TOKEN}`));
  assert(res.status === 302, `valid+unexpired token -> 302 (got ${res.status})`);
  const location = res.headers.get('Location') ?? '';
  assert(location.length > 0, 'redirect has a Location header');
  assert(location.includes('X-Amz-Signature'), `Location has an AWS presigned signature query param (got ${location})`);
  assert(location.includes('X-Amz-Algorithm'), `Location has X-Amz-Algorithm (got ${location})`);
  assert(
    location.startsWith('https://dummy-bucket.nyc3.digitaloceanspaces.com/downloads/sheet-music/some-anthem.pdf'),
    `Location points at the product's digital_object_key on the configured Spaces bucket/region (got ${location})`,
  );

  const patchCall = calls.find((c) => c.url.includes('/rest/v1/gw_store_entitlements') && c.method === 'PATCH');
  assert(!!patchCall, 'a PATCH to gw_store_entitlements was issued to record the download');
  assert(patchCall!.url.includes(`id=eq.${ENTITLEMENT_ID}`), 'the PATCH targets the matched entitlement row by id');
  const patchBody = patchCall!.body as Record<string, unknown>;
  assert(patchBody.download_count === 3, `download_count incremented from 2 to 3 (got ${patchBody.download_count})`);
  assert(typeof patchBody.last_downloaded_at === 'string', 'last_downloaded_at timestamp recorded');
  assert('last_download_ip' in patchBody, 'last_download_ip recorded (empty string when no x-forwarded-for header)');

  assert(
    res.headers.get('Cache-Control') === 'no-store',
    `redirect carries Cache-Control: no-store so intermediaries never cache/replay the live signed URL (got ${res.headers.get('Cache-Control')})`,
  );
}

// ---- (e) evidence PATCH fails (transient PostgREST error) -> delivery is
//         NOT blocked: the function must still return 302 with the signed
//         Location. The evidence write is fire-and-forget.
{
  calls.length = 0;
  failEvidencePatch = true;
  let res: Response;
  try {
    res = await handler(req(`?token=${VALID_TOKEN}`));
  } finally {
    failEvidencePatch = false;
  }
  assert(
    res.status === 302,
    `valid token still -> 302 even when the evidence PATCH rejects (got ${res.status})`,
  );
  const location = res.headers.get('Location') ?? '';
  assert(location.includes('X-Amz-Signature'), `redirect still carries a signed Location despite PATCH failure (got ${location})`);
}

// ---- (bonus, not required by the brief but cheap coverage) -------------
// product has no digital_object_key -> 404, and no PATCH is attempted.
{
  calls.length = 0;
  const res = await handler(req(`?token=${NO_FILE_TOKEN}`));
  assert(res.status === 404, `entitlement whose product has no digital_object_key -> 404 (got ${res.status})`);
  const patchCall = calls.find((c) => c.method === 'PATCH');
  assert(!patchCall, 'no download-evidence PATCH is issued when there is no file to serve');
}

globalThis.fetch = origFetch;

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed.`);
  Deno.exit(1);
}
console.log('\nstore-download logic_test passed');
// index.ts's module-level `Deno.serve(handler)` starts a live listener as a
// side effect of the import above; without an explicit exit the process
// would hang open on that listener instead of returning a pass/fail code.
Deno.exit(0);
