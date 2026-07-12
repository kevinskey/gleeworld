-- NPR Music joins the platform-default news sources (tenant_id NULL).
-- Applied via psql (no tenant claim), so the tenant-default trigger leaves
-- tenant_id NULL. Tenants that configure their own sources in Feed Control
-- stop inheriting these defaults (see fetch-news-feeds).
INSERT INTO public.gw_feed_sources (feed_type, name, url, icon, is_active, max_items_per_source, display_order)
SELECT 'news', 'NPR Music', 'https://feeds.npr.org/1039/rss.xml', '🎵', true, 5, 3
WHERE NOT EXISTS (
  SELECT 1 FROM public.gw_feed_sources
  WHERE feed_type = 'news' AND name = 'NPR Music' AND tenant_id IS NULL
);
