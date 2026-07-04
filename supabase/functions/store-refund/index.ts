// Edge function: admin-gated refund for a `gw_store_orders` row.
//
// Task 4 of the Commerce Core storefront plan. This is a REFUND, not a
// checkout — it intentionally does NOT route through `_shared/payments`
// (that seam is checkout-only: it builds Checkout Sessions per provider).
// Refunds are a single, provider-specific Stripe call, so it's issued
// directly here against `POST /v1/refunds`.
//
// Flow: authenticate + admin-gate the caller -> look up the order's
// `provider_payment_intent_id`/`status` via pg() -> issue the Stripe
// refund -> flip the order to 'refunded' (and restock, etc.) via the
// Core-owned `gw_store_refund_order` DB function, called over the
// PostgREST RPC path with the service-role key (that function is
// GRANT EXECUTE'd to service_role only — see
// 20260705000100_commerce_core_fulfill.sql — so it is deliberately not
// callable directly by a tenant's anon/authenticated role).
//
// Idempotency: `gw_store_refund_order` already no-ops (returns
// `{already_refunded:true}`) on a second call, so the DB side is safe to
// call twice. For the Stripe side, a second `store-refund` call on an
// order already in our DB as 'refunded' skips the Stripe API call
// entirely rather than relying on Stripe's Idempotency-Key replay: we
// already have local proof the refund happened, so there's nothing to
// gain by re-hitting the network, and it avoids any ambiguity if the
// original Idempotency-Key window (Stripe replays a cached response for
// ~24h) has expired. The Idempotency-Key is still set on every Stripe
// call we DO make, so a retried request that races with itself (e.g. a
// double-click before our own DB is updated) is deduplicated by Stripe.
//
// NOTE (test seam): same pattern as store-checkout/index.ts and
// store-order-status/index.ts — the handler body is a named, exported
// `handler(req)` so `refund_test.ts` can invoke it directly against a
// constructed `Request` with `globalThis.fetch` stubbed, instead of
// standing up a real HTTP listener or hitting real PostgREST/Stripe.
// `Deno.serve(handler)` at the bottom keeps this file directly
// deployable.
import { authenticateCaller, unauthorizedResponse } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000';
const SRK = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function pg(path: string, init?: RequestInit) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SRK,
      Authorization: `Bearer ${SRK}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`pg ${path} ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

const j = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    // Admin-only: this issues live Stripe refunds and mutates order state.
    const caller = await authenticateCaller(req);
    if (!caller) return unauthorizedResponse(corsHeaders, 401);
    if (!caller.internal && !caller.isAdmin) return unauthorizedResponse(corsHeaders, 403);

    const { order_id } = await req.json().catch(() => ({}));
    if (typeof order_id !== 'string' || !UUID_RE.test(order_id)) {
      return j({ error: 'order_id must be a UUID' }, 400);
    }

    const rows = await pg(
      `gw_store_orders?id=eq.${encodeURIComponent(order_id)}&select=provider_payment_intent_id,status`,
    );
    const order = Array.isArray(rows) && rows[0];
    if (!order) return j({ error: 'order not found' }, 404);

    // Idempotency (DB-side is authoritative): if our own record already
    // shows this order refunded, skip the Stripe call — see the
    // module-level comment for why. The RPC is still called either way
    // so the response shape is identical on a fresh refund and a repeat
    // call (the RPC itself short-circuits to {already_refunded:true}).
    const alreadyRefunded = order.status === 'refunded';

    if (!alreadyRefunded) {
      const pi = order.provider_payment_intent_id;
      if (!pi) return j({ error: 'order has no payment intent on file' }, 409);

      const params = new URLSearchParams();
      params.set('payment_intent', pi);

      const stripeRes = await fetch('https://api.stripe.com/v1/refunds', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Idempotency-Key': `refund-${order_id}`,
        },
        body: params.toString(),
      });
      if (!stripeRes.ok) {
        // Never log the Stripe secret key or the raw response body (may
        // echo back request params); just the status.
        console.error('[store-refund] stripe refund failed', stripeRes.status);
        return j({ error: 'stripe refund failed' }, 502);
      }
    }

    const rpcResult = await pg('rpc/gw_store_refund_order', {
      method: 'POST',
      body: JSON.stringify({ p_order_id: order_id }),
    });
    if (rpcResult && typeof rpcResult === 'object' && 'error' in rpcResult && rpcResult.error) {
      console.error('[store-refund] gw_store_refund_order failed', rpcResult.error);
      return j({ error: 'refund could not be recorded' }, 500);
    }

    return j({ ok: true });
  } catch (e) {
    console.error('[store-refund]', (e as Error).message);
    return j({ error: 'refund failed' }, 500);
  }
}

Deno.serve(handler);
