// Edge function: admin-gated, tenant-scoped read of `gw_store_orders` +
// `gw_store_order_items` for the Product Management "Orders" admin UI.
//
// Task 7 of the Commerce Core storefront plan. `gw_store_orders` carries a
// RESTRICTIVE `tenant_isolation_restrict` policy `TO authenticated` with NO
// matching permissive policy for `authenticated` (see
// 20260705000000_commerce_core_schema.sql) — only `service_role` has a
// permissive ALL policy. That means a normal admin's session JWT can never
// read this table directly via supabase-js/PostgREST, by design (it's a
// money table — see memory note "Stripe account posture" on why direct
// exposure of financial tables is avoided). This function is the sanctioned
// door: it verifies the caller's JWT itself, admin-gates on the verified
// `tenant_role` claim, then reads with the service-role key on the caller's
// behalf — always re-applying `tenant_id=eq.<the caller's own tenant_id>`
// to every query, because a service-role PostgREST call bypasses RLS
// entirely and would otherwise hand one tenant's admin every other
// tenant's orders.
//
// Auth pattern: deliberately follows the box-office-* family
// (verifyJwtClaims -> tenant_id + tenant_role claims, e.g.
// box-office-refund-order/index.ts) rather than `_shared/auth.ts`'s
// `authenticateCaller` (used by the sibling store-refund/index.ts).
// authenticateCaller's admin check is tenant-agnostic (is_admin/role only,
// no tenant_id), which is fine for store-refund (it operates on one
// already-known order_id) but wrong here: an order *list* needs a tenant
// filter applied server-side, and verifyJwtClaims is the only helper that
// hands back a signature-verified tenant_id to filter on.
//
// Two calls, both POST with a JSON body (matches store-refund/store-
// checkout's `supabase.functions.invoke` convention rather than
// GET+querystring):
//   {}                      -> list this tenant's orders, newest first
//   { order_id: "<uuid>" }  -> one order + its line items (embeds product name)
//
// NOTE (test seam): same pattern as store-refund/index.ts — the handler
// body is a named, exported `handler(req)` so `admin_orders_test.ts` can
// invoke it directly against a constructed `Request` with `globalThis.fetch`
// stubbed. `Deno.serve(handler)` at the bottom keeps this file directly
// deployable.
import { verifyJwtClaims, resolveTargetTenant } from '../_shared/verifyJwt.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000';
const SRK = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ADMIN_TENANT_ROLES = ['owner', 'admin', 'super-admin', 'super_admin'];

const ORDER_SELECT =
  'id,status,store_type,buyer_email,amount_cents,currency,requires_shipping,' +
  'ship_to_name,ship_to_line1,ship_to_line2,ship_to_city,ship_to_state,ship_to_postal,ship_to_country,' +
  'provider_payment_intent_id,created_at,updated_at';

async function pg(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SRK,
      Authorization: `Bearer ${SRK}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`pg ${path} ${res.status}`);
  return res.status === 204 ? null : res.json();
}

const j = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const accessToken = authHeader.replace(/^Bearer\s+/i, '');
    if (!accessToken) return j({ error: 'Unauthorized' }, 401);

    let payload: Record<string, any> | null = null;
    try {
      payload = (await verifyJwtClaims(accessToken)) ?? null;
    } catch {
      return j({ error: 'Unauthorized' }, 401);
    }
    if (!payload?.sub) return j({ error: 'Unauthorized' }, 401);

    const { order_id, tenant_slug } = await req.json().catch(() => ({}));
    // Target tenant from the page's slug, not the JWT's home-tenant claim
    // (see resolveTargetTenant).
    const { tenantId, tenantRole } = await resolveTargetTenant(
      payload, tenant_slug ?? req.headers.get('x-tenant-slug'));
    if (!tenantId) return j({ error: 'Unknown tenant' }, 401);
    if (!ADMIN_TENANT_ROLES.includes(tenantRole)) {
      return j({ error: 'Admin role required' }, 403);
    }

    if (order_id !== undefined) {
      if (typeof order_id !== 'string' || !UUID_RE.test(order_id)) {
        return j({ error: 'order_id must be a UUID' }, 400);
      }
      const orderRows = await pg(
        `gw_store_orders?id=eq.${encodeURIComponent(order_id)}&tenant_id=eq.${encodeURIComponent(tenantId)}&select=${ORDER_SELECT}`,
      );
      const order = Array.isArray(orderRows) && orderRows[0];
      if (!order) return j({ error: 'order not found' }, 404);

      // order_id already proven to belong to this tenant above, so the
      // items lookup doesn't need its own tenant_id filter to stay safe —
      // but items also carry tenant_id (see 20260705000000_commerce_core_
      // schema.sql), so it's included anyway as defense in depth.
      const items = await pg(
        `gw_store_order_items?order_id=eq.${encodeURIComponent(order_id)}&tenant_id=eq.${encodeURIComponent(tenantId)}` +
          `&select=id,product_id,variant_id,unit_price_cents,quantity,is_digital,gw_products(name)`,
      );
      return j({ order, items: items ?? [] });
    }

    const orders = await pg(
      `gw_store_orders?tenant_id=eq.${encodeURIComponent(tenantId)}&select=${ORDER_SELECT}&order=created_at.desc&limit=200`,
    );
    return j({ orders: orders ?? [] });
  } catch (e) {
    console.error('[store-admin-orders]', (e as Error).message);
    return j({ error: 'orders lookup failed' }, 500);
  }
}

Deno.serve(handler);
