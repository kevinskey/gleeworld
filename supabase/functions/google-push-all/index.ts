// google-push-all — bulk-mirror every gw_event in the caller's tenant that
// doesn't yet have a google_event_id. Useful for the first-time "backfill
// my Google calendar with everything already in GleeWorld" button.
//
// Limits: caps at 200 events per call to stay under Google's burst quota
// and the edge-function 60s wall-clock budget. Re-running picks up where
// it left off (any row that successfully linked gets google_event_id set
// and is excluded next time).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WRITE_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId, client_secret: clientSecret,
      refresh_token: refreshToken, grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error('refresh_failed: ' + (await res.text()).slice(0, 200));
  return await res.json() as { access_token: string; expires_in: number };
}

function gwEventToGoogle(row: any) {
  return {
    summary: row.title || '(untitled)',
    description: row.description ?? undefined,
    location: [row.venue_name, row.location, row.address].filter(Boolean).join(', ') || undefined,
    start: { dateTime: new Date(row.start_date).toISOString() },
    end:   { dateTime: new Date(row.end_date || row.start_date).toISOString() },
    extendedProperties: { private: { gleeworld_event_id: row.id, gleeworld_tenant_id: row.tenant_id } },
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const clientId     = Deno.env.get('GW_GOOGLE_CAL_CLIENT_ID');
  const clientSecret = Deno.env.get('GW_GOOGLE_CAL_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    return new Response(JSON.stringify({ error: 'Google OAuth secrets not configured.' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

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
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!conn) return new Response(JSON.stringify({ error: 'not_connected' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  if (!(conn.scope ?? '').includes(WRITE_SCOPE)) {
    return new Response(JSON.stringify({ error: 'no_write_scope', detail: 'Re-authorize for two-way sync.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  let accessToken = conn.access_token as string | null;
  if (!accessToken || !conn.expires_at || new Date(conn.expires_at) < new Date()) {
    try {
      const r = await refreshAccessToken(conn.refresh_token, clientId, clientSecret);
      accessToken = r.access_token;
      const expiresAt = new Date(Date.now() + (r.expires_in - 30) * 1000).toISOString();
      await admin.from('gw_google_connections').update({ access_token: accessToken, expires_at: expiresAt, last_error: null }).eq('id', conn.id);
    } catch (e) {
      return new Response(JSON.stringify({ error: 'token_refresh_failed', detail: String(e) }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  // Pull events that haven't been pushed yet (oldest 200 by start_date).
  const { data: rows, error: rowsErr } = await admin
    .from('gw_events')
    .select('id, tenant_id, title, description, location, venue_name, address, start_date, end_date')
    .eq('tenant_id', conn.tenant_id)
    .is('google_event_id', null)
    .order('start_date', { ascending: true })
    .limit(200);
  if (rowsErr) return new Response(JSON.stringify({ error: 'list_failed', detail: rowsErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  let pushed = 0;
  let failed = 0;
  const errors: string[] = [];

  // Serial loop — Google's per-user quota is gentle enough that 200
  // sequential POSTs are safe (~10 RPS limit). Parallelising would risk
  // 429s; not worth it for a one-time backfill.
  for (const row of rows ?? []) {
    try {
      const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(gwEventToGoogle(row)),
      });
      if (!r.ok) {
        failed++;
        const t = (await r.text()).slice(0, 200);
        errors.push(`${row.title || row.id}: ${t}`);
        await admin.from('gw_events').update({ google_push_error: t }).eq('id', row.id);
        continue;
      }
      const created = await r.json() as { id: string };
      await admin.from('gw_events').update({
        google_event_id: created.id,
        google_pushed_at: new Date().toISOString(),
        google_push_error: null,
      }).eq('id', row.id);
      pushed++;
    } catch (e: any) {
      failed++;
      errors.push(`${row.title || row.id}: ${String(e).slice(0, 200)}`);
    }
  }

  return new Response(JSON.stringify({ ok: true, pushed, failed, sample_errors: errors.slice(0, 3) }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
