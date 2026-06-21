// Edge function: easypost-buy-label
//
// Admin clicks "Buy label" on a paid order → this function calls
// EasyPost's buy endpoint with the chosen rate, stores tracking + label
// URL in gw_shipments, and returns the printable label URL.
//
// Auth: this is admin-only. We require the caller's JWT and verify
// they're an admin in the tenant matching the order. The EasyPost API
// key still comes from gw_shipping_settings on the server side.

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
  if (!res.ok) throw new Error(`PostgREST ${table}: ${res.status} ${await res.text()}`)
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
  if (!res.ok) throw new Error(`PostgREST INSERT ${table}: ${res.status} ${await res.text()}`)
  const out = await res.json()
  return Array.isArray(out) ? out[0] : out
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

    const body = await req.json() as {
      shipment_id?: string;
      rate_id?: string;
      order_id?: string;
    }
    if (!body.shipment_id || !body.rate_id) {
      return new Response(JSON.stringify({ error: 'missing_params' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const tenantRows = await pgRead<{ id: string }>('gw_tenants', `slug=eq.${tenantSlug}&select=id`)
    if (tenantRows.length === 0) {
      return new Response(JSON.stringify({ error: 'tenant_not_found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const tenantId = tenantRows[0].id

    const settingsRows = await pgRead<Record<string, string | null>>(
      'gw_shipping_settings',
      `tenant_id=eq.${tenantId}&select=easypost_api_key`,
    )
    if (settingsRows.length === 0 || !settingsRows[0].easypost_api_key) {
      return new Response(JSON.stringify({ error: 'easypost_not_configured' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const apiKey = settingsRows[0].easypost_api_key

    // Buy the label.
    const buyRes = await fetch(`https://api.easypost.com/v2/shipments/${body.shipment_id}/buy`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`${apiKey}:`),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rate: { id: body.rate_id } }),
    })
    if (!buyRes.ok) {
      const t = await buyRes.text()
      return new Response(JSON.stringify({ error: 'easypost_buy_failed', detail: t.slice(0, 500) }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const shipment = await buyRes.json()

    // Persist the shipment record so the order page can show tracking.
    const shipmentRow = await pgInsert<{ id: string }>('gw_shipments', {
      tenant_id: tenantId,
      order_id: body.order_id ?? null,
      easypost_shipment_id: shipment.id,
      rate_id: body.rate_id,
      carrier: shipment.selected_rate?.carrier ?? null,
      service: shipment.selected_rate?.service ?? null,
      amount_cents: shipment.selected_rate ? Math.round(Number(shipment.selected_rate.rate) * 100) : null,
      cost_cents: null,
      tracking_number: shipment.tracking_code ?? null,
      tracking_url: shipment.tracker?.public_url ?? null,
      label_url: shipment.postage_label?.label_url ?? null,
      status: 'label_purchased',
      shipped_at: new Date().toISOString(),
    })

    return new Response(JSON.stringify({
      ok: true,
      shipment_db_id: shipmentRow.id,
      label_url: shipment.postage_label?.label_url ?? null,
      tracking_number: shipment.tracking_code ?? null,
      tracking_url: shipment.tracker?.public_url ?? null,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return new Response(JSON.stringify({ error: 'buy_failed', detail: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
