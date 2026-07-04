// Edge function: redeem every unredeemed ticket on an order at once.
//
// Will-call companion to box-office-checkin (which is per-ticket via QR).
// The usher looks the buyer up by name, clicks the row, and the function
// marks all 'valid' tickets on that order as 'redeemed' in a single
// transaction-y batch (each UPDATE filters on status='valid' so concurrent
// QR scans of the same buyer's email don't double-redeem).
//
// Admin-auth only — the will-call workflow runs from the tenant's own
// staff devices, not the buyer's phone.

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

async function pgUpdate<T>(table: string, query: string, patch: Record<string, unknown>): Promise<T[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(`PostgREST PATCH ${table}: ${res.status} ${await res.text()}`)
  return res.json()
}

async function pgInsertMany(table: string, rows: Record<string, unknown>[]): Promise<void> {
  if (rows.length === 0) return
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal, resolution=ignore-duplicates',
    },
    body: JSON.stringify(rows),
  })
  // 409 on UNIQUE conflict (someone else already inserted a checkin row
  // for one of these tickets) is fine — that's the duplicate-scan race.
  if (!res.ok && res.status !== 409) throw new Error(`PostgREST POST ${table}: ${res.status} ${await res.text()}`)
}

interface OrderTicket {
  id: string
  status: 'valid' | 'redeemed' | 'void'
}

import { verifyJwtClaims } from '../_shared/verifyJwt.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const accessToken = authHeader.replace(/^Bearer\s+/i, '')
    if (!accessToken) return bad('Missing Authorization', 401)
    let userId: string | null = null
    let tenantId: string | null = null
    try {
      const payload = (await verifyJwtClaims(accessToken)) ?? {}
      userId = payload.sub ?? null
      tenantId = payload.tenant_id ?? null
    } catch {
      return bad('Invalid JWT', 401)
    }
    if (!userId || !tenantId) return bad('Sign in required', 401)

    const body = await req.json().catch(() => ({}))
    const orderId = String(body.order_id ?? '').trim()
    // Optional: limit to specific ticket ids (partial will-call). When
    // omitted we redeem every still-valid ticket on the order.
    const onlyTicketIds: string[] = Array.isArray(body.ticket_ids) ? body.ticket_ids : []
    if (!orderId) return bad('order_id required')

    // Verify the order belongs to this tenant + is in a checkable state.
    const orders = await pgRead<{ id: string; tenant_id: string; status: string }>(
      'gw_ticket_orders',
      `id=eq.${orderId}&tenant_id=eq.${tenantId}&select=id,tenant_id,status`,
    )
    const order = orders[0]
    if (!order) return bad('Order not found', 404)
    if (order.status !== 'paid' && order.status !== 'comp') {
      return bad(`Cannot check in a ${order.status} order`, 409)
    }

    // Pull all tickets on the order; filter to 'valid' before updating.
    const allTickets = await pgRead<OrderTicket>(
      'gw_tickets',
      `order_id=eq.${order.id}&select=id,status`,
    )
    const targets = allTickets.filter((t) =>
      t.status === 'valid' && (onlyTicketIds.length === 0 || onlyTicketIds.includes(t.id))
    )
    if (targets.length === 0) {
      return new Response(JSON.stringify({
        ok: true,
        redeemed: 0,
        message: 'No tickets to check in (all already redeemed or voided)',
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Bulk redeem. PostgREST in.(...) filter keeps the UPDATE atomic on
    // the subset; status=eq.valid guards against the concurrent-QR race.
    const idList = targets.map((t) => t.id).join(',')
    const updated = await pgUpdate<{ id: string }>(
      'gw_tickets',
      `id=in.(${idList})&status=eq.valid`,
      { status: 'redeemed', redeemed_at: new Date().toISOString() },
    )

    // Log the check-ins. UNIQUE(ticket_id) on the table swallows dupes.
    await pgInsertMany('gw_ticket_checkins', updated.map((t) => ({
      tenant_id: tenantId,
      ticket_id: t.id,
      checked_in_by: userId,
      notes: 'will-call',
    })))

    return new Response(JSON.stringify({
      ok: true,
      redeemed: updated.length,
      requested: targets.length,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
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
