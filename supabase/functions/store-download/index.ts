// Edge function: serves a purchased digital item as a short-TTL presigned
// DO Spaces URL. Never a permanent public link — every hit re-validates the
// entitlement (found by opaque `download_token`, not guessable) and its
// expiry, then mints a fresh presigned URL good for a few minutes. Also
// records download evidence (count, timestamp, requesting IP) for dispute
// defense, per Task 6 of the Commerce Core plan.
//
// NOTE (test seam): same pattern as store-checkout/index.ts — the handler
// body is a named, exported `handler(req)` so `logic_test.ts` can invoke it
// directly against a constructed `Request` with `globalThis.fetch` stubbed,
// instead of standing up a real HTTP listener or hitting real DO Spaces.
// `Deno.serve(handler)` at the bottom keeps this file directly deployable,
// identical in behavior to the brief's inline `Deno.serve(async (req) => ...)`.
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000';
const SRK = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

function spacesConfig() {
  return {
    key: Deno.env.get('SPACES_KEY') ?? '',
    secret: Deno.env.get('SPACES_SECRET') ?? '',
    bucket: Deno.env.get('SPACES_BUCKET') ?? '',
    region: Deno.env.get('SPACES_REGION') ?? 'nyc3',
  };
}

async function pg(path: string, init?: RequestInit) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SRK,
      Authorization: `Bearer ${SRK}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`pg ${path} ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

export async function handler(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    if (!token) return new Response('missing token', { status: 400 });

    const rows = await pg(
      `gw_store_entitlements?download_token=eq.${encodeURIComponent(token)}&select=id,product_id,expires_at,download_count`,
    );
    const ent = Array.isArray(rows) && rows[0];
    if (!ent) return new Response('invalid', { status: 403 });
    if (ent.expires_at && new Date(ent.expires_at) < new Date()) return new Response('expired', { status: 403 });

    const prodRows = await pg(`gw_products?id=eq.${encodeURIComponent(ent.product_id)}&select=digital_object_key`);
    const prod = Array.isArray(prodRows) && prodRows[0];
    if (!prod?.digital_object_key) return new Response('no file', { status: 404 });

    const SPACES = spacesConfig();
    const ttl = 300; // 5 min short-TTL presigned link — never a permanent public URL
    const endpoint = `https://${SPACES.bucket}.${SPACES.region}.digitaloceanspaces.com/${prod.digital_object_key}`;
    const aws = new AwsClient({ accessKeyId: SPACES.key, secretAccessKey: SPACES.secret, service: 's3', region: SPACES.region });
    const signed = await aws.sign(new Request(`${endpoint}?X-Amz-Expires=${ttl}`), { aws: { signQuery: true } });

    const ip = req.headers.get('x-forwarded-for') ?? '';
    // Fire-and-record download evidence before redirecting; a failure here
    // must not block delivery of an item the buyer already paid for.
    await pg(`gw_store_entitlements?id=eq.${ent.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        download_count: (ent.download_count ?? 0) + 1,
        last_downloaded_at: new Date().toISOString(),
        last_download_ip: ip,
      }),
    });

    return Response.redirect(signed.url, 302);
  } catch (e) {
    console.error('[store-download]', (e as Error).message);
    return new Response('download failed', { status: 500 });
  }
}

Deno.serve(handler);
