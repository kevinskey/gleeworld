import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

function parseRSSItems(xml: string, source: string, sourceIcon: string, maxItems: number): FeedItem[] {
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
      if (title && link) {
        items.push({
          title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
          link, description: '', pubDate: published, source, sourceIcon, imageUrl: null,
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
          description: description.replace(/<[^>]+>/g, '').substring(0, 150),
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
    const { data: settingsData } = await sb.from('gw_feed_settings').select('*').eq('feed_type', 'scholarship').single();
    if (settingsData && !settingsData.is_enabled) {
      return new Response(JSON.stringify({ success: true, items: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const maxTotal = settingsData?.max_total_items ?? 25;

    // Load active sources from DB
    const { data: dbSources } = await sb.from('gw_feed_sources').select('*').eq('feed_type', 'scholarship').eq('is_active', true).order('display_order');
    const feedSources = dbSources || [];

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
          headers: { 'User-Agent': 'GleeWorld Scholarship Reader/1.0', 'Accept': 'application/rss+xml, application/xml, text/xml, */*' },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!response.ok) { console.warn(`Failed to fetch ${feed.name}: ${response.status}`); return []; }
        const xml = await response.text();
        return parseRSSItems(xml, feed.name, feed.icon, feed.max_items_per_source || 5);
      } catch (err) { console.warn(`Error fetching ${feed.name}:`, err); return []; }
    });

    const results = await Promise.all(feedPromises);
    const allItems = results.flat();
    allItems.sort((a, b) => {
      const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return dateB - dateA;
    });

    return new Response(JSON.stringify({ success: true, items: allItems.slice(0, maxTotal) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in fetch-scholarship-feeds:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
