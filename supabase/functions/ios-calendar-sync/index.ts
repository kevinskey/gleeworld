import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { runSync, type GWCalendarEvent } from './runSync.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace('Bearer ', '');
  if (!jwt) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );
  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );
  const { data: { user } } = await admin.auth.getUser(jwt);
  if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  // Resolve tenant_id via profile so the row gets stamped correctly even
  // if the RPC trigger's current_tenant_id() misses (e.g. header-less
  // sync from a fresh install).
  const { data: profile } = await admin.from('gw_profiles').select('tenant_id').eq('user_id', user.id).maybeSingle();
  const tenant_id = (profile as any)?.tenant_id ?? null;
  if (!tenant_id) {
    return new Response(JSON.stringify({ error: 'no_tenant' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  let body: { events?: GWCalendarEvent[]; fromIso?: string; toIso?: string };
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: 'bad_request' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }

  const events = Array.isArray(body.events) ? body.events : [];
  const fromIso = String(body.fromIso ?? '');
  const toIso   = String(body.toIso ?? '');
  if (!fromIso || !toIso) {
    return new Response(JSON.stringify({ error: 'bad_request' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const result = await runSync({ supabase, admin, user_id: user.id, tenant_id, events, fromIso, toIso });
  const status = 'ok' in result ? 200 : (result.error === 'save_failed' ? 500 : 400);
  return new Response(JSON.stringify(result), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
