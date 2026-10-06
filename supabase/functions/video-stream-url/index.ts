// Edge function: hands a signed-in viewer a short-TTL presigned URL for one
// archived video master in DO Spaces (scgc-videos), so the library plays
// WITHOUT YouTube — no sign-in walls, no bot checks (Kevin, 2026-10-05).
//
// Access is NOT re-implemented here: the youtube_videos row is fetched with
// the CALLER's JWT through an anon-key client, so the visibility-aware RLS
// (20261005210000: public / members / shared-via-gw_video_shares, plus
// course enrollment) answers "may this person watch" exactly the way the
// page itself sees the library. Companion of jukebox-track-url — see it and
// video-archive-download for the pattern rationale.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-slug',
};

// Feature films they are not, but rehearsal recordings run long and viewers
// pause: 4h keeps range re-requests alive through an evening watch while a
// copied link still dies the same day.
const TTL_SECONDS = 4 * 60 * 60;

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
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const tenantSlug = req.headers.get('x-tenant-slug') ?? '';

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const videoId = body.videoId ?? new URL(req.url).searchParams.get('videoId');
    if (!videoId) return json({ error: 'Missing videoId' }, 400);

    // The caller's own view of the library: RLS decides, not this function.
    const asCaller = createClient(
      Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader, 'x-tenant-slug': tenantSlug } },
        auth: { persistSession: false },
      },
    );

    const { data: video, error } = await asCaller
      .from('youtube_videos')
      .select('archive_object_key, archive_bucket, archive_region')
      .eq('id', videoId)
      .maybeSingle();
    if (error) {
      console.error('[video-stream-url] video lookup:', error.message);
      return json({ error: 'Lookup failed' }, 500);
    }
    // Not found and not allowed are deliberately the same answer.
    if (!video) {
      console.log(`[video-stream-url] 404 not-visible video=${videoId} tenant=${tenantSlug}`);
      return json({ error: 'Video not found' }, 404);
    }
    if (!video.archive_object_key) {
      console.log(`[video-stream-url] 404 no-archive video=${videoId}`);
      return json({ error: 'No archived file for this video' }, 404);
    }

    const key = Deno.env.get('SPACES_ACCESS_KEY_ID') ?? Deno.env.get('SPACES_KEY') ?? '';
    const secret = Deno.env.get('SPACES_SECRET_ACCESS_KEY') ?? Deno.env.get('SPACES_SECRET') ?? '';
    if (!key || !secret) {
      console.error('[video-stream-url] Spaces credentials not configured');
      return json({ error: 'Storage not configured' }, 500);
    }

    const bucket = video.archive_bucket ?? 'scgc-videos';
    const region = video.archive_region ?? Deno.env.get('SPACES_REGION') ?? 'atl1';

    // Presign against the ORIGIN endpoint; yt-dlp keys carry spaces and
    // square brackets, so each path segment is encoded separately.
    const encodedKey = String(video.archive_object_key).split('/').map(encodeURIComponent).join('/');
    const target = new URL(`https://${bucket}.${region}.digitaloceanspaces.com/${encodedKey}`);
    target.searchParams.set('X-Amz-Expires', String(TTL_SECONDS));
    // Inline, never attachment: the player streams it; downloads stay the
    // admin-only video-archive-download affair.
    target.searchParams.set('response-content-disposition', 'inline');

    const aws = new AwsClient({ accessKeyId: key, secretAccessKey: secret, service: 's3', region });
    const signed = await aws.sign(new Request(target.toString()), { aws: { signQuery: true } });

    console.log(`[video-stream-url] 200 signed video=${videoId} tenant=${tenantSlug}`);
    return json({ url: signed.url, expires_in: TTL_SECONDS });
  } catch (e) {
    console.error('[video-stream-url]', (e as Error).message);
    return json({ error: 'Signing failed' }, 500);
  }
}

Deno.serve(handler);
