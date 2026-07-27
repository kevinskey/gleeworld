import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { runShare } from './runShare.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace('Bearer ', '');
  if (!jwt) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // The user client runs under the caller's JWT so RLS scopes every
  // read + write. Same pattern as the other assistant tools.
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
  if (!user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { google_event_id?: string; calendar_id?: string };
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'bad_request' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const google_event_id = String(body.google_event_id ?? '').trim();
  const calendar_id     = String(body.calendar_id ?? '').trim();
  if (!google_event_id || !calendar_id) {
    return new Response(JSON.stringify({ error: 'bad_request' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const result = await runShare({ user_id: user.id, google_event_id, calendar_id, supabase });
  const status = 'ok' in result ? 200 : (result.error === 'save_failed' ? 500 : 404);
  return new Response(JSON.stringify(result), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
