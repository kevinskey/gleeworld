// youtube-library — read-only YouTube data for the Command Center media
// zone. Rides the EXISTING Google connection row (gw_google_connections):
// google-oauth-start appends youtube.readonly via incremental auth (body
// { feature: 'youtube' }), so there is no separate YouTube connection —
// we just refresh the stored refresh_token and call the YouTube Data API.
//
// Body: { kind: 'status' | 'playlists' | 'playlistItems' | 'liked',
//         playlistId?, pageToken? }
//
// Error philosophy: this powers a dashboard panel, so "not connected" and
// "connected but no YouTube scope" are NORMAL states, not server errors.
// They come back as 200s with shapes the client can branch on
// ({ connected:false } / { error:'youtube_scope_missing' }) instead of
// 4xx/5xx that would trip react-query's retry/error machinery.
//
// Tokens (access or refresh) must never appear in responses or logs —
// every Google error we surface is truncated body text from Google, which
// never echoes credentials.
//
// Requires env vars (same pair the calendar functions use):
//   GW_GOOGLE_CAL_CLIENT_ID
//   GW_GOOGLE_CAL_CLIENT_SECRET

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Same refresh idiom as google-sync — POST the stored refresh_token to
// Google's token endpoint and get a short-lived access_token back.
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

// Google returns a ladder of thumbnail sizes; medium (320px) is the sweet
// spot for our card grid — big enough to look crisp, small enough to not
// waste bandwidth on a 25-item list.
interface Thumbs {
  medium?: { url?: string };
  high?: { url?: string };
  default?: { url?: string };
  standard?: { url?: string };
}
function bestThumb(t: Thumbs | undefined): string | null {
  return t?.medium?.url ?? t?.high?.url ?? t?.standard?.url ?? t?.default?.url ?? null;
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

  // Same JWT-verification idiom as google-sync: the service-role client
  // validates the caller's token so we only ever touch the caller's row.
  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  const { data: { user } } = await admin.auth.getUser(jwt);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  let body: { kind?: string; playlistId?: string; pageToken?: string } = {};
  try { body = await req.json(); } catch { /* fall through to kind check */ }
  const kind = body.kind;
  if (!kind || !['status', 'playlists', 'playlistItems', 'liked'].includes(kind)) {
    return json({ error: 'bad_kind' }, 400);
  }

  const { data: conn } = await admin
    .from('gw_google_connections')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  const connected = !!conn?.refresh_token;
  // The callback stores Google's granted-scope string verbatim; incremental
  // auth means it grows to include youtube.readonly once the user re-consents.
  const hasYouTubeScope = connected && typeof conn?.scope === 'string'
    && conn.scope.includes('youtube.readonly');

  if (kind === 'status') {
    return json({ connected, hasYouTubeScope });
  }

  // No connection at all → let the client show the Connect CTA rather than
  // treating this as a failure.
  if (!conn || !connected) {
    return json({ connected: false, items: [] });
  }

  // Ensure a fresh access_token (same expiry dance as google-sync — the
  // 30s cushion in expires_at was applied when the token was stored).
  let accessToken = conn.access_token as string | null;
  const expired = !accessToken || !conn.expires_at || new Date(conn.expires_at) < new Date();
  if (expired) {
    try {
      const r = await refreshAccessToken(conn.refresh_token, clientId, clientSecret);
      accessToken = r.access_token;
      const expiresAt = new Date(Date.now() + (r.expires_in - 30) * 1000).toISOString();
      await admin.from('gw_google_connections').update({ access_token: accessToken, expires_at: expiresAt, last_error: null }).eq('id', conn.id);
    } catch (e) {
      // Refresh failure usually means the user revoked access in their
      // Google account — treat like scope-missing so the client offers
      // the Connect flow again. String(e) only carries Google's error
      // body slice, never our credentials.
      await admin.from('gw_google_connections').update({ last_error: String(e) }).eq('id', conn.id);
      return json({ error: 'youtube_scope_missing' });
    }
  }

  // Build the YouTube Data API request per kind. All three list kinds
  // normalize to { items, nextPageToken? } so the panel renders them with
  // one code path.
  let apiUrl: string;
  if (kind === 'playlists') {
    const p = new URLSearchParams({ part: 'snippet,contentDetails', mine: 'true', maxResults: '50' });
    if (body.pageToken) p.set('pageToken', body.pageToken);
    apiUrl = 'https://www.googleapis.com/youtube/v3/playlists?' + p.toString();
  } else if (kind === 'playlistItems') {
    if (!body.playlistId) return json({ error: 'playlistId required' }, 400);
    const p = new URLSearchParams({ part: 'snippet,contentDetails', playlistId: body.playlistId, maxResults: '25' });
    if (body.pageToken) p.set('pageToken', body.pageToken);
    apiUrl = 'https://www.googleapis.com/youtube/v3/playlistItems?' + p.toString();
  } else {
    // kind === 'liked' — the videos endpoint with myRating=like returns the
    // caller's Liked Videos without needing the special LL playlist id.
    const p = new URLSearchParams({ part: 'snippet', myRating: 'like', maxResults: '25' });
    if (body.pageToken) p.set('pageToken', body.pageToken);
    apiUrl = 'https://www.googleapis.com/youtube/v3/videos?' + p.toString();
  }

  const ytRes = await fetch(apiUrl, { headers: { Authorization: `Bearer ${accessToken}` } });

  // 401/403 straight after a fresh token exchange means the token is fine
  // but the grant lacks youtube.readonly (user connected calendar before
  // the media zone existed). 200 + sentinel error so the client shows the
  // "Connect YouTube" upgrade CTA instead of an error toast.
  if (ytRes.status === 401 || ytRes.status === 403) {
    return json({ error: 'youtube_scope_missing' });
  }
  if (!ytRes.ok) {
    const detail = (await ytRes.text()).slice(0, 300);
    return json({ error: 'youtube_api_error', detail }, 502);
  }

  // deno-lint-ignore no-explicit-any — Google's list envelope; we pluck
  // only the fields we normalize below.
  const data = await ytRes.json() as { items?: any[]; nextPageToken?: string };
  const raw = data.items ?? [];

  if (kind === 'playlists') {
    const items = raw.map((pl) => ({
      id: pl.id as string,
      title: pl.snippet?.title ?? '',
      thumb: bestThumb(pl.snippet?.thumbnails),
      count: pl.contentDetails?.itemCount ?? 0,
    }));
    return json({ items, ...(data.nextPageToken ? { nextPageToken: data.nextPageToken } : {}) });
  }

  if (kind === 'playlistItems') {
    const items = raw
      // Private/deleted videos still occupy playlist slots; YouTube marks
      // them only via these magic snippet titles. Hide them — they have no
      // thumbnail and their videoId 404s in the player.
      .filter((it) => it.snippet?.title !== 'Private video' && it.snippet?.title !== 'Deleted video')
      .map((it) => ({
        videoId: it.contentDetails?.videoId ?? it.snippet?.resourceId?.videoId ?? '',
        title: it.snippet?.title ?? '',
        thumb: bestThumb(it.snippet?.thumbnails),
        // videoOwnerChannelTitle is the uploader; snippet.channelTitle on a
        // playlistItem is the PLAYLIST owner's channel, which is misleading.
        channel: it.snippet?.videoOwnerChannelTitle ?? it.snippet?.channelTitle ?? '',
        publishedAt: it.contentDetails?.videoPublishedAt ?? it.snippet?.publishedAt ?? null,
      }))
      .filter((it) => it.videoId);
    return json({ items, ...(data.nextPageToken ? { nextPageToken: data.nextPageToken } : {}) });
  }

  // kind === 'liked' — /videos items ARE videos, so id is the videoId and
  // channelTitle is the uploader.
  const items = raw.map((v) => ({
    videoId: v.id as string,
    title: v.snippet?.title ?? '',
    thumb: bestThumb(v.snippet?.thumbnails),
    channel: v.snippet?.channelTitle ?? '',
    publishedAt: v.snippet?.publishedAt ?? null,
  }));
  return json({ items, ...(data.nextPageToken ? { nextPageToken: data.nextPageToken } : {}) });
});
