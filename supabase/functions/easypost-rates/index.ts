// Edge function: easypost-rates
//
// Given a buyer destination address + cart items, returns shipping rate
// options. Uses the tenant's per-row EasyPost API key in
// gw_shipping_settings — the key is NEVER exposed to the browser.
//
// Package dim aggregation is intentionally simple: stack items in one
// virtual box (sum heights, max length+width). Good enough for typical
// 1–3 item music-program merch carts. Multi-package splitting can be a
// later refinement.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-slug',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000'
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

interface CartLine { product_id: string; variant_id?: string | null; quantity: number }
interface BuyerAddress {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
  phone?: string;
  email?: string;
}

async function pgRead<T>(table: string, query: string): Promise<T[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) throw new Error(`PostgREST ${table}: ${res.status} ${await res.text()}`)
  return res.json()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  try {
    const tenantSlug = req.headers.get('x-tenant-slug') || ''
    if (!tenantSlug) {
      return new Response(JSON.stringify({ error: 'missing_tenant_slug' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = await req.json() as { items?: CartLine[]; to?: BuyerAddress }
    const items = body.items ?? []
    const to = body.to
    if (items.length === 0) {
      return new Response(JSON.stringify({ error: 'empty_cart' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (!to || !to.name || !to.street1 || !to.city || !to.state || !to.zip) {
      return new Response(JSON.stringify({ error: 'invalid_destination' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const tenantRows = await pgRead<{ id: string }>('gw_tenants', `slug=eq.${tenantSlug}&select=id`)
    if (tenantRows.length === 0) {
      return new Response(JSON.stringify({ error: 'tenant_not_found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const tenantId = tenantRows[0].id

    const settingsRows = await pgRead<Record<string, string | null>>(
      'gw_shipping_settings',
      `tenant_id=eq.${tenantId}&select=*`,
    )
    if (settingsRows.length === 0 || !settingsRows[0].easypost_api_key) {
      return new Response(JSON.stringify({ error: 'easypost_not_configured', message: 'Store admin: configure EasyPost in Store → EasyPost.' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const s = settingsRows[0]

    const productIds = Array.from(new Set(items.map(i => i.product_id)))
    const products = await pgRead<{
      id: string;
      weight_oz: number | null; length_in: number | null; width_in: number | null; height_in: number | null;
    }>('gw_products', `id=in.(${productIds.join(',')})&tenant_id=eq.${tenantId}&select=id,weight_oz,length_in,width_in,height_in`)
    const byId = new Map(products.map(p => [p.id, p]))

    let totalWeightOz = 0
    let maxLength = 0
    let maxWidth = 0
    let stackedHeight = 0
    for (const line of items) {
      const p = byId.get(line.product_id)
      if (!p) continue
      const wt = Number(p.weight_oz ?? 0)
      const len = Number(p.length_in ?? 0)
      const wid = Number(p.width_in ?? 0)
      const hi = Number(p.height_in ?? 0)
      totalWeightOz += wt * line.quantity
      if (len > maxLength) maxLength = len
      if (wid > maxWidth) maxWidth = wid
      stackedHeight += hi * line.quantity
    }
    // Sensible defaults if no dims set — EasyPost rejects 0-weight requests.
    if (totalWeightOz <= 0) totalWeightOz = 8
    if (maxLength <= 0) maxLength = 10
    if (maxWidth <= 0) maxWidth = 8
    if (stackedHeight <= 0) stackedHeight = 4

    const easypost = await fetch('https://api.easypost.com/v2/shipments', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`${s.easypost_api_key}:`),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        shipment: {
          to_address: {
            name: to.name,
            street1: to.street1,
            street2: to.street2 ?? null,
            city: to.city,
            state: to.state,
            zip: to.zip,
            country: to.country ?? 'US',
            phone: to.phone ?? null,
            email: to.email ?? null,
          },
          from_address: {
            name: s.from_name ?? '',
            company: s.from_company ?? '',
            street1: s.from_street1 ?? '',
            street2: s.from_street2 ?? '',
            city: s.from_city ?? '',
            state: s.from_state ?? '',
            zip: s.from_zip ?? '',
            country: s.from_country ?? 'US',
            phone: s.from_phone ?? '',
            email: s.from_email ?? '',
          },
          parcel: {
            length: maxLength,
            width: maxWidth,
            height: stackedHeight,
            weight: totalWeightOz,
          },
        },
      }),
    })

    if (!easypost.ok) {
      const errText = await easypost.text()
      return new Response(JSON.stringify({ error: 'easypost_error', detail: errText.slice(0, 500) }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const shipment = await easypost.json()

    const rates = (shipment.rates ?? []).map((r: any) => ({
      id: r.id,
      carrier: r.carrier,
      service: r.service,
      rate_cents: Math.round(Number(r.rate) * 100),
      currency: r.currency || 'USD',
      delivery_days: r.delivery_days,
      delivery_date: r.delivery_date,
      delivery_date_guaranteed: r.delivery_date_guaranteed,
    }))

    return new Response(JSON.stringify({
      shipment_id: shipment.id,
      rates,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return new Response(JSON.stringify({ error: 'rates_failed', detail: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
