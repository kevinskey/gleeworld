// google-disconnect — revokes the user's Google refresh token (best effort)
// and removes the connection + every imported event.
//
// Auth: caller's JWT only.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  const { data: { user } } = await admin.auth.getUser(jwt);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const { data: conn } = await admin
    .from('gw_google_connections')
    .select('refresh_token')
    .eq('user_id', user.id)
    .maybeSingle();

  // Best-effort revoke at Google's end so the user's "Connected apps" view
  // drops GleeWorld. Failure here is non-fatal.
  if (conn?.refresh_token) {
    try {
      await fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(conn.refresh_token), { method: 'POST' });
    } catch { /* ignore */ }
  }

  await admin.from('gw_google_events').delete().eq('user_id', user.id);
  await admin.from('gw_google_connections').delete().eq('user_id', user.id);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
