// Edge function: mints a short-TTL presigned GET for one Jukebox track.
//
// The audio bucket (kpj-mp3s/soundcloud-backup/) is private — objects are
// never public-read. The player calls here per track and streams from the
// signed URL.
//
// Access control is NOT re-implemented here: the track is selected with the
// CALLER'S own JWT against the anon key, so RLS (gw_jukebox_track_visible —
// admin, or track is in a playlist shared with them) decides. If the select
// returns no row, the caller gets a 403 and nothing is signed. Pattern and
// rationale otherwise follow video-archive-download.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-tenant-slug, x-tenant-db',
};

// 4 hours: the signature is checked when the browser (re)requests ranges,
// so the TTL must survive a listening session with pauses and seeks — but a
// leaked link still dies the same afternoon.
const TTL_SECONDS = 4 * 3600;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.replace('Bearer ', '')) return json({ error: 'Unauthorized' }, 401);

    const forwarded: Record<string, string> = { Authorization: authHeader };
    // Tenant resolution on the self-hosted stack rides these headers.
    for (const h of ['x-tenant-slug', 'x-tenant-db']) {
      const v = req.headers.get(h);
      if (v) forwarded[h] = v;
    }

    const asCaller = createClient(
      Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: forwarded }, auth: { persistSession: false } },
    );

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const trackId = body.trackId ?? new URL(req.url).searchParams.get('trackId');
    if (!trackId) return json({ error: 'Missing trackId' }, 400);

    const { data: track, error } = await asCaller
      .from('gw_jukebox_tracks')
      .select('id, audio_url')
      .eq('id', trackId)
      .maybeSingle();
    if (error) {
      console.error('[jukebox-track-url] select failed:', error.message);
      return json({ error: 'Lookup failed' }, 500);
    }
    // RLS returns zero rows for both "no such track" and "not shared with
    // you" — deliberately indistinguishable.
    if (!track) return json({ error: 'Not available' }, 403);

    const key = Deno.env.get('SPACES_ACCESS_KEY_ID') ?? Deno.env.get('SPACES_KEY') ?? '';
    const secret = Deno.env.get('SPACES_SECRET_ACCESS_KEY') ?? Deno.env.get('SPACES_SECRET') ?? '';
    if (!key || !secret) {
      console.error('[jukebox-track-url] Spaces credentials not configured');
      return json({ error: 'Storage not configured' }, 500);
    }

    // Stored URLs look like
    // https://<bucket>.<region>.cdn.digitaloceanspaces.com/<encoded key>.
    // Presigning happens against the origin endpoint (no .cdn.); the path is
    // already percent-encoded in the row, so it is reused verbatim.
    const stored = new URL(String(track.audio_url));
    const [bucket, region] = stored.hostname.split('.');
    if (!bucket || !region || !stored.hostname.endsWith('.digitaloceanspaces.com')) {
      console.error('[jukebox-track-url] unexpected audio_url host:', stored.hostname);
      return json({ error: 'Bad track URL' }, 500);
    }

    const target = new URL(`https://${bucket}.${region}.digitaloceanspaces.com${stored.pathname}`);
    target.searchParams.set('X-Amz-Expires', String(TTL_SECONDS));

    const aws = new AwsClient({ accessKeyId: key, secretAccessKey: secret, service: 's3', region });
    const signed = await aws.sign(new Request(target.toString()), { aws: { signQuery: true } });

    return json({ url: signed.url, expires_in: TTL_SECONDS });
  } catch (e) {
    console.error('[jukebox-track-url]', (e as Error).message);
    return json({ error: 'Signing failed' }, 500);
  }
}

Deno.serve(handler);
