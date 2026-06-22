// Edge function: return an order + its tickets given the buyer's
// access_token. Token-gated read for the public /tickets/<token> page.
//
// We don't open up gw_ticket_orders + gw_tickets to anon SELECT through
// RLS because that would leak every buyer's email + token to anyone
// who knows the supabase URL. Instead we expose this single read path
// keyed on the access_token (32 bytes of crypto-random hex, ~256 bits
// of entropy) which acts like a bearer credential.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    // Accept the access_token via POST body (preferred — doesn't end up in
    // server logs / referers) or as a query param.
    let token = ''
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      token = String(body.access_token || '').trim()
    } else {
      const url = new URL(req.url)
      token = url.searchParams.get('access_token') ?? ''
    }
    if (!token) {
      return new Response(JSON.stringify({ error: 'access_token required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const orders = await pgRead<{
      id: string;
      event_id: string;
      buyer_email: string;
      buyer_name: string | null;
      amount_cents: number;
      currency: string;
      status: string;
      quantity: number;
      created_at: string;
    }>('gw_ticket_orders',
      `access_token=eq.${encodeURIComponent(token)}&select=id,event_id,buyer_email,buyer_name,amount_cents,currency,status,quantity,created_at`,
    )
    const order = orders[0]
    if (!order) {
      return new Response(JSON.stringify({ error: 'not_found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch tickets only if the order is paid/comp — pending/failed/refunded
    // shouldn't surface tokens.
    let tickets: Array<{ id: string; token: string; status: string; tier_name: string }> = []
    if (order.status === 'paid' || order.status === 'comp') {
      const rows = await pgRead<{ id: string; token: string; status: string; tier_id: string }>(
        'gw_tickets',
        `order_id=eq.${order.id}&select=id,token,status,tier_id&order=created_at.asc`,
      )
      const tierIds = [...new Set(rows.map(r => r.tier_id))]
      const tierMap = new Map<string, string>()
      if (tierIds.length) {
        const tiers = await pgRead<{ id: string; name: string }>(
          'gw_ticket_tiers',
          `id=in.(${tierIds.join(',')})&select=id,name`,
        )
        for (const t of tiers) tierMap.set(t.id, t.name)
      }
      tickets = rows.map(r => ({
        id: r.id,
        token: r.token,
        status: r.status,
        tier_name: tierMap.get(r.tier_id) ?? '',
      }))
    }

    const events = await pgRead<{
      id: string;
      title: string;
      start_date: string;
      venue_name: string | null;
      box_office_slug: string | null;
    }>('gw_events',
      `id=eq.${order.event_id}&select=id,title,start_date,venue_name,box_office_slug`,
    )

    return new Response(JSON.stringify({ order, tickets, event: events[0] ?? null }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
