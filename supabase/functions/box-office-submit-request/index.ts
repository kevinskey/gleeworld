// Edge function: submit a comp-ticket request.
//
// Any authenticated tenant member can submit one. We validate against
// the event's box_office_request_max (NULL = requests disabled) and
// cap quantity. The admin queue lives on the event page; on approval
// box-office-decide-request mints comps through the existing
// gw_box_office_issue_comps SQL function.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  if (!res.ok) throw new Error(`PostgREST POST ${table}: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return Array.isArray(data) ? data[0] : data
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const accessToken = authHeader.replace(/^Bearer\s+/i, '')
    if (!accessToken) return bad('Sign in to request tickets', 401)
    let userId: string | null = null
    let tenantId: string | null = null
    let userEmail: string | null = null
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
      userId = payload.sub ?? null
      tenantId = payload.tenant_id ?? null
      userEmail = payload.email ?? null
    } catch {
      return bad('Invalid session', 401)
    }
    if (!userId || !tenantId) return bad('Sign in to request tickets', 401)

    const body = await req.json().catch(() => ({}))
    const eventId = String(body.event_id ?? '').trim()
    const tierId  = String(body.tier_id  ?? '').trim() || null
    const quantity = Math.max(1, Math.min(20, Number(body.quantity ?? 0)))
    const message  = String(body.message ?? '').trim().slice(0, 1000)
    const requesterName = String(body.requester_name ?? '').trim().slice(0, 200)
    const requesterEmail = String(body.requester_email ?? userEmail ?? '').trim().toLowerCase()

    if (!eventId)  return bad('event_id required')
    if (!quantity) return bad('quantity required')
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(requesterEmail)) return bad('valid email required')

    const events = await pgRead<{
      id: string; tenant_id: string; box_office_status: string | null;
      box_office_request_max: number | null;
    }>('gw_events',
      `id=eq.${eventId}&tenant_id=eq.${tenantId}&select=id,tenant_id,box_office_status,box_office_request_max`,
    )
    const event = events[0]
    if (!event) return bad('Event not found', 404)
    if (event.box_office_status !== 'published') {
      return bad('This event is not currently accepting requests', 409)
    }
    if (event.box_office_request_max == null) {
      return bad('Comp requests are not enabled for this event', 409)
    }
    if (quantity > event.box_office_request_max) {
      return bad(`Max ${event.box_office_request_max} tickets per request`, 400)
    }

    // Block a member from spamming the same event with overlapping pending
    // requests. They can have one in flight at a time per event.
    const existing = await pgRead<{ id: string }>('gw_ticket_requests',
      `event_id=eq.${eventId}&requester_user_id=eq.${userId}&status=eq.pending&select=id`,
    )
    if (existing.length > 0) {
      return bad('You already have a pending request for this event', 409)
    }

    const row = await pgInsert<{ id: string }>('gw_ticket_requests', {
      tenant_id: tenantId,
      event_id: eventId,
      tier_id: tierId,
      requester_user_id: userId,
      requester_email: requesterEmail,
      requester_name: requesterName || null,
      quantity,
      message: message || null,
      status: 'pending',
    })

    return new Response(JSON.stringify({ ok: true, request_id: row.id }), {
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
