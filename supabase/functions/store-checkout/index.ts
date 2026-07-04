// Edge function: server-side pricing + Stripe Checkout hand-off for the
// GleeWorld / tenant storefronts.
//
// Task 4 of the Commerce Core plan. The client sends only
// { store_type, items:[{product_id, variant_id?, quantity}], buyer_email }
// — never a price. Everything money-related (unit price, line totals,
// which Stripe account collects, whether the 'store' add-on is enabled)
// is resolved here from the database, keyed off the caller's verified
// JWT claims. We pre-create a `gw_store_orders` (status='pending') +
// `gw_store_order_items` row set before ever talking to Stripe so the
// fulfillment webhook (a later task) has something to promote to 'paid'
// keyed on `metadata.order_id`.
//
// NOTE (test seam): the brief's reference implementation puts the whole
// body directly inside `Deno.serve(async (req) => {...})`. That is
// functionally identical to `Deno.serve(handler)` with `handler` defined
// separately — the only difference is `handler` is also `export`ed so
// `logic_test.ts` can invoke it directly with a constructed `Request`
// instead of standing up a real HTTP listener. No request-handling logic
// differs from the brief.
import { verifyJwtClaims } from '../_shared/verifyJwt.ts';
import { createCheckout, type LineItem } from '../_shared/payments/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000';
const SRK = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const PLATFORM_TENANT_ID = Deno.env.get('GW_PLATFORM_TENANT_ID') ?? '';
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
    const authHeader = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    const claims = authHeader ? await verifyJwtClaims(authHeader) : null;
    const { store_type, items, buyer_email, tenant_slug, shipping_address } = await req.json();
    if (!['gleeworld', 'tenant'].includes(store_type)) return j({ error: 'bad store_type' }, 400);
    if (!Array.isArray(items) || items.length === 0 || items.length > 20) return j({ error: 'bad cart' }, 400);
    if (!buyer_email || typeof buyer_email !== 'string' || !buyer_email.includes('@')) {
      return j({ error: 'valid buyer_email required' }, 400);
    }

    // Card-testing defense: rate-limit session creation per ip + email.
    // Trusted client IP: nginx sets X-Real-IP to $remote_addr (overwrites any
    // client value). Fall back to the LAST X-Forwarded-For hop (proxy-appended),
    // never the client-controllable first entry.
    const xff = req.headers.get('x-forwarded-for');
    const ip = (req.headers.get('x-real-ip')
      ?? (xff ? xff.split(',').map(s => s.trim()).filter(Boolean).pop() : '')
      ?? '').trim();
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const recent = await pg(
      `gw_store_checkout_attempts?or=(ip.eq.${encodeURIComponent(ip)},email.eq.${encodeURIComponent(buyer_email)})&created_at=gte.${since}&select=id`,
    );
    if (Array.isArray(recent) && recent.length >= 5) return j({ error: 'too many attempts, try again later' }, 429);
    await pg('gw_store_checkout_attempts', { method: 'POST', body: JSON.stringify({ ip, email: buyer_email }) });

    // Resolve owning tenant + account server-side.
    const SLUG_RE = /^[a-z0-9-]+$/;
    let tenantId: string | null;
    if (store_type === 'gleeworld') {
      tenantId = PLATFORM_TENANT_ID;
    } else {
      // Tenant store: prefer a verified JWT's tenant_id; a guest slug is
      // NEVER allowed to override a present JWT. Only when there is no JWT
      // do we fall back to resolving the tenant from a guest-supplied slug.
      if (claims) {
        tenantId = claims.tenant_id;
      } else {
        if (!tenant_slug || !SLUG_RE.test(String(tenant_slug))) return j({ error: 'Unauthorized' }, 401);
        const trows = await pg(`gw_tenants?slug=eq.${encodeURIComponent(tenant_slug)}&select=id`);
        tenantId = (Array.isArray(trows) && trows[0]?.id) || null;
        if (!tenantId) return j({ error: 'store not found' }, 404);
      }
    }
    if (!tenantId) return j({ error: 'no tenant' }, 400);

    // Which Stripe account collects — server-resolved. Stays null for the
    // platform ('gleeworld') store_type.
    let account: string | null = null;
    if (store_type === 'tenant') {
      // Add-on gate: require an active/trial 'store' module subscription.
      // Applies identically to guest and JWT tenant orders — re-checked
      // server-side regardless of how tenantId was resolved above.
      const subs = await pg(`gw_tenant_subscriptions?tenant_id=eq.${encodeURIComponent(tenantId)}&module_id=eq.store&select=status`);
      const ok = Array.isArray(subs) && subs.some((s: any) => ['active', 'trial'].includes(s.status));
      if (!ok) return j({ error: 'Store add-on not enabled' }, 403);

      // Resolve the Connect account BEFORE any gw_store_orders/items rows are
      // written. Doing this after order creation let an anonymous caller
      // enumerate tenant slugs and spam pending orders for any tenant with an
      // active add-on but no connected Stripe account — every such request
      // would fail at 'store not ready', but only after the row existed.
      const t = await pg(`gw_tenants?id=eq.${encodeURIComponent(tenantId)}&select=stripe_account_id`);
      account = (Array.isArray(t) && t[0]?.stripe_account_id) || null;
      if (!account) return j({ error: 'store not ready' }, 400);
    }

    // Server-side price lookup; client never sends amounts.
    const lineItems: LineItem[] = [];
    let amount = 0;
    let requiresShipping = false;
    const orderItems: any[] = [];
    for (const it of items) {
      if (!it.product_id || !Number.isInteger(it.quantity) || it.quantity < 1) return j({ error: 'bad item' }, 400);
      if (!UUID_RE.test(String(it.product_id))) return j({ error: 'bad product_id' }, 400);
      if (it.variant_id != null && !UUID_RE.test(String(it.variant_id))) return j({ error: 'bad variant_id' }, 400);
      const rows = await pg(
        `gw_products?id=eq.${encodeURIComponent(it.product_id)}&tenant_id=eq.${encodeURIComponent(tenantId)}&is_active=eq.true&select=id,name,price,sale_price,requires_shipping,manage_stock,stock_quantity`,
      );
      const p = Array.isArray(rows) && rows[0];
      if (!p) return j({ error: `product not found: ${it.product_id}` }, 400);
      const cents = Math.round(Number(p.sale_price ?? p.price) * 100);
      if (p.manage_stock && p.stock_quantity < it.quantity) return j({ error: `insufficient stock: ${p.id}` }, 409);
      lineItems.push({ name: p.name, unitPriceCents: cents, quantity: it.quantity });
      amount += cents * it.quantity;
      if (p.requires_shipping) requiresShipping = true;
      orderItems.push({
        tenant_id: tenantId,
        product_id: p.id,
        variant_id: it.variant_id ?? null,
        unit_price_cents: cents,
        quantity: it.quantity,
        is_digital: !p.requires_shipping,
      });
    }

    // Physical items require a shipping address; the client (CheckoutPage.tsx)
    // collects one whenever the cart has a requires_shipping product, but we
    // never trust that it actually arrived intact — re-validate server-side.
    // Digital-only carts ignore any shipping_address the client may have sent.
    const sa = shipping_address as Record<string, unknown> | null | undefined;
    const nonEmptyStr = (v: unknown) => typeof v === 'string' && v.trim().length > 0;
    if (requiresShipping) {
      const hasRequired = !!sa
        && nonEmptyStr(sa.name)
        && nonEmptyStr(sa.line1)
        && nonEmptyStr(sa.city)
        && nonEmptyStr(sa.state)
        && nonEmptyStr(sa.postal);
      if (!hasRequired) return j({ error: 'shipping address required for physical items' }, 400);
    }

    // Pre-create the pending order + items.
    const accessToken = crypto.getRandomValues(new Uint8Array(24)).reduce((s, b) => s + b.toString(16).padStart(2, '0'), '');
    const order = (
      await pg('gw_store_orders', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          store_type,
          buyer_email,
          buyer_user_id: claims?.sub ?? null,
          amount_cents: amount,
          requires_shipping: requiresShipping,
          status: 'pending',
          access_token: accessToken,
          ...(requiresShipping
            ? {
                ship_to_name: sa!.name,
                ship_to_line1: sa!.line1,
                ship_to_line2: (sa!.line2 as string | undefined) ?? null,
                ship_to_city: sa!.city,
                ship_to_state: sa!.state,
                ship_to_postal: sa!.postal,
                ship_to_country: (sa!.country as string | undefined) ?? null,
              }
            : {}),
        }),
      })
    )[0];
    for (const oi of orderItems) oi.order_id = order.id;
    await pg('gw_store_order_items', { method: 'POST', body: JSON.stringify(orderItems) });

    const origin = req.headers.get('origin') ?? 'https://gleeworld.org';
    // Where Stripe hands the buyer back depends on which storefront they
    // bought from:
    //  - 'tenant': the tenant's own site root (`${origin}/`) — that's where
    //    PublicSiteView.tsx renders and shows the tenant's "Payment
    //    confirmed" banner (gated on `?order=&t=` in the query string).
    //    `/shop/success` is a platform-only route that a tenant's own
    //    subdomain never serves, so a tenant buyer must NOT be sent there.
    //  - 'gleeworld': unchanged — the public storefront route is `/shop`
    //    (Shop.tsx); `/store` is a pre-existing admin route behind auth, so
    //    both success/cancel must point at `/shop`, never `/store`, or a
    //    guest checkout/cancel would 404 or hit an admin-gated page.
    const successUrl = store_type === 'tenant'
      ? `${origin}/?order=${order.id}&t=${accessToken}`
      : `${origin}/shop/success?order=${order.id}&t=${accessToken}`;
    const cancelUrl = store_type === 'tenant' ? `${origin}/` : `${origin}/shop?canceled=1`;
    const { url } = await createCheckout('stripe', {
      account,
      lineItems,
      orderId: order.id,
      storeType: store_type,
      buyerEmail: buyer_email,
      successUrl,
      cancelUrl,
    });
    return j({ url, order_id: order.id, access_token: accessToken });
  } catch (e) {
    console.error('[store-checkout]', (e as Error).message);
    return j({ error: 'checkout failed' }, 500);
  }
}

Deno.serve(handler);
