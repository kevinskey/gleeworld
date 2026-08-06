// Edge function: RSVP + ticket + souvenir checkout for a box-office event.
//
// This is box-office-checkout's sibling, with two differences:
//
//   1. It can add souvenir merchandise (gw_event_merch_items) to the same
//      order, so "3 of us are coming, and I'd like two shirts and a hoodie"
//      is ONE payment and ONE order row rather than a ticket purchase plus a
//      separate trip through the store.
//   2. It can charge on the PLATFORM Stripe account for a tenant that is
//      explicitly flagged gw_tenants.uses_platform_stripe — the platform
//      operator's own tenant, whose "Connect account" would be the platform
//      account itself (which Stripe will not let you do).
//
// Commerce rules this obeys, deliberately:
//   Rule 1 — every price is read from the DB by id. The client sends ids and
//            quantities only; a tampered body cannot change what is charged.
//   Rule 2 — this function ONLY creates a `pending` order. Nothing here marks
//            anything paid. Fulfillment happens in the signature-verified
//            webhook, which calls gw_box_office_fulfill_order.
//   Rule 4 — the collecting account is resolved here from tenant state, never
//            from the request.
//   Rule 5 — Stripe is reached through _shared/payments, not directly.
//   Rule 7 — session creation is rate-limited (card-testing defense).

import { createCheckout, type LineItem } from '../_shared/payments/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-slug',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000';
const SRK = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_RE = /^[a-z0-9-]+$/;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const MAX_TICKETS = 20;
const MAX_MERCH_QTY = 20;
const MAX_MERCH_LINES = 10;

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

/** Unguessable order-lookup token. 32 bytes ≈ 256 bits. */
function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

interface Tenant {
  id: string;
  slug: string;
  stripe_account_id: string | null;
  stripe_charges_enabled: boolean;
  uses_platform_stripe: boolean;
}
interface EventRow {
  id: string; title: string; box_office_status: string | null; box_office_slug: string | null;
}
interface Tier {
  id: string; name: string; price_cents: number; currency: string;
  quantity_total: number; quantity_sold: number;
}
interface MerchColor { name: string }
interface MerchItem {
  id: string; name: string; price_cents: number; currency: string;
  sizes: string[]; colors: MerchColor[]; is_active: boolean;
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return j({ error: 'method not allowed' }, 405);

  try {
    const body = await req.json().catch(() => ({}));

    const tenantSlug = String(body.tenant_slug || req.headers.get('x-tenant-slug') || '').trim().toLowerCase();
    const eventSlug = String(body.event_slug || '').trim();
    const buyerEmail = String(body.buyer_email || '').trim().toLowerCase();
    const buyerName = String(body.buyer_name || '').trim();
    const buyerPhone = String(body.buyer_phone || '').trim();
    const notes = String(body.notes || '').trim().slice(0, 1000);
    const quantity = Number(body.quantity ?? 0);

    if (!tenantSlug || !SLUG_RE.test(tenantSlug)) return j({ error: 'tenant context missing' }, 400);
    if (!eventSlug || !SLUG_RE.test(eventSlug)) return j({ error: 'event_slug required' }, 400);
    if (!EMAIL_RE.test(buyerEmail)) return j({ error: 'A valid email address is required' }, 400);
    if (!buyerName) return j({ error: 'Your name is required' }, 400);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_TICKETS) {
      return j({ error: `Number attending must be between 1 and ${MAX_TICKETS}` }, 400);
    }

    // Card-testing defense, same shape and shared table as store-checkout.
    // Trusted client IP: nginx sets X-Real-IP; otherwise take the LAST
    // X-Forwarded-For hop (proxy-appended), never the client-controlled first.
    const xff = req.headers.get('x-forwarded-for');
    const ip = (req.headers.get('x-real-ip')
      ?? (xff ? xff.split(',').map((s) => s.trim()).filter(Boolean).pop() : '')
      ?? '').trim();
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const recent = await pg(
      `gw_store_checkout_attempts?or=(ip.eq.${encodeURIComponent(ip)},email.eq.${encodeURIComponent(buyerEmail)})&created_at=gte.${since}&select=id`,
    );
    if (Array.isArray(recent) && recent.length >= 5) {
      return j({ error: 'Too many attempts. Please try again in a few minutes.' }, 429);
    }
    await pg('gw_store_checkout_attempts', { method: 'POST', body: JSON.stringify({ ip, email: buyerEmail }) });

