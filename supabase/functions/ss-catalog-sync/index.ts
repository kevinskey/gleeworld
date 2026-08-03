// Edge function: sync S&S Activewear /v2/styles into gw_merch_products.
//
// Ported from tshirtbrothers/server/services/ssActivewear.js. Runs under
// the caller's JWT so RLS + current_tenant_id() scope the upserts to the
// admin's tenant. Secrets SS_ACCOUNT_NUMBER + SS_API_KEY must be set on
// the gleeworld self-hosted Supabase (`supabase secrets set …`).
//
// Invocation contract: POST /functions/v1/ss-catalog-sync
//   body:  { limit?: number }   // default 500 styles
//   200:   { upserted: number, total: number }
//   4xx:   { error: string }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000';
const ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SS_ACCOUNT   = Deno.env.get('SS_ACCOUNT_NUMBER') ?? '';
const SS_API_KEY   = Deno.env.get('SS_API_KEY') ?? '';

const STYLES_URL   = 'https://api.ssactivewear.com/v2/styles/';
const SS_IMAGE_BASE = 'https://www.ssactivewear.com/';

function ssAuthHeader(): string {
  const raw = `${SS_ACCOUNT}:${SS_API_KEY}`;
  return 'Basic ' + btoa(raw);
}

function toFullImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return SS_IMAGE_BASE + path;
}

interface RawStyle {
  styleID?: number | string;
  sku?: string;
  id?: string;
  title?: string;
  styleName?: string;
  name?: string;
  brandName?: string;
  brand?: string;
  baseCategory?: string;
  categoryName?: string;
  category?: string;
  partNumber?: string;
  basePrice?: number | string;
  customerPrice?: number | string;
  price?: number | string;
  styleImage?: string;
  mainImage?: string;
  imageUrl?: string;
  styleColors?: Array<{ colorName?: string; name?: string; hex1?: string; hex?: string; colorFrontImage?: string; image?: string }>;
  styleSizes?: Array<{ sizeName?: string; name?: string } | string>;
  description?: string;
  material?: string;
  weight?: string;
}

interface ProductRow {
  tb_product_id: string;
  name: string;
  category: string;
  base_cost: number;
  variants: { sizes: string[]; colors: string[] };
  print_areas: Record<string, unknown>;
  cover_image: string | null;
  is_active: boolean;
  synced_at: string;
}

function transformStyle(raw: RawStyle): ProductRow | null {
  const id = String(raw.styleID ?? raw.sku ?? raw.id ?? '').trim();
  if (!id) return null;
  const name = (raw.title || raw.styleName || raw.name || '').trim();
  if (!name) return null;
  const sizes = Array.isArray(raw.styleSizes)
    ? raw.styleSizes
        .map((s) => (typeof s === 'string' ? s : (s?.sizeName ?? s?.name ?? '')))
        .filter(Boolean) as string[]
    : [];
  const colors = Array.isArray(raw.styleColors)
    ? raw.styleColors.map((c) => (c.colorName || c.name || '').trim()).filter(Boolean)
    : [];
  const cover = toFullImageUrl(raw.styleImage || raw.mainImage || raw.imageUrl);
  const category = (raw.baseCategory || raw.categoryName || raw.category || 'apparel').toLowerCase();
  const base = parseFloat(String(raw.basePrice ?? raw.customerPrice ?? raw.price ?? 0));

  return {
    tb_product_id: id,
    name,
    category,
    base_cost: Number.isFinite(base) ? base : 0,
    variants: { sizes, colors },
    print_areas: {},
    cover_image: cover,
    is_active: true,
    synced_at: new Date().toISOString(),
  };
}

async function fetchAllStyles(): Promise<RawStyle[]> {
  const res = await fetch(STYLES_URL, {
    headers: { Authorization: ssAuthHeader(), Accept: 'application/json' },
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`S&S ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? (data as RawStyle[]) : [];
}

async function upsertBlanks(rows: ProductRow[], jwt: string): Promise<number> {
  if (rows.length === 0) return 0;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/gw_merch_products?on_conflict=tenant_id,tb_product_id`,
    {
      method: 'POST',
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(rows),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`PostgREST upsert: ${res.status} ${body.slice(0, 300)}`);
  }
  return rows.length;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt) {
    return new Response(JSON.stringify({ error: 'Missing bearer token' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!SS_ACCOUNT || !SS_API_KEY) {
    return new Response(JSON.stringify({ error: 'SS_ACCOUNT_NUMBER/SS_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { limit?: number } = {};
  try { body = await req.json(); } catch { /* empty body ok */ }
  const limit = Math.min(Math.max(body.limit ?? 500, 1), 5000);

  try {
    const styles = await fetchAllStyles();
    const rows = styles.slice(0, limit).map(transformStyle).filter(Boolean) as ProductRow[];
    const upserted = await upsertBlanks(rows, jwt);
    return new Response(JSON.stringify({ upserted, total: styles.length }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
