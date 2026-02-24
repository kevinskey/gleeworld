CREATE TABLE public.gw_feed_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feed_type TEXT NOT NULL CHECK (feed_type IN ('news', 'scholarship')),
  title TEXT NOT NULL,
  link TEXT NOT NULL,
  description TEXT,
  source TEXT,
  source_icon TEXT,
  image_url TEXT,
  pub_date TIMESTAMPTZ,
  is_liked BOOLEAN DEFAULT false,
  is_bookmarked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, link)
);

ALTER TABLE public.gw_feed_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feed saves"
  ON public.gw_feed_saves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own feed saves"
  ON public.gw_feed_saves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own feed saves"
  ON public.gw_feed_saves FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own feed saves"
  ON public.gw_feed_saves FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_feed_saves_user ON public.gw_feed_saves(user_id);
CREATE INDEX idx_feed_saves_type ON public.gw_feed_saves(user_id, feed_type);