    // ── Resolve tenant / event / tier ───────────────────────────────────────
    const tenants: Tenant[] = await pg(
      `gw_tenants?slug=eq.${encodeURIComponent(tenantSlug)}&select=id,slug,stripe_account_id,stripe_charges_enabled,uses_platform_stripe`,
    );
    const tenant = tenants[0];
    if (!tenant) return j({ error: 'Tenant not found' }, 404);

    const events: EventRow[] = await pg(
      `gw_events?tenant_id=eq.${tenant.id}&box_office_slug=eq.${encodeURIComponent(eventSlug)}&select=id,title,box_office_status,box_office_slug`,
    );
    const event = events[0];
    if (!event) return j({ error: 'Event not found' }, 404);
    if (event.box_office_status !== 'published') {
      return j({ error: 'Tickets are not currently on sale for this event' }, 409);
    }

    // tier_id is optional — an event with a single tier (the common case for a
    // one-off concert) shouldn't force the form to make the buyer choose.
    const tiers: Tier[] = await pg(
      `gw_ticket_tiers?event_id=eq.${event.id}&select=id,name,price_cents,currency,quantity_total,quantity_sold&order=sort_order.asc,price_cents.asc`,
    );
    if (tiers.length === 0) return j({ error: 'No ticket types are configured for this event' }, 409);

    let tier: Tier | undefined;
    if (body.tier_id) {
      if (!UUID_RE.test(String(body.tier_id))) return j({ error: 'bad tier_id' }, 400);
      tier = tiers.find((t) => t.id === String(body.tier_id));
      if (!tier) return j({ error: 'Ticket type not found for this event' }, 404);
    } else {
      tier = tiers[0];
    }

    const remaining = tier.quantity_total - tier.quantity_sold;
    if (remaining < quantity) {
      return j({ error: `Only ${Math.max(0, remaining)} seat(s) left.` }, 409);
    }

    // ── Resolve merch, priced from the DB ───────────────────────────────────
    const rawMerch = Array.isArray(body.merch) ? body.merch : [];
    if (rawMerch.length > MAX_MERCH_LINES) return j({ error: 'Too many souvenir lines' }, 400);

    const merchSnapshot: Array<Record<string, unknown>> = [];
    const merchLines: LineItem[] = [];
    let merchCents = 0;

    if (rawMerch.length > 0) {
      const ids = rawMerch.map((m: { item_id?: unknown }) => String(m?.item_id ?? ''));
      if (ids.some((id) => !UUID_RE.test(id))) return j({ error: 'bad merch item id' }, 400);

      const catalog: MerchItem[] = await pg(
        `gw_event_merch_items?event_id=eq.${event.id}&is_active=is.true&id=in.(${ids.join(',')})&select=id,name,price_cents,currency,sizes,colors,is_active`,
      );

      for (const line of rawMerch) {
        const item = catalog.find((c) => c.id === String(line.item_id));
        // An id that isn't in this event's active catalog is a tampered or
        // stale body — refuse rather than silently dropping a paid-for item.
        if (!item) return j({ error: 'Souvenir not available for this event' }, 404);

        const qty = Number(line.quantity ?? 0);
        if (!Number.isInteger(qty) || qty < 1 || qty > MAX_MERCH_QTY) {
          return j({ error: `Souvenir quantity must be between 1 and ${MAX_MERCH_QTY}` }, 400);
        }

        // Size and color must be ones this garment actually offers. The list
        // comes from the TSB blank it's printed on, so an arbitrary string
        // here would put an unfulfillable variant on the pick list.
        const sizes = Array.isArray(item.sizes) ? item.sizes : [];
        const size = line.size == null ? '' : String(line.size);
        if (sizes.length > 0 && !sizes.includes(size)) {
          return j({ error: `Choose a size for the ${item.name}` }, 400);
        }

        const colors = Array.isArray(item.colors) ? item.colors : [];
        const color = line.color == null ? '' : String(line.color);
        if (colors.length > 0 && !colors.some((c) => c?.name === color)) {
          return j({ error: `Choose a color for the ${item.name}` }, 400);
        }

        const variant = [size, color].filter(Boolean).join(', ');
        merchCents += item.price_cents * qty;
        merchSnapshot.push({
          item_id: item.id,
          name: item.name,
          size: size || null,
          color: color || null,
          quantity: qty,
          unit_price_cents: item.price_cents,
        });
        merchLines.push({
          name: variant ? `${item.name} (${variant})` : item.name,
          unitPriceCents: item.price_cents,
          quantity: qty,
        });
      }
    }

