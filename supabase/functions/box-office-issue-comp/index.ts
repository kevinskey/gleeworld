// Edge function: issue comp tickets.
//
// Admin (tenant admin or super-admin) provides recipient + tier + count.
// We call gw_box_office_issue_comps() which atomically mints the tickets
// (same QR + check-in path as paid), optionally email the recipient a
// link to their /tickets/<token> page.

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

function escapeHtml(s: string): string {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
}

async function sendCompEmail(opts: {
  toEmail: string;
  holderName: string | null;
  eventTitle: string;
  eventDate: string;
  venueName: string | null;
  tenantSlug: string;
  tenantName: string;
  accessToken: string;
  count: number;
}) {
  if (!RESEND_KEY) return
  const url = `https://${opts.tenantSlug}.${ROOT_DOMAIN}/tickets/${opts.accessToken}`
  const plural = opts.count === 1 ? '' : 's'
  const text =
`You've been comp'd ${opts.count} ticket${plural} for ${opts.eventTitle}.

${opts.eventTitle}
${opts.eventDate}${opts.venueName ? ' · ' + opts.venueName : ''}

Show this page at the door (scan the QR code from your phone):
${url}

— ${opts.tenantName}`
  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,sans-serif;color:#111;max-width:560px;margin:0 auto;padding:24px;">
    <h2 style="margin:0 0 4px;">${escapeHtml(opts.eventTitle)}</h2>
    <p style="margin:0 0 16px;color:#555;">${escapeHtml(opts.eventDate)}${opts.venueName ? ' · ' + escapeHtml(opts.venueName) : ''}</p>
    <p>You've been comp'd <strong>${opts.count} ticket${plural}</strong>${opts.holderName ? ', ' + escapeHtml(opts.holderName) : ''}.</p>
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
      subject: `🎟 Your comp ticket${plural} — ${opts.eventTitle}`,
      text,
      html,
    }),
  })
}

interface IssueResult {
  ok?: boolean;
  error?: string;
  order_id?: string;
  access_token?: string;
  event_title?: string;
  tier_name?: string;
  quantity?: number;
  tickets?: Array<{ id: string; token: string; tier_name: string }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    if (!SIGNING_SECRET) throw new Error('TICKET_SIGNING_SECRET missing')

    const authHeader = req.headers.get('Authorization') ?? ''
    const accessToken = authHeader.replace(/^Bearer\s+/i, '')
    if (!accessToken) return bad('Missing Authorization', 401)
    let tenantId: string | null = null
    let tenantRole: string | null = null
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
      tenantId = payload.tenant_id ?? null
      tenantRole = payload.tenant_role ?? null
    } catch {
      return bad('Invalid JWT', 401)
    }
    if (!tenantId) return bad('JWT missing tenant_id', 401)
    if (!['admin', 'super-admin', 'super_admin'].includes(tenantRole ?? '')) {
      return bad('Only tenant admins can issue comps', 403)
    }

    const body = await req.json().catch(() => ({}))
    const eventId    = String(body.event_id  ?? '').trim()
    const tierId     = String(body.tier_id   ?? '').trim()
    const holderName = String(body.holder_name  ?? '').trim()
    const holderEmail= String(body.holder_email ?? '').trim().toLowerCase()
    const quantity   = Math.max(1, Math.min(50, Number(body.quantity ?? 1)))
    const sendEmail  = body.send_email === true

    if (!eventId || !tierId) return bad('event_id and tier_id required')
    if (sendEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(holderEmail)) {
      return bad('valid holder_email required when send_email=true')
    }

    const result = await pgRpc<IssueResult>('gw_box_office_issue_comps', {
      p_tenant_id: tenantId,
      p_event_id: eventId,
      p_tier_id: tierId,
      p_holder_email: holderEmail,
      p_holder_name: holderName,
      p_quantity: quantity,
      p_signing_secret: SIGNING_SECRET,
    })
    if (result?.error) {
      // Surface "over_capacity" as 409 so the UI can show a friendlier
      // message than a generic 500.
      const status = result.error === 'over_capacity' ? 409 : 400
      return new Response(JSON.stringify({ error: result.error, detail: result }), {
        status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!result?.ok) throw new Error('mint returned no result')

    // Look up tenant info for the email + return payload.
    if (sendEmail && result.access_token) {
      const tenants = await pgRead<{ slug: string; name: string }>('gw_tenants', `id=eq.${tenantId}&select=slug,name`)
      const events = await pgRead<{ start_date: string; venue_name: string | null }>('gw_events', `id=eq.${eventId}&select=start_date,venue_name`)
      const tenant = tenants[0]
      const eventRow = events[0]
      if (tenant && eventRow) {
        const eventDate = new Date(eventRow.start_date).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })
        try {
          await sendCompEmail({
            toEmail: holderEmail,
            holderName: holderName || null,
            eventTitle: result.event_title ?? '',
            eventDate,
            venueName: eventRow.venue_name,
            tenantSlug: tenant.slug,
            tenantName: tenant.name,
            accessToken: result.access_token,
            count: result.quantity ?? quantity,
          })
        } catch (err) {
          console.error('comp email failed', err)
          // Continue — the tickets exist, the email just didn't go out.
        }
      }
    }

    return new Response(JSON.stringify(result), {
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
