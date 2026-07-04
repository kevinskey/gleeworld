// Edge function: token-gated, read-only order-status lookup for the guest
// post-checkout success page. Task 3 of the Commerce Core plan.
//
// This is the anti-IDOR gate for that page: an order id alone is a
// guessable/sequential-ish value, so the response is only ever produced
// when the caller-supplied `t` query param EXACTLY matches the order's
// opaque `access_token` (minted by store-checkout and handed back in the
// success-page redirect URL). The PostgREST lookup filters BOTH
// `id=eq.<order>` AND `access_token=eq.<t>` server-side in the same
// query, so a wrong/missing token can never surface a row — Postgres
// itself enforces the AND, this handler never fetches-then-compares in
// JS. Unknown order id or wrong/missing token all collapse to the same
// 403 with zero order data, so a guesser can't distinguish "wrong token"
// from "order doesn't exist".
//
// The response NEVER carries buyer PII (no buyer_email, no
// buyer_user_id) — only `{status, entitlements}`, and entitlements are
// included only once the order is 'paid' (each just `{product_id,
// download_token}`, enough for the success page to link to
// store-download).
//
// NOTE (test seam): same pattern as store-checkout/index.ts and
// store-download/index.ts — the handler body is a named, exported
// `handler(req)` so `status_test.ts` can invoke it directly against a
// constructed `Request` with `globalThis.fetch` stubbed, instead of
// standing up a real HTTP listener or hitting real PostgREST.
// `Deno.serve(handler)` at the bottom keeps this file directly
// deployable.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000';
const SRK = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

async function pg(path: string, init?: RequestInit) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SRK,
      Authorization: `Bearer ${SRK}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`pg ${path} ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function handler(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const order = url.searchParams.get('order');
    const t = url.searchParams.get('t');
    if (!order || !t) return json({ error: 'forbidden' }, 403);

    // Server-side AND-filter: only a row whose id AND access_token both
    // match is ever returned. This is the whole security property of
    // this endpoint — do not split this into two queries or fetch-then-
    // compare-in-JS, either of which would reintroduce the IDOR this
    // gate exists to close.
    const rows = await pg(
      `gw_store_orders?id=eq.${encodeURIComponent(order)}&access_token=eq.${encodeURIComponent(t)}&select=status`,
    );
    const o = Array.isArray(rows) && rows[0];
    if (!o) return json({ error: 'forbidden' }, 403);

    let ents: unknown[] = [];
    if (o.status === 'paid') {
      ents = (await pg(
        `gw_store_entitlements?order_id=eq.${encodeURIComponent(order)}&select=product_id,download_token`,
      )) ?? [];
    }
    return json({ status: o.status, entitlements: ents });
  } catch (e) {
    console.error('[store-order-status]', (e as Error).message);
    return json({ error: 'lookup failed' }, 500);
  }
}

Deno.serve(handler);
