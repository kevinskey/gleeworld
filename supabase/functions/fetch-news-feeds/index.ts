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

const RSS_FEEDS = [
  {
    url: 'https://news.google.com/rss/search?q=Black+music+OR+HBCU+OR+choir+OR+gospel&hl=en-US&gl=US&ceid=US:en',
    source: 'Google News',
    sourceIcon: '🔍',
  },
  {
    url: 'https://feeds.apnews.com/rss/apf-entertainment',
    source: 'AP News',
    sourceIcon: '📰',
  },
  {
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCKCMGsl4NQSbFnfJLt8HiWQ',
    source: 'Roland Martin',
    sourceIcon: '🎙️',
  },
  {
    url: 'https://www.theroot.com/rss',
    source: 'The Root',
    sourceIcon: '✊🏿',
  },
  {
    url: 'https://thegrio.com/feed/',
    source: 'TheGrio',
    sourceIcon: '📡',
  },
  {
    url: 'https://news.google.com/rss/search?q=Spelman+College+OR+%22glee+club%22+OR+HBCU+music&hl=en-US&gl=US&ceid=US:en',
    source: 'HBCU News',
    sourceIcon: '🎓',
  },
];

function extractText(xml: string, tag: string): string {
  // Handle CDATA sections
  const cdataRegex = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i');
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim().replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1') : '';
}

function extractImageFromContent(content: string): string | null {
  // Try to find an image in media:content, media:thumbnail, enclosure, or img tags
  const mediaMatch = content.match(/url=["']([^"']+\.(?:jpg|jpeg|png|webp|gif)[^"']*)/i);
  if (mediaMatch) return mediaMatch[1];

  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch) return imgMatch[1];

  const enclosureMatch = content.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image/i);
  if (enclosureMatch) return enclosureMatch[1];

  return null;
}

function parseRSSItems(xml: string, source: string, sourceIcon: string): FeedItem[] {
  const items: FeedItem[] = [];

  // Check if it's an Atom feed (YouTube)
  const isAtom = xml.includes('<feed') && xml.includes('xmlns="http://www.w3.org/2005/Atom"');

  if (isAtom) {
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
    let entryMatch;
    while ((entryMatch = entryRegex.exec(xml)) !== null && items.length < 5) {
      const entry = entryMatch[1];
      const title = extractText(entry, 'title');
      const linkMatch = entry.match(/<link[^>]+href=["']([^"']+)["']/);
      const link = linkMatch ? linkMatch[1] : '';
      const published = extractText(entry, 'published') || extractText(entry, 'updated');

      // YouTube video ID for thumbnail
      const videoIdMatch = entry.match(/<yt:videoId>([^<]+)/);
      const imageUrl = videoIdMatch
        ? `https://img.youtube.com/vi/${videoIdMatch[1]}/mqdefault.jpg`
        : null;

      if (title && link) {
        items.push({
          title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
          link,
          description: '',
          pubDate: published,
          source,
          sourceIcon,
          imageUrl,
        });
      }
    }
  } else {
    // Standard RSS
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let itemMatch;
    while ((itemMatch = itemRegex.exec(xml)) !== null && items.length < 5) {
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
          pubDate,
          source,
          sourceIcon,
          imageUrl,
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
    const feedPromises = RSS_FEEDS.map(async (feed) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(feed.url, {
          headers: {
            'User-Agent': 'GleeWorld News Reader/1.0',
            'Accept': 'application/rss+xml, application/xml, text/xml, */*',
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) {
          console.warn(`Failed to fetch ${feed.source}: ${response.status}`);
          return [];
        }

        const xml = await response.text();
        return parseRSSItems(xml, feed.source, feed.sourceIcon);
      } catch (err) {
        console.warn(`Error fetching ${feed.source}:`, err);
        return [];
      }
    });

    const results = await Promise.all(feedPromises);
    const allItems = results.flat();

    // Sort by date, most recent first
    allItems.sort((a, b) => {
      const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return dateB - dateA;
    });

    // Limit to 25 items
    const limitedItems = allItems.slice(0, 25);

    return new Response(JSON.stringify({ success: true, items: limitedItems }), {
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
