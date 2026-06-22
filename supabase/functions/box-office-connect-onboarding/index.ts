// Edge function: start (or resume) Stripe Connect onboarding for a tenant.
//
// Phase B of the Box Office spec. Flow:
//   1. Caller is a tenant admin (verified via JWT tenant_role claim).
//   2. If the tenant doesn't have a Connected account yet, create a
//      Standard account on the platform Stripe account.
//   3. Persist the acct_* id on gw_tenants.stripe_account_id.
//   4. Mint an Account Link (type=account_onboarding) and return the URL.
//      The frontend then redirects the user to Stripe's hosted flow.
//
// We deliberately use Standard accounts + direct charges (no destination
// charges, no application_fee_amount). GleeWorld never custodies ticket
// money — the platform Stripe secret key is only used here to provision
// the Connected account and mint onboarding links.

// Direct PostgREST calls instead of @supabase/supabase-js — the supabase-js
// loader pulls in node:zlib + bufferutil which the self-hosted edge runtime
// can't resolve, and the resulting silent failure looked like a missing
// tenant row. Two raw fetches are simpler than the SDK here anyway.
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
  if (!res.ok) throw new Error(`PostgREST GET ${table} failed: ${res.status} ${await res.text()}`)
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
  if (!res.ok) throw new Error(`PostgREST PATCH ${table} failed: ${res.status} ${await res.text()}`)
}

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

    // Auth — decode the JWT for tenant_id / tenant_role; the same pattern as
    // create-module-checkout. Tenant admins (or super admins) only.
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
    // gw_tenant_members.role is stored with a hyphen ('super-admin'),
    // so the JWT claim follows the same shape. Accept both spellings to
    // tolerate a future rename.
    const ROLES_ALLOWED = ['admin', 'super-admin', 'super_admin']
    if (!ROLES_ALLOWED.includes(tenantRole)) {
      return new Response(JSON.stringify({ error: `Only tenant admins can connect Stripe (role: ${tenantRole ?? 'none'})` }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Look up the tenant — we need slug for the return URLs and the existing
    // stripe_account_id so we can resume onboarding instead of creating a
    // duplicate account.
    const rows = await pgRead<{ id: string; slug: string; name: string; stripe_account_id: string | null }>(
      'gw_tenants',
      `id=eq.${tenantId}&select=id,slug,name,stripe_account_id`,
    )
    const tenant = rows[0]
    if (!tenant) throw new Error(`Tenant not found for id=${tenantId}`)

    let accountId = tenant.stripe_account_id as string | null

    // Create a Standard Connected account if the tenant doesn't have one yet.
    if (!accountId) {
      const accountParams = new URLSearchParams()
      accountParams.set('type', 'standard')
      if (userEmail) accountParams.set('email', userEmail)
      accountParams.set('business_profile[name]', tenant.name ?? '')
      // Tag the account with our tenant id so the Connect webhook can
      // resolve back to the row without an extra DB lookup, AND so the
      // Stripe dashboard shows which GleeWorld tenant owns the account.
      accountParams.set('metadata[gleeworld_tenant_id]', tenantId)
      accountParams.set('metadata[gleeworld_tenant_slug]', tenant.slug ?? '')

      const accountRes = await fetch('https://api.stripe.com/v1/accounts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: accountParams.toString(),
      })
      const account = await accountRes.json()
      if (!accountRes.ok) {
        console.error('Stripe account create error', account)
        return new Response(JSON.stringify({ error: account.error?.message ?? 'Stripe error' }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      accountId = account.id as string

      // Persist before generating the link so the user can come back later
      // and resume. Service-role key bypasses RLS.
      try {
        await pgUpdate('gw_tenants', `id=eq.${tenantId}`, { stripe_account_id: accountId })
      } catch (err) {
        console.error('Failed to save stripe_account_id', err)
        // We still have the account on Stripe's side; the user can retry.
      }
    }

    // Mint an Account Link. type=account_onboarding takes them through the
    // full Standard-account onboarding (KYC, bank, etc). refresh_url is hit
    // when the link expires; return_url when they finish (or skip).
    const returnBase = `https://${tenant.slug ?? 'app'}.gleeworld.org/dashboard/box-office`
    const linkParams = new URLSearchParams()
    linkParams.set('account', accountId!)
    linkParams.set('type', 'account_onboarding')
    linkParams.set('refresh_url', `${returnBase}?stripe=refresh`)
    linkParams.set('return_url', `${returnBase}?stripe=return`)

    const linkRes = await fetch('https://api.stripe.com/v1/account_links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: linkParams.toString(),
    })
    const link = await linkRes.json()
    if (!linkRes.ok) {
      console.error('Stripe link create error', link)
      return new Response(JSON.stringify({ error: link.error?.message ?? 'Stripe error' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ url: link.url, account_id: accountId }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
