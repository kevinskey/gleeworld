// google-sync — pulls events from the caller's Google primary calendar
// into gw_google_events. Refreshes the access_token if it's expired.
//
// Strategy: list events in a sensible time window (now − 14d to now + 90d),
// upsert by (user_id, google_event_id). Events that have moved out of the
// window stay in the table; events deleted on Google's side are flagged via
// status='cancelled' on the upsert side (Google returns them in the list).
//
// Auth: requires the caller's JWT (we only sync the caller's own data).
//
// Requires env vars:
//   GW_GOOGLE_CAL_CLIENT_ID
//   GW_GOOGLE_CAL_CLIENT_SECRET

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoogleEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  status?: string;
  recurrence?: string[];
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?:   { dateTime?: string; date?: string; timeZone?: string };
}

async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error('refresh_failed: ' + (await res.text()).slice(0, 200));
  return await res.json() as { access_token: string; expires_in: number };
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
  if (!conn) return new Response(JSON.stringify({ error: 'Not connected' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

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

  // List events: 14d back → 90d forward.
  const timeMin = new Date(Date.now() - 14 * 86400_000).toISOString();
  const timeMax = new Date(Date.now() + 90 * 86400_000).toISOString();
  const listUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&maxResults=250&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`;

  const listRes = await fetch(listUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!listRes.ok) {
    const t = await listRes.text();
    await admin.from('gw_google_connections').update({ last_error: 'list_failed: ' + t.slice(0, 200) }).eq('id', conn.id);
    return new Response(JSON.stringify({ error: 'list_failed', detail: t.slice(0, 200) }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const data = await listRes.json() as { items?: GoogleEvent[] };
  const items = data.items ?? [];

  // Map → DB rows.
  const rows = items.map((ev) => {
    const startAt = ev.start?.dateTime ?? (ev.start?.date ? ev.start.date + 'T00:00:00Z' : null);
    const endAt   = ev.end?.dateTime   ?? (ev.end?.date   ? ev.end.date   + 'T00:00:00Z' : null);
    return {
      user_id:            user.id,
      tenant_id:          conn.tenant_id,
      google_event_id:    ev.id,
      google_calendar_id: 'primary',
      title:              ev.summary ?? null,
      description:        ev.description ?? null,
      location:           ev.location ?? null,
      start_at:           startAt,
      end_at:             endAt,
      all_day:            !!ev.start?.date && !ev.start?.dateTime,
      html_link:          ev.htmlLink ?? null,
      recurrence:         ev.recurrence ?? null,
      status:             ev.status ?? null,
      synced_at:          new Date().toISOString(),
    };
  });

  let upserts = 0;
  if (rows.length) {
    const { error: upErr, count } = await admin
      .from('gw_google_events')
      .upsert(rows, { onConflict: 'user_id,google_event_id', count: 'exact' });
    if (upErr) {
      await admin.from('gw_google_connections').update({ last_error: 'upsert_failed: ' + upErr.message }).eq('id', conn.id);
      return new Response(JSON.stringify({ error: 'upsert_failed', detail: upErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    upserts = count ?? rows.length;
  }

  await admin.from('gw_google_connections').update({ last_synced_at: new Date().toISOString(), last_error: null }).eq('id', conn.id);

  return new Response(JSON.stringify({ ok: true, fetched: items.length, upserted: upserts }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
