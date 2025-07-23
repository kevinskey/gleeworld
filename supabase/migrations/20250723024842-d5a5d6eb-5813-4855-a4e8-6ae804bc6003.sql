-- Add alumnae-specific fields to gw_profiles table
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS graduation_year INTEGER;
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS headshot_url TEXT;
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS mentor_opt_in BOOLEAN DEFAULT false;
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS reunion_rsvp BOOLEAN DEFAULT false;

-- Create alumnae_stories table for Memory Wall
CREATE TABLE IF NOT EXISTS public.alumnae_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  graduation_year INTEGER,
  is_featured BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on alumnae_stories
ALTER TABLE public.alumnae_stories ENABLE ROW LEVEL SECURITY;

-- Create policies for alumnae_stories
CREATE POLICY "Users can view approved stories" ON public.alumnae_stories
  FOR SELECT USING (is_approved = true);

CREATE POLICY "Users can create their own stories" ON public.alumnae_stories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stories" ON public.alumnae_stories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all stories" ON public.alumnae_stories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Create bulletin_posts table for Alumnae Bulletin Board
CREATE TABLE IF NOT EXISTS public.bulletin_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'reunion', 'mentoring', 'memories')),
  is_public BOOLEAN DEFAULT true,
  is_alumnae_only BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on bulletin_posts
ALTER TABLE public.bulletin_posts ENABLE ROW LEVEL SECURITY;

-- Create policies for bulletin_posts
CREATE POLICY "Public can view public posts" ON public.bulletin_posts
  FOR SELECT USING (is_public = true AND is_alumnae_only = false);

CREATE POLICY "Alumnae can view alumnae-only posts" ON public.bulletin_posts
  FOR SELECT USING (
    is_public = true AND (
      is_alumnae_only = false OR 
      EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = auth.uid() AND role = 'alumna'
      )
    )
  );

CREATE POLICY "Users can create posts" ON public.bulletin_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" ON public.bulletin_posts
  FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_alumnae_stories_graduation_year ON public.alumnae_stories(graduation_year);
CREATE INDEX IF NOT EXISTS idx_alumnae_stories_approved ON public.alumnae_stories(is_approved) WHERE is_approved = true;
CREATE INDEX IF NOT EXISTS idx_bulletin_posts_category ON public.bulletin_posts(category);
CREATE INDEX IF NOT EXISTS idx_bulletin_posts_alumnae ON public.bulletin_posts(is_alumnae_only) WHERE is_alumnae_only = true;