// google-list-calendars — refreshes the caller's gw_google_calendar_subscriptions
// from Google's calendarList endpoint.
//
// Called from the Sync tab whenever the user opens the picker so the list
// reflects calendars they've added/removed in Google since they connected.
//
// New rows default is_enabled=true for the user's primary calendar and
// false for everything else, so secondary calendars stay opted-out until
// the user picks them.
//
// Requires env vars (shared with google-sync):
//   GW_GOOGLE_CAL_CLIENT_ID
//   GW_GOOGLE_CAL_CLIENT_SECRET

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CalListEntry {
  id: string;
  summary?: string;
  description?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  accessRole?: string;
  primary?: boolean;
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
    return json({ error: 'Google OAuth secrets not configured.' }, 503);
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  const { data: { user } } = await admin.auth.getUser(jwt);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const { data: conn } = await admin
    .from('gw_google_connections')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!conn) return json({ error: 'Not connected' }, 404);

  // Ensure a fresh access_token (same flow as google-sync).
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
      return json({ error: 'token_refresh_failed', detail: String(e) }, 502);
    }
  }

  const listRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!listRes.ok) {
    const t = await listRes.text();
    await admin.from('gw_google_connections').update({ last_error: 'calendarList_failed: ' + t.slice(0, 200) }).eq('id', conn.id);
    return json({ error: 'calendarList_failed', detail: t.slice(0, 200) }, 502);
  }
  const data = await listRes.json() as { items?: CalListEntry[] };
  const items = data.items ?? [];

  // Read existing rows so we can preserve is_enabled when a calendar is
  // already known. Re-listing must not silently un-check a user's choice.
  const { data: existing } = await admin
    .from('gw_google_calendar_subscriptions')
    .select('google_calendar_id, is_enabled')
    .eq('user_id', user.id);
  const enabledMap = new Map<string, boolean>(
    (existing ?? []).map(r => [r.google_calendar_id as string, r.is_enabled as boolean])
  );

  const now = new Date().toISOString();
  const rows = items.map((it) => ({
    user_id:            user.id,
    tenant_id:          conn.tenant_id,
    google_calendar_id: it.id,
    summary:            it.summary ?? null,
    description:        it.description ?? null,
    background_color:   it.backgroundColor ?? null,
    foreground_color:   it.foregroundColor ?? null,
    access_role:        it.accessRole ?? null,
    is_primary:         !!it.primary,
    // Preserve user's choice if we've seen this calendar before. Otherwise
    // default the primary on and the rest off.
    is_enabled:         enabledMap.has(it.id) ? enabledMap.get(it.id)! : !!it.primary,
    last_listed_at:     now,
  }));

  if (rows.length) {
    const { error } = await admin
      .from('gw_google_calendar_subscriptions')
      .upsert(rows, { onConflict: 'user_id,google_calendar_id' });
    if (error) {
      return json({ error: 'upsert_failed', detail: error.message }, 500);
    }
  }

  return json({ ok: true, found: items.length, subscriptions: rows }, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
