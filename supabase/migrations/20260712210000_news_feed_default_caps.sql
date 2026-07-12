-- Raise per-source caps on the platform-default Google News sources so the
-- merged list can actually reach gw_feed_settings.max_total_items (25).
-- Before: 8 + 6 + 5 (NPR) = 19 items was the ceiling. Platform defaults
-- only (tenant_id IS NULL); tenant-configured rows are untouched.
UPDATE public.gw_feed_sources
SET max_items_per_source = 12
WHERE feed_type = 'news' AND tenant_id IS NULL
  AND name = 'Google News · Choral' AND max_items_per_source < 12;

UPDATE public.gw_feed_sources
SET max_items_per_source = 8
WHERE feed_type = 'news' AND tenant_id IS NULL
  AND name = 'Google News · Music Education' AND max_items_per_source < 8;
