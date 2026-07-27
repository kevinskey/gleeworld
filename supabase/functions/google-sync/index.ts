// google-sync — pulls events from every Google calendar the user has
// opted into (gw_google_calendar_subscriptions where is_enabled=true)
// into gw_google_events. Refreshes the access_token if it's expired.
//
// If the user has no subscription rows yet (e.g. first sync after the
// multi-calendar migration but before they've opened the picker), we
// fall back to syncing 'primary' so the experience never regresses.
//
// Strategy: for each enabled calendar, list events in a sensible window
// (now − 14d to now + 90d), upsert by (user_id, google_event_id). Events
// that have moved out of the window stay in the table; events deleted on
// Google's side are flagged via status='cancelled' on the upsert side
// (Google returns them in the list).
//
// Auth: requires the caller's JWT (we only sync the caller's own data).
//
// Requires env vars:
//   GW_GOOGLE_CAL_CLIENT_ID
//   GW_GOOGLE_CAL_CLIENT_SECRET

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { propagateUpdates, propagateDeletes, type PropagatedGoogleEvent } from './propagate.ts';

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

  // Which calendars should we pull? Honor the user's subscription picks.
  // Fall back to 'primary' if they haven't picked anything yet so this
  // function keeps working on first run.
  const { data: subs } = await admin
    .from('gw_google_calendar_subscriptions')
    .select('google_calendar_id')
    .eq('user_id', user.id)
    .eq('is_enabled', true);
  const calendarIds: string[] = (subs && subs.length > 0)
    ? subs.map(s => s.google_calendar_id as string)
    : ['primary'];

  // List events: 14d back → 90d forward.
  const timeMin = new Date(Date.now() - 14 * 86400_000).toISOString();
  const timeMax = new Date(Date.now() + 90 * 86400_000).toISOString();
  const nowIso  = new Date().toISOString();

  let fetched = 0;
  let upserts = 0;
  const perCalErrors: Array<{ calendar: string; detail: string }> = [];
  const seenForPropagation: PropagatedGoogleEvent[] = [];

  for (const calId of calendarIds) {
    const listUrl =
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`
      + `?singleEvents=true&orderBy=startTime&maxResults=250`
      + `&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`;
    const listRes = await fetch(listUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!listRes.ok) {
      perCalErrors.push({ calendar: calId, detail: (await listRes.text()).slice(0, 200) });
      continue;
    }
    const data = await listRes.json() as { items?: GoogleEvent[] };
    const items = data.items ?? [];
    fetched += items.length;

    const rows = items.map((ev) => {
      const startAt = ev.start?.dateTime ?? (ev.start?.date ? ev.start.date + 'T00:00:00Z' : null);
      const endAt   = ev.end?.dateTime   ?? (ev.end?.date   ? ev.end.date   + 'T00:00:00Z' : null);
      return {
        user_id:            user.id,
        tenant_id:          conn.tenant_id,
        google_event_id:    ev.id,
        google_calendar_id: calId,
        title:              ev.summary ?? null,
        description:        ev.description ?? null,
        location:           ev.location ?? null,
        start_at:           startAt,
        end_at:             endAt,
        all_day:            !!ev.start?.date && !ev.start?.dateTime,
        html_link:          ev.htmlLink ?? null,
        recurrence:         ev.recurrence ?? null,
        status:             ev.status ?? null,
        synced_at:          nowIso,
      };
    });

    for (const r of rows) {
      seenForPropagation.push({
        google_event_id: r.google_event_id!,
        title:           r.title,
        description:     r.description,
        location:        r.location,
        start_at:        r.start_at,
        end_at:          r.end_at,
        all_day:         r.all_day,
      });
    }

    if (rows.length) {
      const { error: upErr, count } = await admin
        .from('gw_google_events')
        .upsert(rows, { onConflict: 'user_id,google_event_id', count: 'exact' });
      if (upErr) {
        perCalErrors.push({ calendar: calId, detail: 'upsert_failed: ' + upErr.message });
        continue;
      }
      upserts += count ?? rows.length;
    }
  }

  // Sweep events whose source calendar is no longer enabled OR was
  // removed from Google entirely. We delete rows older than this sync
  // pass whose google_calendar_id isn't in the active set, so the user
  // sees the change immediately on the calendar grid.
  if (calendarIds.length > 0) {
    await admin
      .from('gw_google_events')
      .delete()
      .eq('user_id', user.id)
      .not('google_calendar_id', 'in', `(${calendarIds.map(id => `"${id}"`).join(',')})`);
  }

  // Propagate to any gw_events rows the caller has published via
  // google-event-share. Updates happen first so the row reflects the
  // latest Google state; deletes then wipe rows whose Google source
  // vanished from THIS sync's response.
  await propagateUpdates(admin, user.id, conn.tenant_id, seenForPropagation);
  await propagateDeletes(
    admin,
    user.id,
    conn.tenant_id,
    seenForPropagation.map(e => e.google_event_id),
    { start: timeMin, end: timeMax },
  );

  const lastError = perCalErrors.length
    ? perCalErrors.map(e => `${e.calendar}: ${e.detail}`).join(' | ')
    : null;
  await admin
    .from('gw_google_connections')
    .update({ last_synced_at: nowIso, last_error: lastError })
    .eq('id', conn.id);

  return new Response(JSON.stringify({
    ok: true,
    fetched,
    upserted: upserts,
    calendars: calendarIds,
    errors: perCalErrors,
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
