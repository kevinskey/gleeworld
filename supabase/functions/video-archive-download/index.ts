// Edge function: hands an admin a short-TTL presigned URL for a library
// video's archived master in DO Spaces.
//
// The archive bucket (scgc-videos) is private and stays private — we never
// flip an object to public-read. Every download mints a fresh 5-minute
// presigned GET, so a leaked link dies on its own.
//
// Access is admin-only, enforced HERE with the service-role client rather
// than relying on the caller's RLS: the presigned URL bypasses Postgres
// entirely once issued, so the check cannot live in a policy.
//
// Returns JSON `{ url, filename, size_bytes }` instead of a 302 because the
// caller reaches this through supabase.functions.invoke(), which follows
// redirects internally and would swallow the Location header. The browser
// does the actual navigation.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 5 minutes: long enough to start a 1.9 GB transfer (the signature is
// checked at request time, not for the transfer's duration), short enough
// that a copied URL is useless by the time it's pasted anywhere.
const TTL_SECONDS = 300;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return json({ error: 'Unauthorized' }, 401);

    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const { data: profile } = await admin
      .from('gw_profiles')
      .select('is_admin, is_super_admin')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile?.is_admin && !profile?.is_super_admin) {
      return json({ error: 'Admin access required' }, 403);
    }

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const videoId = body.videoId ?? new URL(req.url).searchParams.get('videoId');
    if (!videoId) return json({ error: 'Missing videoId' }, 400);

    const { data: video } = await admin
      .from('youtube_videos')
      .select('title, archive_object_key, archive_bucket, archive_region, archive_size_bytes')
      .eq('id', videoId)
      .maybeSingle();

    if (!video) return json({ error: 'Video not found' }, 404);
    if (!video.archive_object_key) return json({ error: 'No archived file for this video' }, 404);

    const key = Deno.env.get('SPACES_ACCESS_KEY_ID') ?? Deno.env.get('SPACES_KEY') ?? '';
    const secret = Deno.env.get('SPACES_SECRET_ACCESS_KEY') ?? Deno.env.get('SPACES_SECRET') ?? '';
    if (!key || !secret) {
      console.error('[video-archive-download] Spaces credentials not configured');
      return json({ error: 'Storage not configured' }, 500);
    }

    const bucket = video.archive_bucket ?? Deno.env.get('SPACES_BUCKET') ?? '';
    const region = video.archive_region ?? Deno.env.get('SPACES_REGION') ?? 'nyc3';

    // Serve under a clean filename rather than the yt-dlp key, which carries
    // the upload date and the bracketed YouTube id.
    const filename = `${String(video.title).replace(/[^\w\s.-]/g, '').trim().replace(/\s+/g, '_') || 'video'}.mp4`;

    // Each path segment is encoded separately — the keys contain spaces and
    // square brackets, and encodeURIComponent would eat the '/' separators.
    const encodedKey = String(video.archive_object_key).split('/').map(encodeURIComponent).join('/');

    // response-content-disposition must be part of the signed query string,
    // not appended afterwards, or Spaces rejects the signature.
    const target = new URL(`https://${bucket}.${region}.digitaloceanspaces.com/${encodedKey}`);
    target.searchParams.set('X-Amz-Expires', String(TTL_SECONDS));
    target.searchParams.set('response-content-disposition', `attachment; filename="${filename}"`);

    const aws = new AwsClient({ accessKeyId: key, secretAccessKey: secret, service: 's3', region });
    const signed = await aws.sign(new Request(target.toString()), { aws: { signQuery: true } });

    return json({
      url: signed.url,
      filename,
      size_bytes: video.archive_size_bytes ?? null,
      expires_in: TTL_SECONDS,
    });
  } catch (e) {
    console.error('[video-archive-download]', (e as Error).message);
    return json({ error: 'Download failed' }, 500);
  }
}

Deno.serve(handler);
