-- Feed sources configuration table
CREATE TABLE public.gw_feed_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_type TEXT NOT NULL CHECK (feed_type IN ('news', 'scholarship')),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📰',
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_items_per_source INTEGER NOT NULL DEFAULT 5,
  timeout_ms INTEGER NOT NULL DEFAULT 8000,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(feed_type, url)
);

-- Feed global settings table
CREATE TABLE public.gw_feed_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_type TEXT NOT NULL UNIQUE CHECK (feed_type IN ('news', 'scholarship')),
  max_total_items INTEGER NOT NULL DEFAULT 25,
  cache_minutes INTEGER NOT NULL DEFAULT 15,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.gw_feed_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_feed_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read (edge functions need anon access)
CREATE POLICY "Anyone can view active feed sources"
  ON public.gw_feed_sources FOR SELECT USING (true);
CREATE POLICY "Anyone can view feed settings"
  ON public.gw_feed_settings FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "Admins can insert feed sources"
  ON public.gw_feed_sources FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update feed sources"
  ON public.gw_feed_sources FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete feed sources"
  ON public.gw_feed_sources FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert feed settings"
  ON public.gw_feed_settings FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update feed settings"
  ON public.gw_feed_settings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed current news sources
INSERT INTO public.gw_feed_sources (feed_type, name, url, icon, display_order) VALUES
  ('news', 'Google News', 'https://news.google.com/rss/search?q=Black+music+OR+HBCU+OR+choir+OR+gospel&hl=en-US&gl=US&ceid=US:en', '🔍', 1),
  ('news', 'AP News', 'https://feeds.apnews.com/rss/apf-entertainment', '📰', 2),
  ('news', 'Roland Martin', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCKCMGsl4NQSbFnfJLt8HiWQ', '🎙️', 3),
  ('news', 'The Root', 'https://www.theroot.com/rss', '✊🏿', 4),
  ('news', 'TheGrio', 'https://thegrio.com/feed/', '📡', 5),
  ('news', 'HBCU News', 'https://news.google.com/rss/search?q=Spelman+College+OR+%22glee+club%22+OR+HBCU+music&hl=en-US&gl=US&ceid=US:en', '🎓', 6);

-- Seed current scholarship sources
INSERT INTO public.gw_feed_sources (feed_type, name, url, icon, display_order) VALUES
  ('scholarship', 'Scholarships.com', 'https://www.scholarships.com/news/feed/', '🎓', 1),
  ('scholarship', 'Edvisors', 'https://www.edvisors.com/blog/feed/', '📋', 2),
  ('scholarship', 'College Greenlight', 'https://blog.collegegreenlight.com/blog/feed/', '💚', 3),
  ('scholarship', 'TheGrio Education', 'https://thegrio.com/category/education/feed/', '📡', 4),
  ('scholarship', 'HBCU Buzz', 'https://hbcubuzz.com/feed/', '🏫', 5),
  ('scholarship', 'Diverse Education', 'https://www.diverseeducation.com/feed', '🎵', 6);

-- Seed global settings
INSERT INTO public.gw_feed_settings (feed_type, max_total_items, cache_minutes) VALUES
  ('news', 25, 15),
  ('scholarship', 25, 30);

-- Updated_at trigger
CREATE TRIGGER update_gw_feed_sources_updated_at
  BEFORE UPDATE ON public.gw_feed_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gw_feed_settings_updated_at
  BEFORE UPDATE ON public.gw_feed_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();