    const ticketCents = tier.price_cents * quantity;
    const amountCents = ticketCents + merchCents;

    // ── Resolve the collecting account (Rule 4) ─────────────────────────────
    // Connect account wins when present. The platform account is used ONLY
    // for a tenant explicitly flagged for it; there is no silent fallback,
    // because a fallback would let any unconfigured tenant collect money into
    // the platform's account.
    let account: string | null;
    let applicationFeeCents = 0;
    if (tenant.stripe_account_id && tenant.stripe_charges_enabled) {
      account = tenant.stripe_account_id;
      applicationFeeCents = amountCents > 0 ? Math.max(1, Math.round(amountCents * 0.01)) : 0;
    } else if (tenant.uses_platform_stripe) {
      account = null; // platform account; no fee — it is already our own money
    } else {
      return j({ error: 'This event is not yet set up to accept payments' }, 409);
    }

    // ── Pre-create the pending order (Rule 2) ───────────────────────────────
    const accessToken = randomToken();
    const inserted = await pg('gw_ticket_orders', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: tenant.id,
        event_id: event.id,
        tier_id: tier.id,
        quantity,
        buyer_email: buyerEmail,
        buyer_name: buyerName,
        buyer_phone: buyerPhone || null,
        notes: notes || null,
        amount_cents: amountCents,
        merch_items: merchSnapshot,
        merch_amount_cents: merchCents,
        currency: tier.currency,
        status: 'pending',
        access_token: accessToken,
      }),
    });
    const order = Array.isArray(inserted) ? inserted[0] : inserted;

    const returnBase = `https://${tenant.slug}.gleeworld.org`;
    const lineItems: LineItem[] = [
      {
        name: `${event.title} — ${tier.name}`,
        unitPriceCents: tier.price_cents,
        quantity,
      },
      ...merchLines,
    ];

    try {
      const { url } = await createCheckout('stripe', {
        account,
        lineItems,
        orderId: order.id,
        // Routes this session to the ticket branch of the platform webhook.
        // Must stay in sync with the handler in the port-3030 webhook server.
        storeType: 'box-office',
        buyerEmail,
        applicationFeeCents,
        successUrl: `${returnBase}/tickets/${accessToken}?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${returnBase}/?rsvp=cancelled`,
        metadata: { event_id: event.id, tier_id: tier.id, tenant_id: tenant.id, quantity: String(quantity) },
      });

      return j({ url, order_id: order.id, access_token: accessToken });
    } catch (e) {
      // Don't leave the order sitting at 'pending' forever if Stripe refused —
      // the buyer would see a permanently unresolved order page.
      await pg(`gw_ticket_orders?id=eq.${order.id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'failed' }),
      }).catch(() => {});
      console.error('concert-rsvp-checkout: stripe error', e);
      return j({ error: 'Payment could not be started. Please try again.' }, 502);
    }
  } catch (e) {
    console.error('concert-rsvp-checkout', e);
    return j({ error: (e as Error).message }, 500);
  }
}

Deno.serve(handler);
