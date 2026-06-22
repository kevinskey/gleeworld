// google-oauth-start — kicks off the Google Calendar OAuth flow for the
// caller. Generates a state nonce, stashes it in gw_oauth_states, and
// returns the Google authorization URL the frontend should redirect to.
//
// Requires env vars (set on the edge-functions container):
//   GW_GOOGLE_CAL_CLIENT_ID
//   GW_GOOGLE_CAL_REDIRECT_URI  (default: https://supabase.gleeworld.org/functions/v1/google-oauth-callback)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const clientId = Deno.env.get('GW_GOOGLE_CAL_CLIENT_ID');
  if (!clientId) {
    return new Response(
      JSON.stringify({ error: 'Google OAuth not configured. Set GW_GOOGLE_CAL_CLIENT_ID on the edge-functions service.' }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const redirectUri = Deno.env.get('GW_GOOGLE_CAL_REDIRECT_URI')
    ?? 'https://supabase.gleeworld.org/functions/v1/google-oauth-callback';

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authErr } = await admin.auth.getUser(jwt);
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // We need the caller's tenant_id to seed the state row (so the callback
  // function can resolve current_tenant_id() correctly when it inserts the
  // connection row using the service role).
  const { data: profile } = await admin.from('gw_profiles').select('tenant_id').eq('user_id', user.id).maybeSingle();
  if (!profile?.tenant_id) {
    return new Response(JSON.stringify({ error: 'No tenant for user' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  let body: { redirect_to?: string } = {};
  try { body = await req.json(); } catch { /* optional */ }

  // Cryptographically random state nonce.
  const state = crypto.randomUUID() + '.' + crypto.randomUUID();
  const { error: stateErr } = await admin.from('gw_oauth_states').insert({
    state,
    user_id: user.id,
    tenant_id: profile.tenant_id,
    provider: 'google',
    redirect_to: body.redirect_to ?? '/dashboard/calendar',
  });
  if (stateErr) {
    return new Response(JSON.stringify({ error: 'state_store_failed: ' + stateErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Read-only scope is all we need to pull events into GleeWorld.
  // access_type=offline + prompt=consent ensures Google issues a refresh_token
  // (otherwise the second connect for the same user wouldn't get one back).
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    // calendar.events grants read+write on events (not on calendar metadata).
    // Sufficient for both pulling Google events into GleeWorld and pushing
    // GleeWorld events back to the user's primary calendar.
    scope: 'https://www.googleapis.com/auth/calendar.events openid email profile',
    state,
  });

  const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString();
  return new Response(JSON.stringify({ url }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
