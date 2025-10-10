-- Create hero slides table for newsletter carousel
CREATE TABLE IF NOT EXISTS public.alumnae_newsletter_hero_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id UUID REFERENCES public.alumnae_newsletters(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create spotlights table
CREATE TABLE IF NOT EXISTS public.alumnae_newsletter_spotlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id UUID REFERENCES public.alumnae_newsletters(id) ON DELETE CASCADE,
  spotlight_type TEXT NOT NULL CHECK (spotlight_type IN ('alumnae', 'student')),
  name TEXT NOT NULL,
  title TEXT,
  description TEXT,
  photo_url TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create announcements table
CREATE TABLE IF NOT EXISTS public.alumnae_newsletter_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id UUID REFERENCES public.alumnae_newsletters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.alumnae_newsletter_hero_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumnae_newsletter_spotlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumnae_newsletter_announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hero slides
CREATE POLICY "Hero slides are viewable by everyone"
  ON public.alumnae_newsletter_hero_slides FOR SELECT
  USING (true);

CREATE POLICY "Alumnae liaison can manage hero slides"
  ON public.alumnae_newsletter_hero_slides FOR ALL
  USING (is_alumnae_liaison() OR is_gw_admin());

-- RLS Policies for spotlights
CREATE POLICY "Spotlights are viewable by everyone"
  ON public.alumnae_newsletter_spotlights FOR SELECT
  USING (true);

CREATE POLICY "Alumnae liaison can manage spotlights"
  ON public.alumnae_newsletter_spotlights FOR ALL
  USING (is_alumnae_liaison() OR is_gw_admin());

-- RLS Policies for announcements
CREATE POLICY "Announcements are viewable by everyone"
  ON public.alumnae_newsletter_announcements FOR SELECT
  USING (true);

CREATE POLICY "Alumnae liaison can manage announcements"
  ON public.alumnae_newsletter_announcements FOR ALL
  USING (is_alumnae_liaison() OR is_gw_admin());

-- Create indexes for better performance
CREATE INDEX idx_hero_slides_newsletter ON public.alumnae_newsletter_hero_slides(newsletter_id);
CREATE INDEX idx_spotlights_newsletter ON public.alumnae_newsletter_spotlights(newsletter_id);
CREATE INDEX idx_announcements_newsletter ON public.alumnae_newsletter_announcements(newsletter_id);