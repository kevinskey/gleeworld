// Edge function: admin refunds a paid order.
//
// Full-refund only. Calls Stripe refunds API on the tenant's Connected
// account (Stripe-Account header), then atomically voids the order via
// gw_box_office_void_order. The same SQL function gets called by the
// Connect webhook when a refund originates from the Stripe Dashboard —
// the idempotency guard inside it means the second call is a no-op,
// so it's safe to race.
//
// For comp orders (status='comp') we skip Stripe (no money to refund)
// and just void; UI calls this same function with kind='void'.

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

import { verifyJwtClaims } from '../_shared/verifyJwt.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY missing')

    const authHeader = req.headers.get('Authorization') ?? ''
    const accessToken = authHeader.replace(/^Bearer\s+/i, '')
    if (!accessToken) return bad('Missing Authorization', 401)
    let tenantId: string | null = null
    let tenantRole: string | null = null
    try {
      const payload = (await verifyJwtClaims(accessToken)) ?? {}
      tenantId = payload.tenant_id ?? null
      tenantRole = payload.tenant_role ?? null
    } catch {
      return bad('Invalid JWT', 401)
    }
    if (!tenantId) return bad('JWT missing tenant_id', 401)
    if (!['admin', 'super-admin', 'super_admin'].includes(tenantRole ?? '')) {
      return bad('Only tenant admins can refund orders', 403)
    }

    const body = await req.json().catch(() => ({}))
    const orderId = String(body.order_id ?? '').trim()
    if (!orderId) return bad('order_id required')

    const orders = await pgRead<{
      id: string; tenant_id: string; status: string;
      stripe_payment_intent_id: string | null; amount_cents: number;
    }>('gw_ticket_orders',
      `id=eq.${orderId}&tenant_id=eq.${tenantId}&select=id,tenant_id,status,stripe_payment_intent_id,amount_cents`,
    )
    const order = orders[0]
    if (!order) return bad('Order not found', 404)

    if (order.status === 'refunded' || order.status === 'void') {
      return new Response(JSON.stringify({ ok: true, already_done: true, status: order.status }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (order.status === 'pending' || order.status === 'failed') {
      return bad(`Cannot refund a ${order.status} order`, 409)
    }

    // For 'paid' orders we hit Stripe first. The DB update follows so an
    // API failure leaves us in 'paid' (retryable). For 'comp' we skip
    // straight to the void.
    if (order.status === 'paid') {
      if (!order.stripe_payment_intent_id) return bad('Order has no payment_intent — cannot refund')

      // Look up tenant for the Connected account id (refunds are issued
      // on the seller's account, not the platform's).
      const tenants = await pgRead<{ stripe_account_id: string | null }>(
        'gw_tenants', `id=eq.${tenantId}&select=stripe_account_id`,
      )
      const accountId = tenants[0]?.stripe_account_id
      if (!accountId) return bad('Tenant Stripe account missing', 500)

      const params = new URLSearchParams()
      params.set('payment_intent', order.stripe_payment_intent_id)
      params.set('reason', 'requested_by_customer')
      params.set('metadata[order_id]', order.id)
      params.set('metadata[tenant_id]', tenantId)
      params.set('refund_application_fee', 'true') // Return the platform's 1% fee on refunds — the tenant is never left covering GleeWorld's cut.

      const stripeRes = await fetch('https://api.stripe.com/v1/refunds', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Stripe-Account': accountId,
        },
        body: params.toString(),
      })
      const refund = await stripeRes.json()
      if (!stripeRes.ok) {
        console.error('Stripe refund error', refund)
        return new Response(JSON.stringify({ error: refund.error?.message ?? 'Stripe refund failed' }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const nextStatus = order.status === 'comp' ? 'void' : 'refunded'
    const result = await pgRpc<{ ok?: boolean; error?: string; tickets_voided?: number }>(
      'gw_box_office_void_order',
      { p_order_id: order.id, p_tenant_id: tenantId, p_next_status: nextStatus },
    )
    if (result?.error) {
      console.error('void_order failed', result)
      return bad(result.error, 500)
    }

    return new Response(JSON.stringify({ ok: true, status: nextStatus, voided: result?.tickets_voided ?? 0 }), {
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
