-- Per-source item caps become opt-in: NULL means uncapped, and nothing is
-- capped by default. The fetch-news-feeds / fetch-scholarship-feeds
-- functions sort newest-first and only slice when a cap (or a
-- gw_feed_settings.max_total_items row) is explicitly set.
ALTER TABLE public.gw_feed_sources ALTER COLUMN max_items_per_source DROP NOT NULL;
ALTER TABLE public.gw_feed_sources ALTER COLUMN max_items_per_source DROP DEFAULT;
UPDATE public.gw_feed_sources SET max_items_per_source = NULL;
