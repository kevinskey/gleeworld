-- Sharpen the platform-default Google News queries (tenant_id NULL only;
-- tenant-configured sources untouched).
-- Choral: intitle: requires the word in the headline, dropping articles
-- that only mention a choir in passing; volume verified ~100 items, same
-- freshness as the broad query.
-- Music education: intitle:"music education" OR intitle:"music program".
-- Deliberately NOT "music teacher" — that variant surfaced teacher-crime
-- stories in testing.
UPDATE public.gw_feed_sources
SET url = 'https://news.google.com/rss/search?q=intitle%3Achoir+OR+intitle%3Achoral&hl=en-US&gl=US&ceid=US:en'
WHERE feed_type = 'news' AND tenant_id IS NULL AND name = 'Google News · Choral';

UPDATE public.gw_feed_sources
SET url = 'https://news.google.com/rss/search?q=intitle%3A%22music+education%22+OR+intitle%3A%22music+program%22&hl=en-US&gl=US&ceid=US:en'
WHERE feed_type = 'news' AND tenant_id IS NULL AND name = 'Google News · Music Education';
