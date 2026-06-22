// google-push-event — mirrors a single GleeWorld event to the user's Google
// primary calendar. Called by the frontend right after a successful insert /
// update / delete on gw_events.
//
// Body shape:
//   { event_id: string, op: 'create' | 'update' | 'delete' }
//
// Behavior:
//   create — POST to /calendars/primary/events, store the returned id on
//            gw_events.google_event_id.
//   update — if gw_events.google_event_id is set, PATCH the existing Google
//            event. If not (event was created before the user had a Google
//            connection), fall through to create.
//   delete — if google_event_id is set, DELETE from Google. Then clear the
//            column (or do nothing if the gw_events row is already gone).
//
// Auth: caller's JWT. We only push events the caller created (their own
// Google account, their own events). Multi-user fan-out is a follow-up.

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

// Build the Google Calendar event payload from a gw_events row.
function gwEventToGoogle(row: any) {
  // Both dateTime form (RFC3339) and date form (all-day) are valid for Google.
  // Our rows store start_date/end_date as timestamptz, so dateTime is correct.
  const start: any = { dateTime: new Date(row.start_date).toISOString() };
  const end: any   = { dateTime: new Date(row.end_date || row.start_date).toISOString() };
  // Tag with an extended property so a future round-trip-dedup pass can
  // recognise events that originated in GleeWorld.
  return {
    summary: row.title || '(untitled)',
    description: row.description ?? undefined,
    location: [row.venue_name, row.location, row.address].filter(Boolean).join(', ') || undefined,
    start,
    end,
    extendedProperties: {
      private: {
        gleeworld_event_id: row.id,
        gleeworld_tenant_id: row.tenant_id,
      },
    },
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

  let body: { event_id?: string; op?: 'create' | 'update' | 'delete' } = {};
  try { body = await req.json(); } catch { /* no body */ }
  if (!body.event_id || !body.op) {
    return new Response(JSON.stringify({ error: 'event_id and op are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Look up the user's Google connection. If they're not connected (or the
  // connection only has read scope), we silently no-op so plain GleeWorld
  // event creation isn't blocked.
  const { data: conn } = await admin
    .from('gw_google_connections')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!conn || !(conn.scope ?? '').includes(WRITE_SCOPE)) {
    return new Response(JSON.stringify({ ok: true, skipped: 'no_write_connection' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Ensure a fresh access_token.
  let accessToken = conn.access_token as string | null;
  const expired = !accessToken || !conn.expires_at || new Date(conn.expires_at) < new Date();
  if (expired) {
    try {
      const r = await refreshAccessToken(conn.refresh_token, clientId, clientSecret);
      accessToken = r.access_token;
      const expiresAt = new Date(Date.now() + (r.expires_in - 30) * 1000).toISOString();
      await admin.from('gw_google_connections').update({ access_token: accessToken, expires_at: expiresAt, last_error: null }).eq('id', conn.id);
    } catch (e) {
      await admin.from('gw_google_connections').update({ last_error: String(e) }).eq('id', conn.id);
      return new Response(JSON.stringify({ error: 'token_refresh_failed', detail: String(e) }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  // Defense in depth — service role bypasses RLS, so we re-impose
  // tenant_id = caller's tenant on every gw_events lookup below.
  const callerTenant = conn.tenant_id;

  // For delete, we don't need the row contents — just the google_event_id.
  if (body.op === 'delete') {
    const { data: row } = await admin
      .from('gw_events')
      .select('google_event_id, tenant_id')
      .eq('id', body.event_id)
      .eq('tenant_id', callerTenant)
      .maybeSingle();
    if (!row) return new Response(JSON.stringify({ error: 'event_not_found_in_tenant' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const gid = row.google_event_id;
    if (!gid) return new Response(JSON.stringify({ ok: true, skipped: 'no_google_event_id' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const del = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(gid)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    // 410 Gone is fine — Google had already removed it.
    if (!del.ok && del.status !== 410) {
      const t = await del.text();
      return new Response(JSON.stringify({ error: 'google_delete_failed', detail: t.slice(0, 300) }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ ok: true, deleted: gid }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // create / update — pull the row contents, scoped to the caller's tenant.
  const { data: row, error: rowErr } = await admin
    .from('gw_events')
    .select('id, tenant_id, title, description, location, venue_name, address, start_date, end_date, google_event_id')
    .eq('id', body.event_id)
    .eq('tenant_id', callerTenant)
    .maybeSingle();
  if (rowErr || !row) {
    return new Response(JSON.stringify({ error: 'event_not_found_in_tenant' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const payload = gwEventToGoogle(row);
  let resp: Response;
  if (body.op === 'update' && row.google_event_id) {
    resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(row.google_event_id)}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } else {
    // create — or update for a row that doesn't yet have a Google id.
    resp = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  if (!resp.ok) {
    const t = await resp.text();
    await admin.from('gw_events').update({ google_push_error: t.slice(0, 300) }).eq('id', row.id);
    return new Response(JSON.stringify({ error: 'google_write_failed', detail: t.slice(0, 300) }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const created = await resp.json() as { id: string; htmlLink?: string };
  await admin.from('gw_events').update({
    google_event_id: created.id,
    google_pushed_at: new Date().toISOString(),
    google_push_error: null,
  }).eq('id', row.id);

  return new Response(JSON.stringify({ ok: true, google_event_id: created.id, html_link: created.htmlLink }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
