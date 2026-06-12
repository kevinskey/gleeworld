// Edge function: Stripe Checkout (one-time payment) for a premium course add-on.
// Caller passes sku. Webhook writes gw_tenant_entitlement rows on completion.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY missing')

    const authHeader = req.headers.get('Authorization') ?? ''
    const accessToken = authHeader.replace(/^Bearer\s+/i, '')
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Missing Authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const payload = JSON.parse(atob(accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    const tenantId = payload.tenant_id
    const tenantRole = payload.tenant_role
    const userEmail = payload.email
    if (!tenantId) throw new Error('JWT missing tenant_id claim')
    if (!['admin', 'super_admin'].includes(tenantRole)) {
      return new Response(JSON.stringify({ error: 'Only tenant admins can purchase courses' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { sku, success_url, cancel_url } = await req.json()
    if (!sku) throw new Error('sku required')

    const sb = createClient(
      Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    const { data: product, error: prodErr } = await sb
      .from('gw_course_product')
      .select('id, sku, name, price_cents, stripe_price_id, bundle_key, template_course_id')
      .eq('sku', sku)
      .eq('active', true)
      .maybeSingle()
    if (prodErr || !product) throw new Error('Course product not found')
    if (!product.stripe_price_id) throw new Error('Course has no Stripe price configured')

    // Already owned? (bundle = owns all course products in the bundle)
    const { data: owned } = await sb
      .from('gw_tenant_entitlement')
      .select('product_id, gw_course_product!inner(sku, bundle_key, template_course_id)')
      .eq('tenant_id', tenantId)
    const ownedIds = new Set((owned ?? []).map((r: { product_id: string }) => r.product_id))
    if (product.template_course_id && ownedIds.has(product.id)) {
      throw new Error('Course already owned')
    }

    const { data: tenant } = await sb
      .from('gw_tenants')
      .select('slug, stripe_customer_id')
      .eq('id', tenantId)
      .maybeSingle()

    const params = new URLSearchParams()
    params.set('mode', 'payment')
    params.set('line_items[0][price]', product.stripe_price_id)
    params.set('line_items[0][quantity]', '1')
    params.set('client_reference_id', tenantId)
    params.set('metadata[tenant_id]', tenantId)
    params.set('metadata[tenant_slug]', tenant?.slug ?? '')
    params.set('metadata[course_sku]', product.sku)
    params.set('payment_intent_data[metadata][tenant_id]', tenantId)
    params.set('payment_intent_data[metadata][course_sku]', product.sku)
    params.set('success_url', success_url ?? `https://gleeworld.org/dashboard?course_purchased=${product.sku}`)
    params.set('cancel_url', cancel_url ?? `https://gleeworld.org/dashboard?course_cancelled=${product.sku}`)
    params.set('allow_promotion_codes', 'true')
    if (tenant?.stripe_customer_id) params.set('customer', tenant.stripe_customer_id)
    else if (userEmail) params.set('customer_email', userEmail)

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })
    const session = await stripeRes.json()
    if (!stripeRes.ok) {
      console.error('Stripe error', session)
      return new Response(JSON.stringify({ error: session.error?.message ?? 'Stripe error' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
