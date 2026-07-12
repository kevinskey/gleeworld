-- Feed sources are per-tenant, so uniqueness must be per-tenant too.
-- The old UNIQUE (feed_type, url) meant that once ANY tenant added a
-- source URL, every other tenant's attempt to enable the same source
-- failed with a duplicate-key error — the "feeds won't activate" bug.
-- NULLS NOT DISTINCT (PG15+) keeps the platform-default rows
-- (tenant_id NULL) unique among themselves as well.
ALTER TABLE public.gw_feed_sources
  DROP CONSTRAINT IF EXISTS gw_feed_sources_feed_type_url_key;

ALTER TABLE public.gw_feed_sources
  ADD CONSTRAINT gw_feed_sources_feed_type_url_tenant_key
  UNIQUE NULLS NOT DISTINCT (feed_type, url, tenant_id);

-- NPR Music joins the platform-default news mix (tenant_id NULL; psql has
-- no tenant claim so the tenant-default trigger leaves it NULL). Possible
-- only now that uniqueness is per-tenant (demo already has this URL).
INSERT INTO public.gw_feed_sources (feed_type, name, url, icon, is_active, max_items_per_source, display_order)
SELECT 'news', 'NPR Music', 'https://feeds.npr.org/1039/rss.xml', '🎵', true, 5, 3
WHERE NOT EXISTS (
  SELECT 1 FROM public.gw_feed_sources
  WHERE feed_type = 'news' AND url = 'https://feeds.npr.org/1039/rss.xml' AND tenant_id IS NULL
);
