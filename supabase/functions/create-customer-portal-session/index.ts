// create-customer-portal-session — creates a Stripe customer portal
// session for the caller's tenant. The tenant's Stripe customer id is
// stored in gw_tenants.stripe_customer_id (set by the existing checkout
// flow). Returns { url } that the frontend redirects to.
//
// Tenant-scoped: caller's profile.tenant_id must match the tenant whose
// customer id is being used.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeSecret) {
    return new Response(JSON.stringify({ error: 'stripe_not_configured' }), {
      status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  const { data: { user } } = await admin.auth.getUser(jwt);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { return_url?: string } = {};
  try { body = await req.json(); } catch { /* */ }

  // Caller's tenant.
  const { data: profile } = await admin
    .from('gw_profiles')
    .select('tenant_id, is_admin, is_super_admin')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile?.tenant_id) {
    return new Response(JSON.stringify({ error: 'no_tenant_for_caller' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!profile.is_admin && !profile.is_super_admin) {
    return new Response(JSON.stringify({ error: 'admin_only' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Look up Stripe customer for the tenant.
  const { data: tenant } = await admin
    .from('gw_tenants')
    .select('id, slug, stripe_customer_id')
    .eq('id', profile.tenant_id)
    .maybeSingle();
  const customerId = (tenant as any)?.stripe_customer_id;
  if (!customerId) {
    return new Response(JSON.stringify({ error: 'no_stripe_customer_for_tenant' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const returnUrl = body.return_url
    || `${Deno.env.get('PUBLIC_SITE_URL') ?? 'https://gleeworld.org'}/dashboard/workspace`;

  // Create a Stripe customer portal session.
  const form = new URLSearchParams({
    customer: customerId,
    return_url: returnUrl,
  });
  const resp = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeSecret}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });
  if (!resp.ok) {
    const text = await resp.text();
    return new Response(JSON.stringify({ error: 'stripe_portal_failed', detail: text.slice(0, 300) }), {
      status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const session = await resp.json() as { url: string };
  return new Response(JSON.stringify({ url: session.url }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
