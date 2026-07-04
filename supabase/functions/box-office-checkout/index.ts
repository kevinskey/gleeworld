// Edge function: create a Stripe Checkout Session for a public ticket buy.
//
// Phase D of the Box Office spec.
//
// The session is created ON the tenant's Connected account (Stripe-Account
// header), as a direct charge with a 1% application fee (see the pricing
// page's "+1% of ticket sales" line) collected via
// payment_intent_data[application_fee_amount] — GleeWorld never custodies
// ticket money; Stripe splits the fee off at settlement. We also pre-create
// a row in gw_ticket_orders
// (status='pending') and stash the Stripe session id + our order id in
// metadata so the fulfillment webhook (Phase E) can mint tickets
// idempotently keyed on the session id.
//
// Concurrency: we only check availability here ("can we even offer this
// quantity right now?"). The authoritative oversell guard is in the
// fulfillment SQL transaction (Phase E). Checking here keeps the user
// out of Stripe Checkout when the tier is obviously sold out.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-slug',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000'
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

async function pgRead<T>(table: string, query: string): Promise<T[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) throw new Error(`PostgREST GET ${table} failed: ${res.status} ${await res.text()}`)
  return res.json()
}

async function pgInsert<T>(table: string, row: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(row),
  })
  if (!res.ok) throw new Error(`PostgREST POST ${table} failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return Array.isArray(data) ? data[0] : data
}

async function pgUpdate(table: string, query: string, patch: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(`PostgREST PATCH ${table} failed: ${res.status} ${await res.text()}`)
}

// Random, URL-safe, unguessable. 32 bytes ≈ 256 bits of entropy. Used as
// the access_token the buyer can use to revisit their own order page.
function randomToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  let s = ''
  for (const b of bytes) s += b.toString(16).padStart(2, '0')
  return s
}

interface Tenant {
  id: string
  slug: string
  name: string | null
  stripe_account_id: string | null
  stripe_charges_enabled: boolean
}

interface BoxOfficeEvent {
  id: string
  tenant_id: string
  title: string
  box_office_status: string | null
  box_office_slug: string | null
}

interface Tier {
  id: string
  event_id: string
  name: string
  price_cents: number
  currency: string
  quantity_total: number
  quantity_sold: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY missing')

    const body = await req.json().catch(() => ({}))
    const tenantSlug = String(body.tenant_slug || req.headers.get('x-tenant-slug') || '').trim().toLowerCase()
    const eventSlug = String(body.event_slug || '').trim()
    const tierId = String(body.tier_id || '').trim()
    const quantity = Math.max(1, Math.min(20, Number(body.quantity ?? 0)))
    const buyerEmail = String(body.buyer_email || '').trim().toLowerCase()
    const buyerName = String(body.buyer_name || '').trim()

    if (!tenantSlug) return bad('tenant context missing')
    if (!eventSlug)  return bad('event_slug required')
    if (!tierId)     return bad('tier_id required')
    if (!quantity || quantity < 1) return bad('quantity must be >= 1')
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(buyerEmail)) return bad('valid email required')

    // Resolve the tenant — this is the single source of truth for the
    // connected account id and whether the tenant can sell at all.
    const tenants = await pgRead<Tenant>(
      'gw_tenants',
      `slug=eq.${encodeURIComponent(tenantSlug)}&select=id,slug,name,stripe_account_id,stripe_charges_enabled`,
    )
    const tenant = tenants[0]
    if (!tenant) return bad('Tenant not found', 404)
    if (!tenant.stripe_account_id || !tenant.stripe_charges_enabled) {
      return bad('This tenant is not yet set up to sell tickets', 409)
    }

    // Resolve the event — must be published and belong to this tenant.
    const events = await pgRead<BoxOfficeEvent>(
      'gw_events',
      `tenant_id=eq.${tenant.id}&box_office_slug=eq.${encodeURIComponent(eventSlug)}&select=id,tenant_id,title,box_office_status,box_office_slug`,
    )
    const event = events[0]
    if (!event) return bad('Event not found', 404)
    if (event.box_office_status !== 'published') {
      return bad('Tickets are not currently on sale for this event', 409)
    }

    // Resolve the tier — must belong to the resolved event so we can't be
    // tricked into selling a tier from a different (cheaper) event.
    const tiers = await pgRead<Tier>(
      'gw_ticket_tiers',
      `id=eq.${encodeURIComponent(tierId)}&event_id=eq.${event.id}&select=id,event_id,name,price_cents,currency,quantity_total,quantity_sold`,
    )
    const tier = tiers[0]
    if (!tier) return bad('Ticket tier not found', 404)
    const remaining = tier.quantity_total - tier.quantity_sold
    if (remaining < quantity) {
      return bad(`Only ${Math.max(0, remaining)} ticket(s) left in this tier`, 409)
    }

    const accessToken = randomToken()
    const amountCents = tier.price_cents * quantity

    // Pre-create the order. status='pending'; the fulfillment webhook
    // promotes it to 'paid' and mints tickets. We DON'T have the Stripe
    // session id yet, so leave it null and patch it in after creation —
    // the order's UUID + access_token are what we hand to Stripe in
    // metadata for the webhook to look up.
    const order = await pgInsert<{ id: string }>('gw_ticket_orders', {
      tenant_id: tenant.id,
      event_id: event.id,
      tier_id: tier.id,
      quantity,
      buyer_email: buyerEmail,
      buyer_name: buyerName || null,
      amount_cents: amountCents,
      currency: tier.currency,
      status: 'pending',
      access_token: accessToken,
    })

    // Build the Checkout Session params. price_data carries everything
    // we need — name, currency, amount — so we don't need to create
    // Stripe Products on the connected account.
    const params = new URLSearchParams()
    params.set('mode', 'payment')
    params.set('line_items[0][price_data][currency]', tier.currency)
    params.set('line_items[0][price_data][unit_amount]', String(tier.price_cents))
    params.set('line_items[0][price_data][product_data][name]', `${event.title} — ${tier.name}`)
    params.set('line_items[0][quantity]', String(quantity))
    params.set('customer_email', buyerEmail)
    params.set('metadata[order_id]', order.id)
    params.set('metadata[tier_id]', tier.id)
    params.set('metadata[event_id]', event.id)
    params.set('metadata[tenant_id]', tenant.id)
    params.set('metadata[quantity]', String(quantity))
    params.set('payment_intent_data[metadata][order_id]', order.id)
    params.set('payment_intent_data[metadata][tenant_id]', tenant.id)

    // GleeWorld's 1% application fee (advertised on the pricing page as
    // "+1% of ticket sales"), computed off the same server-resolved
    // amountCents used above for line_items — never client input. Skip the
    // field entirely for free/comp tickets: Stripe rejects a fee amount on
    // a zero-value PaymentIntent.
    if (amountCents > 0) {
      const feeCents = Math.max(1, Math.round(amountCents * 0.01))
      params.set('payment_intent_data[application_fee_amount]', String(feeCents))
    }

    // Return URLs are on the tenant subdomain.
    const returnBase = `https://${tenant.slug}.gleeworld.org`
    params.set('success_url', `${returnBase}/tickets/${accessToken}?session_id={CHECKOUT_SESSION_ID}`)
    params.set('cancel_url', `${returnBase}/concert-tickets/${event.box_office_slug ?? ''}?cancelled=1`)

    // Direct charge on the connected account, with the 1% application fee
    // (if any) set above via payment_intent_data[application_fee_amount].
    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Account': tenant.stripe_account_id,
      },
      body: params.toString(),
    })
    const session = await stripeRes.json()
    if (!stripeRes.ok) {
      console.error('Stripe checkout error', session)
      // Mark the order failed so we don't show "pending" forever if the
      // buyer revisits its access_token.
      await pgUpdate('gw_ticket_orders', `id=eq.${order.id}`, { status: 'failed' }).catch(() => {})
      return bad(session.error?.message ?? 'Stripe error', 502)
    }

    // Persist the session id so the webhook can look up the order even
    // if the metadata round-trip is lost for any reason.
    await pgUpdate('gw_ticket_orders', `id=eq.${order.id}`, {
      stripe_checkout_session_id: session.id,
    })

    return new Response(JSON.stringify({
      url: session.url,
      order_id: order.id,
      access_token: accessToken,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error(e)
    return bad((e as Error).message, 500)
  }
})

function bad(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
