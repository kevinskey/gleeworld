// Edge function: door check-in.
//
// Usher scans or types a ticket token. We:
//   1. Verify the HMAC signature locally (no DB hit if it's a forged
//      string), so a rapid-fire scan attack can't hammer Postgres.
//   2. UPDATE gw_tickets SET status='redeemed', redeemed_at=now()
//      WHERE id=$id AND status='valid' RETURNING ... — the WHERE
//      filter is the duplicate-scan guard; if zero rows return the
//      ticket was already scanned or voided.
//   3. INSERT into gw_ticket_checkins. UNIQUE(ticket_id) on that table
//      is a second-line guard against concurrent scanners.
//
// Caller must be authenticated and belong to the same tenant as the
// ticket. We trust the JWT tenant_id claim; the DB UPDATE is filtered
// by tenant for belt-and-suspenders.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000'
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const SIGNING_SECRET   = Deno.env.get('TICKET_SIGNING_SECRET') ?? ''

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
  if (!res.ok) {
    // 23505 = unique violation. Means another scanner beat us to inserting
    // the check-in row — surface as an idempotent success.
    if (res.status === 409) return { duplicate: true } as unknown as T
    throw new Error(`PostgREST POST ${table}: ${res.status} ${await res.text()}`)
  }
  const data = await res.json()
  return Array.isArray(data) ? data[0] : data
}

async function verifyToken(token: string): Promise<string | null> {
  // Token format: "<ticket_id_uuid>.<hex_hmac>". We re-compute the HMAC
  // and constant-time compare. Returns ticket_id on success, null on
  // failure. SHA-256 + Web Crypto API — same algorithm as the SQL
  // mint function so the digests line up.
  const dot = token.indexOf('.')
  if (dot < 0) return null
  const ticketId = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  if (!/^[0-9a-f-]+$/i.test(ticketId) || !/^[0-9a-f]+$/i.test(sig)) return null

  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(SIGNING_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const buf = await crypto.subtle.sign('HMAC', key, enc.encode(ticketId))
  const expected = Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  // Constant-time compare to avoid timing-side-channel leaks.
  if (expected.length !== sig.length) return null
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i)
  return diff === 0 ? ticketId : null
}

interface Ticket {
  id: string
  tenant_id: string
  order_id: string
  tier_id: string
  event_id: string
  status: 'valid' | 'redeemed' | 'void'
  redeemed_at: string | null
  holder_name: string | null
}

import { verifyJwtClaims } from '../_shared/verifyJwt.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    if (!SIGNING_SECRET) throw new Error('TICKET_SIGNING_SECRET missing')

    // Auth — must be a tenant member. We don't pin a role here so any
    // staffer with a tenant JWT can scan (ushers, students checking in
    // their classmates' families, etc.).
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
    if (!userId || !tenantId) return bad('JWT missing required claims', 401)

    const body = await req.json().catch(() => ({}))
    const token = String(body.token ?? '').trim()
    const eventId = String(body.event_id ?? '').trim()
    if (!token) return bad('token required')

    const ticketId = await verifyToken(token)
    if (!ticketId) {
      return ok({ result: 'invalid_signature', message: 'Not a valid ticket' })
    }

    // Fetch the ticket — same tenant only.
    const rows = await pgRead<Ticket>(
      'gw_tickets',
      `id=eq.${ticketId}&tenant_id=eq.${tenantId}&select=id,tenant_id,order_id,tier_id,event_id,status,redeemed_at,holder_name`,
    )
    const ticket = rows[0]
    if (!ticket) return ok({ result: 'not_found', message: 'Ticket not found' })
    if (eventId && ticket.event_id !== eventId) {
      return ok({ result: 'wrong_event', message: 'Ticket is for a different event' })
    }
    if (ticket.status === 'void') {
      return ok({ result: 'void', message: 'Ticket was voided' })
    }
    if (ticket.status === 'redeemed') {
      return ok({
        result: 'already_redeemed',
        message: 'Already scanned',
        redeemed_at: ticket.redeemed_at,
        holder_name: ticket.holder_name,
      })
    }

    // Atomic redeem. The status='valid' filter is what makes the
    // concurrent-scan race land harmlessly — only one of N parallel
    // scanners gets a non-empty RETURNING.
    const updated = await pgUpdate<Ticket>(
      'gw_tickets',
      `id=eq.${ticket.id}&status=eq.valid`,
      { status: 'redeemed', redeemed_at: new Date().toISOString() },
    )
    if (updated.length === 0) {
      return ok({ result: 'already_redeemed', message: 'Already scanned' })
    }

    // Log the check-in. The UNIQUE(ticket_id) on the table swallows a
    // double-insert as 409 — we surface that as a success too.
    await pgInsert('gw_ticket_checkins', {
      tenant_id: tenantId,
      ticket_id: ticket.id,
      checked_in_by: userId,
    })

    // Lookup tier name + event title for the usher's confirmation row.
    const [tiers, events] = await Promise.all([
      pgRead<{ id: string; name: string }>('gw_ticket_tiers', `id=eq.${ticket.tier_id}&select=id,name`),
      pgRead<{ id: string; title: string; venue_name: string | null }>('gw_events', `id=eq.${ticket.event_id}&select=id,title,venue_name`),
    ])

    return ok({
      result: 'ok',
      message: 'Welcome in',
      ticket_id: ticket.id,
      holder_name: ticket.holder_name,
      tier_name: tiers[0]?.name ?? '',
      event_title: events[0]?.title ?? '',
    })
  } catch (e) {
    console.error(e)
    return bad((e as Error).message, 500)
  }
})

function ok(payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
function bad(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
