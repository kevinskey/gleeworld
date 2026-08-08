// Edge function: admin approves or denies a comp request.
//
// On approve: pick a tier (request.tier_id or admin override), call the
// existing gw_box_office_issue_comps SQL function (atomic seat-decrement
// + ticket mint), email the requester with the same template as direct
// comps, link the resulting order back to the request row for audit.
//
// On deny: just flip status + decision_note, send a friendly denial
// email. No DB damage if anything fails — the request stays editable.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000'
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const SIGNING_SECRET   = Deno.env.get('TICKET_SIGNING_SECRET') ?? ''
const RESEND_KEY       = Deno.env.get('RESEND_API_KEY') ?? ''
const ROOT_DOMAIN      = Deno.env.get('ROOT_DOMAIN') ?? 'gleeworld.org'

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
  if (!res.ok) throw new Error(`PostgREST PATCH ${table}: ${res.status} ${await res.text()}`)
}

async function pgRpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  })
  if (!res.ok) throw new Error(`RPC ${fn}: ${res.status} ${await res.text()}`)
  return res.json()
}

function escapeHtml(s: string): string {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
}

async function sendApprovedEmail(opts: {
  toEmail: string; holderName: string | null; eventTitle: string;
  eventDate: string; venueName: string | null; tenantSlug: string;
  tenantName: string; accessToken: string; count: number;
}) {
  if (!RESEND_KEY) return
  const url = `https://${opts.tenantSlug}.${ROOT_DOMAIN}/tickets/${opts.accessToken}`
  const plural = opts.count === 1 ? '' : 's'
  const text =
`Good news — your request for ${opts.count} ticket${plural} to ${opts.eventTitle} was approved.

${opts.eventTitle}
${opts.eventDate}${opts.venueName ? ' · ' + opts.venueName : ''}

Show this page at the door (scan the QR code from your phone):
${url}

— ${opts.tenantName}`
  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,sans-serif;color:#111;max-width:560px;margin:0 auto;padding:24px;">
    <h2 style="margin:0 0 4px;">${escapeHtml(opts.eventTitle)}</h2>
    <p style="margin:0 0 16px;color:#555;">${escapeHtml(opts.eventDate)}${opts.venueName ? ' · ' + escapeHtml(opts.venueName) : ''}</p>
    <p>Good news — your request for <strong>${opts.count} ticket${plural}</strong> was approved.</p>
    <p>Open this page on your phone at the door — each ticket scans individually:</p>
    <p><a href="${url}" style="display:inline-block;background:#0b1220;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:600;">View your tickets</a></p>
    <p style="color:#888;font-size:12px;">${escapeHtml(url)}</p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
    <p style="color:#888;font-size:12px;">— ${escapeHtml(opts.tenantName)}</p>
  </body></html>`
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `Box Office <welcome@${ROOT_DOMAIN}>`,
      to: [opts.toEmail],
      subject: `🎟 Approved — your ticket${plural} for ${opts.eventTitle}`,
      text, html,
    }),
  })
}

async function sendDeniedEmail(opts: {
  toEmail: string; eventTitle: string; note: string | null; tenantName: string;
}) {
  if (!RESEND_KEY) return
  const text =
`Your request for tickets to ${opts.eventTitle} couldn't be fulfilled this time.${opts.note ? `\n\nNote from the organizers:\n${opts.note}` : ''}

Reach out if you have questions.
— ${opts.tenantName}`
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `Box Office <welcome@${ROOT_DOMAIN}>`,
      to: [opts.toEmail],
      subject: `Your ticket request — ${opts.eventTitle}`,
      text,
    }),
  })
}

interface MintResult {
  ok?: boolean; error?: string; order_id?: string; access_token?: string;
  event_title?: string; tier_name?: string; quantity?: number;
}

import { verifyJwtClaims } from '../_shared/verifyJwt.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  try {
    if (!SIGNING_SECRET) throw new Error('TICKET_SIGNING_SECRET missing')

    const authHeader = req.headers.get('Authorization') ?? ''
    const accessToken = authHeader.replace(/^Bearer\s+/i, '')
    if (!accessToken) return bad('Missing Authorization', 401)
    let userId: string | null = null
    let tenantId: string | null = null
    let tenantRole: string | null = null
    try {
      const payload = (await verifyJwtClaims(accessToken)) ?? {}
      userId = payload.sub ?? null
      tenantId = payload.tenant_id ?? null
      tenantRole = payload.tenant_role ?? null
    } catch {
      return bad('Invalid JWT', 401)
    }
    if (!userId || !tenantId) return bad('Sign in to manage requests', 401)
    if (!['owner', 'admin', 'super-admin', 'super_admin'].includes(tenantRole ?? '')) {
      return bad('Only tenant admins can decide requests', 403)
    }

    const body = await req.json().catch(() => ({}))
    const requestId = String(body.request_id ?? '').trim()
    const decision  = String(body.decision   ?? '').trim()
    const tierIdOverride = String(body.tier_id ?? '').trim() || null
    const note      = String(body.note ?? '').trim().slice(0, 1000) || null
    if (!requestId) return bad('request_id required')
    if (decision !== 'approve' && decision !== 'deny') return bad('decision must be approve or deny')

    const requests = await pgRead<{
      id: string; tenant_id: string; event_id: string; tier_id: string | null;
      requester_email: string; requester_name: string | null; quantity: number;
      status: string;
    }>('gw_ticket_requests',
      `id=eq.${requestId}&tenant_id=eq.${tenantId}&select=id,tenant_id,event_id,tier_id,requester_email,requester_name,quantity,status`,
    )
    const reqRow = requests[0]
    if (!reqRow) return bad('Request not found', 404)
    if (reqRow.status !== 'pending') return bad(`Request already ${reqRow.status}`, 409)

    const events = await pgRead<{
      id: string; title: string; start_date: string; venue_name: string | null;
    }>('gw_events', `id=eq.${reqRow.event_id}&select=id,title,start_date,venue_name`)
    const event = events[0]
    if (!event) return bad('Event not found', 404)

    if (decision === 'deny') {
      await pgUpdate('gw_ticket_requests', `id=eq.${requestId}`, {
        status: 'denied',
        decision_note: note,
        decided_at: new Date().toISOString(),
        decided_by: userId,
      })
      const tenants = await pgRead<{ name: string }>('gw_tenants', `id=eq.${tenantId}&select=name`)
      try {
        await sendDeniedEmail({
          toEmail: reqRow.requester_email,
          eventTitle: event.title,
          note,
          tenantName: tenants[0]?.name ?? 'Box Office',
        })
      } catch (err) {
        console.error('denial email failed', err)
      }
      return new Response(JSON.stringify({ ok: true, status: 'denied' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // approve
    const tierId = tierIdOverride || reqRow.tier_id
    if (!tierId) return bad('No tier selected — pass tier_id to approve')

    const mint = await pgRpc<MintResult>('gw_box_office_issue_comps', {
      p_tenant_id: tenantId,
      p_event_id: reqRow.event_id,
      p_tier_id: tierId,
      p_holder_email: reqRow.requester_email,
      p_holder_name: reqRow.requester_name ?? '',
      p_quantity: reqRow.quantity,
      p_signing_secret: SIGNING_SECRET,
    })
    if (mint?.error) {
      const status = mint.error === 'over_capacity' ? 409 : 400
      return new Response(JSON.stringify({ error: mint.error, detail: mint }), {
        status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!mint?.ok) throw new Error('mint returned no result')

    await pgUpdate('gw_ticket_requests', `id=eq.${requestId}`, {
      status: 'approved',
      decision_note: note,
      decided_at: new Date().toISOString(),
      decided_by: userId,
      fulfilled_order_id: mint.order_id,
      tier_id: tierId,
    })

    const tenants = await pgRead<{ slug: string; name: string }>('gw_tenants', `id=eq.${tenantId}&select=slug,name`)
    const tenant = tenants[0]
    if (tenant && mint.access_token) {
      const eventDate = new Date(event.start_date).toLocaleString('en-US', {
        dateStyle: 'full', timeStyle: 'short',
      })
      try {
        await sendApprovedEmail({
          toEmail: reqRow.requester_email,
          holderName: reqRow.requester_name,
          eventTitle: event.title,
          eventDate,
          venueName: event.venue_name,
          tenantSlug: tenant.slug,
          tenantName: tenant.name,
          accessToken: mint.access_token,
          count: reqRow.quantity,
        })
      } catch (err) {
        console.error('approval email failed', err)
      }
    }

    return new Response(JSON.stringify({ ok: true, status: 'approved', mint }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
