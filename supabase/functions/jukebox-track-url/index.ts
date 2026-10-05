// Edge function: hands a signed-in member a short-TTL presigned URL for one
// Jukebox track in DO Spaces.
//
// The audio bucket is private and stays private — Kevin's requirement
// (2026-10-05) is that members cannot download the files, so there is no
// public CDN URL to lift. Every play mints a fresh presigned GET that dies
// on its own, served inline (no attachment disposition, no download
// affordance anywhere in the player).
//
// Authorization is NOT re-implemented here: the track row is fetched with
// the CALLER's JWT through an anon-key client, so the gw_jukebox_tracks RLS
// (admins: everything; members: only tracks in playlists shared with them —
// 20261005150000) answers "may this person stream this track" exactly the
// way the page itself sees the library. x-tenant-slug is forwarded for the
// same reason: tenant context must match the page's.
//
// Returns JSON { url, expires_in } — see video-archive-download for why not
// a 302 (functions.invoke swallows Location).
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-slug',
};

// Long enough for one listening session with seeks (the signature is checked
// per request, and range seeks re-request the same URL); short enough that a
// copied link is dead within the afternoon.
const TTL_SECONDS = 2 * 60 * 60;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

/** bucket / region / key from a stored Spaces URL (origin or CDN host). */
export function parseSpacesUrl(raw: string): { bucket: string; region: string; key: string } | null {
  try {
    const u = new URL(raw);
    // kpj-mp3s.atl1.cdn.digitaloceanspaces.com or kpj-mp3s.atl1.digitaloceanspaces.com
    const m = u.hostname.match(/^([^.]+)\.([^.]+?)(?:\.cdn)?\.digitaloceanspaces\.com$/);
    if (!m) return null;
    return { bucket: m[1], region: m[2], key: decodeURIComponent(u.pathname.replace(/^\//, '')) };
  } catch {
    return null;
  }
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const tenantSlug = req.headers.get('x-tenant-slug') ?? '';

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const trackId = body.trackId ?? new URL(req.url).searchParams.get('trackId');
    if (!trackId) return json({ error: 'Missing trackId' }, 400);

    // The caller's own view of the catalog: RLS decides, not this function.
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const asCaller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader, 'x-tenant-slug': tenantSlug } },
      auth: { persistSession: false },
    });

    const { data: track, error } = await asCaller
      .from('gw_jukebox_tracks')
      .select('audio_url')
      .eq('id', trackId)
      .maybeSingle();
    if (error) {
      console.error('[jukebox-track-url] track lookup:', error.message);
      return json({ error: 'Lookup failed' }, 500);
    }
    // Not found and not allowed are deliberately the same answer.
    if (!track) {
      // Outcome logging (no secrets): distinguishes "RLS hid the row" from
      // signing trouble when a listener reports silence.
      console.log(`[jukebox-track-url] 404 not-visible track=${trackId} tenant=${tenantSlug}`);
      return json({ error: 'Track not found' }, 404);
    }

    const parsed = parseSpacesUrl(String(track.audio_url));
    if (!parsed) {
      console.log(`[jukebox-track-url] 404 unparseable-url track=${trackId}`);
      return json({ error: 'Track has no streamable file' }, 404);
    }

    const key = Deno.env.get('SPACES_ACCESS_KEY_ID') ?? Deno.env.get('SPACES_KEY') ?? '';
    const secret = Deno.env.get('SPACES_SECRET_ACCESS_KEY') ?? Deno.env.get('SPACES_SECRET') ?? '';
    if (!key || !secret) {
      console.error('[jukebox-track-url] Spaces credentials not configured');
      return json({ error: 'Storage not configured' }, 500);
    }

    // Presign against the ORIGIN endpoint — the CDN host doesn't validate
    // SigV4 query signatures. Segments encoded one by one: the keys contain
    // spaces and square brackets, and encodeURIComponent would eat the '/'.
    const encodedKey = parsed.key.split('/').map(encodeURIComponent).join('/');
    const target = new URL(`https://${parsed.bucket}.${parsed.region}.digitaloceanspaces.com/${encodedKey}`);
    target.searchParams.set('X-Amz-Expires', String(TTL_SECONDS));
    // Inline, never attachment: the player streams it; the browser gets no
    // save-as hint.
    target.searchParams.set('response-content-disposition', 'inline');

    const aws = new AwsClient({
      accessKeyId: key, secretAccessKey: secret, service: 's3', region: parsed.region,
    });
    const signed = await aws.sign(new Request(target.toString()), { aws: { signQuery: true } });

    console.log(`[jukebox-track-url] 200 signed track=${trackId} tenant=${tenantSlug}`);
    return json({ url: signed.url, expires_in: TTL_SECONDS });
  } catch (e) {
    console.error('[jukebox-track-url]', (e as Error).message);
    return json({ error: 'Signing failed' }, 500);
  }
}

Deno.serve(handler);
