-- Seed Google News sources for the Command Center News rail (feeds are
-- fetched server-side by the fetch-news-feeds edge function; these rows
-- are platform-level, not tenant-scoped). Idempotent by (feed_type, name).
INSERT INTO public.gw_feed_sources (feed_type, name, url, icon, is_active, max_items_per_source, display_order)
SELECT 'news', 'Google News · Choral',
       'https://news.google.com/rss/search?q=%22choral%22+OR+%22choir%22&hl=en-US&gl=US&ceid=US:en',
       '📰', true, 8, 1
WHERE NOT EXISTS (
  SELECT 1 FROM public.gw_feed_sources WHERE feed_type = 'news' AND name = 'Google News · Choral'
);

INSERT INTO public.gw_feed_sources (feed_type, name, url, icon, is_active, max_items_per_source, display_order)
SELECT 'news', 'Google News · Music Education',
       'https://news.google.com/rss/search?q=%22music+education%22&hl=en-US&gl=US&ceid=US:en',
       '🎓', true, 6, 2
WHERE NOT EXISTS (
  SELECT 1 FROM public.gw_feed_sources WHERE feed_type = 'news' AND name = 'Google News · Music Education'
);
