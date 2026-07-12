import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyJwtClaims } from '../_shared/verifyJwt.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface FeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  sourceIcon: string;
  imageUrl: string | null;
}

function extractText(xml: string, tag: string): string {
  const cdataRegex = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i');
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim().replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1') : '';
}

function extractImageFromContent(content: string): string | null {
  const mediaMatch = content.match(/url=["']([^"']+\.(?:jpg|jpeg|png|webp|gif)[^"']*)/i);
  if (mediaMatch) return mediaMatch[1];
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch) return imgMatch[1];
  const enclosureMatch = content.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image/i);
  if (enclosureMatch) return enclosureMatch[1];
  return null;
}

function parseRSSItems(xml: string, source: string, sourceIcon: string, maxItems: number, descLen = 150): FeedItem[] {
  const items: FeedItem[] = [];
  const isAtom = xml.includes('<feed') && xml.includes('xmlns="http://www.w3.org/2005/Atom"');

  if (isAtom) {
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
    let entryMatch;
    while ((entryMatch = entryRegex.exec(xml)) !== null && items.length < maxItems) {
      const entry = entryMatch[1];
      const title = extractText(entry, 'title');
      const linkMatch = entry.match(/<link[^>]+href=["']([^"']+)["']/);
      const link = linkMatch ? linkMatch[1] : '';
      const published = extractText(entry, 'published') || extractText(entry, 'updated');
      const videoIdMatch = entry.match(/<yt:videoId>([^<]+)/);
      const imageUrl = videoIdMatch ? `https://img.youtube.com/vi/${videoIdMatch[1]}/mqdefault.jpg` : null;
      if (title && link) {
        items.push({
          title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
          link, description: '', pubDate: published, source, sourceIcon, imageUrl,
        });
      }
    }
  } else {
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let itemMatch;
    while ((itemMatch = itemRegex.exec(xml)) !== null && items.length < maxItems) {
      const item = itemMatch[1];
      const title = extractText(item, 'title');
      const link = extractText(item, 'link') || item.match(/<link>([^<]+)/)?.[1] || '';
      const description = extractText(item, 'description');
      const pubDate = extractText(item, 'pubDate') || extractText(item, 'dc:date');
      const imageUrl = extractImageFromContent(item);
      if (title && link) {
        items.push({
          title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
          link: link.trim(),
          description: description.replace(/<[^>]+>/g, '').substring(0, descLen),
          pubDate, source, sourceIcon, imageUrl,
        });
      }
    }
  }
  return items;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // Load settings
    const { data: settingsData } = await sb.from('gw_feed_settings').select('*').eq('feed_type', 'news').single();
    if (settingsData && !settingsData.is_enabled) {
      return new Response(JSON.stringify({ success: true, items: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const maxTotal = settingsData?.max_total_items ?? 25;

    // Per-tenant sources. A tenant that has configured ANY news sources in
    // Feed Control owns its list (only its active rows are fetched); a
    // tenant with no rows — and callers with no tenant — get the platform
    // defaults (tenant_id IS NULL, seeded by migration; invisible to
    // clients because of tenant RLS, hence resolved here with service role).
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const tenantSlug = typeof body?.tenant === 'string' && body.tenant ? body.tenant : null;
    // Paged mode (offset/limit present) powers the rail's infinite scroll;
    // legacy callers (no offset/limit) keep the original slice(0, maxTotal).
    const paged = Number.isFinite(Number(body?.offset)) || Number.isFinite(Number(body?.limit));
    const offset = Math.max(0, Math.trunc(Number(body?.offset)) || 0);
    const limit = Math.min(150, Math.max(1, Math.trunc(Number(body?.limit)) || 15));

    // Degrade, don't die: any failure while resolving WHICH sources to use
    // falls back toward the platform defaults; only "nothing servable at
    // all" becomes an error response. (An earlier revision threw on every
    // query error, which turned transient DB blips into rail-wide 500s.)
    let tenantId: string | null = null;
    if (tenantSlug) {
      const { data: t, error: tErr } = await sb.from('gw_tenants').select('id').eq('slug', tenantSlug).maybeSingle();
      if (tErr) console.error('tenant lookup failed, using defaults:', tErr.message);
      tenantId = t?.id ?? null;
    } else if (paged) {
      // New-protocol callers only: when the page declares no tenant, use the
      // signed-in caller's own tenant so personal Feed Control sources follow
      // the user. Signature-verified via GoTrue (the functions gateway runs
      // VERIFY_JWT=false, so a bare payload decode would honor forged
      // tenant_id claims). Legacy no-body callers keep platform defaults.
      const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
      const claims = await verifyJwtClaims(token);
      tenantId = typeof claims?.tenant_id === 'string' && claims.tenant_id ? claims.tenant_id : null;
    }

    const loadDefaults = async () => {
      const { data, error } = await sb.from('gw_feed_sources').select('*')
        .eq('feed_type', 'news').eq('is_active', true).is('tenant_id', null).order('display_order');
      if (error) throw new Error(`default sources query failed: ${error.message}`);
      return data ?? [];
    };

    let feedSources: any[] = [];
    if (tenantId) {
      const { data: tenantRows, error: sErr } = await sb.from('gw_feed_sources').select('*')
        .eq('feed_type', 'news').eq('tenant_id', tenantId).order('display_order');
      if (sErr) console.error('tenant sources query failed, using defaults:', sErr.message);
      // A tenant owns its list only when it has ACTIVE rows; rows that are
      // all toggled off fall back to defaults rather than an empty rail.
      const activeTenantRows = (tenantRows ?? []).filter((r: any) => r.is_active);
      feedSources = activeTenantRows.length > 0 ? activeTenantRows : await loadDefaults();
    } else {
      feedSources = await loadDefaults();
    }

    if (feedSources.length === 0) {
      return new Response(JSON.stringify({ success: true, items: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const feedPromises = feedSources.map(async (feed: any) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), feed.timeout_ms || 8000);
        const response = await fetch(feed.url, {
          headers: { 'User-Agent': 'GleeWorld News Reader/1.0', 'Accept': 'application/rss+xml, application/xml, text/xml, */*' },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!response.ok) { console.warn(`Failed to fetch ${feed.name}: ${response.status}`); return []; }
        const xml = await response.text();
        // Paged mode parses deeper per source (×4) so scrolling has a real
        // pool to page through while keeping the configured source mix, and
        // carries longer summaries for the reader sheet. Legacy callers keep
        // the original 150-char description contract.
        const perSource = (feed.max_items_per_source || 5) * (paged ? 4 : 1);
        return parseRSSItems(xml, feed.name, feed.icon, perSource, paged ? 400 : 150);
      } catch (err) { console.warn(`Error fetching ${feed.name}:`, err); return []; }
    });

    const results = await Promise.all(feedPromises);
    const allItems = results.flat();
    allItems.sort((a, b) => {
      const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return dateB - dateA;
    });

    if (paged) {
      // Honor the admin's max_total_items in spirit: paged depth is 4× the
      // legacy cap, mirroring the 4× parse depth.
      const pool = allItems.slice(0, maxTotal * 4);
      const pageItems = pool.slice(offset, offset + limit);
      return new Response(JSON.stringify({
        success: true,
        items: pageItems,
        total: pool.length,
        hasMore: offset + limit < pool.length,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ success: true, items: allItems.slice(0, maxTotal) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in fetch-news-feeds:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
