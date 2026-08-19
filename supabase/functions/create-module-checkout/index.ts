// Edge function: create a Stripe Checkout Session for a tenant to activate an add-on module.
// Caller passes module_id. We look up the price + the caller's tenant from JWT, then
// create a subscription checkout session with client_reference_id=tenant_id so the
// webhook can upsert gw_tenant_subscriptions on completion.
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

    // Service-role client — also used to verify the caller's token below.
    const sb = createClient(
      Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Auth: the edge-functions container runs with VERIFY_JWT=false, so the
    // gateway does NOT check the token signature — we MUST verify it here.
    // Without this a forged JWT (any tenant_id / tenant_role='super-admin',
    // garbage signature) would be trusted and let an attacker open a module
    // checkout against any tenant.
    const authHeader = req.headers.get('Authorization') ?? ''
    const accessToken = authHeader.replace(/^Bearer\s+/i, '')
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Missing Authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const { data: userData, error: authErr } = await sb.auth.getUser(accessToken)
    if (authErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'invalid_token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    // Signature verified — custom claims from the GoTrue hook are trustworthy,
    // but they describe the caller's HOME tenant, which is the wrong tenant
    // whenever an admin manages a workspace they aren't homed on (same defect
    // as create-plan-checkout, found 2026-08-17). The frontend names the
    // target workspace by tenant_slug; the slug decides the tenant, and the
    // claims' role counts only when they refer to that same tenant —
    // otherwise the caller's gw_tenant_members row (or platform super-admin
    // flag) is the gate.
    const payload = JSON.parse(atob(accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    const userEmail = payload.email

    const { module_id, success_url, cancel_url, tenant_slug } = await req.json()
    if (!module_id) throw new Error('module_id required')

    const claimTenant = payload.tenant_id
    let tenantId = claimTenant
    const slug = String(tenant_slug ?? req.headers.get('x-tenant-slug') ?? '').trim()
    if (slug) {
      const { data: t } = await sb.from('gw_tenants').select('id').eq('slug', slug).maybeSingle()
      if (!t?.id) throw new Error(`Unknown tenant: ${slug}`)
      tenantId = t.id
    }
    if (!tenantId) throw new Error('JWT missing tenant_id claim (pass tenant_slug)')

    let tenantRole = claimTenant === tenantId ? (payload.tenant_role ?? '') : ''
    if (!tenantRole) {
      const [{ data: member }, { data: profile }] = await Promise.all([
        sb.from('gw_tenant_members').select('role')
          .eq('tenant_id', tenantId).eq('user_id', userData.user.id).maybeSingle(),
        sb.from('gw_profiles').select('is_super_admin')
          .eq('user_id', userData.user.id).maybeSingle(),
      ])
      tenantRole = profile?.is_super_admin ? 'super_admin' : (member?.role ?? '')
    }
    // gw_tenant_members.role uses a hyphen ('super-admin'); accept both.
    // 'director' is the membership role GleeWorld actually grants tenant
    // admins (matches create-plan-checkout).
    if (!['owner', 'admin', 'director', 'super-admin', 'super_admin'].includes(tenantRole)) {
      return new Response(JSON.stringify({ error: 'Only tenant admins can activate modules' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const { data: mod, error: modErr } = await sb
      .from('gw_billing_modules')
      .select('id, name, tier, stripe_price_id, monthly_price_cents')
      .eq('id', module_id)
      .maybeSingle()
    if (modErr || !mod) throw new Error('Module not found')
    if (mod.tier === 'starter') throw new Error('Starter modules are included — no activation needed')
    if (!mod.stripe_price_id) throw new Error('Module has no Stripe price configured')

    // Look up tenant for stripe_customer_id (may be null first time)
    const { data: tenant } = await sb
      .from('gw_tenants')
      .select('slug, stripe_customer_id')
      .eq('id', tenantId)
      .maybeSingle()

    // Build Checkout Session
    const params = new URLSearchParams()
    params.set('mode', 'subscription')
    params.set('line_items[0][price]', mod.stripe_price_id)
    params.set('line_items[0][quantity]', '1')
    params.set('client_reference_id', tenantId)
    params.set('metadata[tenant_id]', tenantId)
    params.set('metadata[tenant_slug]', tenant?.slug ?? '')
    params.set('metadata[module_id]', module_id)
    params.set('subscription_data[metadata][tenant_id]', tenantId)
    params.set('subscription_data[metadata][module_id]', module_id)
    params.set('success_url', success_url ?? `https://${tenant?.slug ?? ''}.gleeworld.org/settings/modules?activated=${module_id}`)
    params.set('cancel_url', cancel_url ?? `https://${tenant?.slug ?? ''}.gleeworld.org/settings/modules?cancelled=${module_id}`)
    params.set('allow_promotion_codes', 'true')
    if (tenant?.stripe_customer_id) {
      params.set('customer', tenant.stripe_customer_id)
    } else if (userEmail) {
      params.set('customer_email', userEmail)
    }

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
