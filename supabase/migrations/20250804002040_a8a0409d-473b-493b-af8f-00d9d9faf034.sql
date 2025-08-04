-- Create social_posts table for storing social media posts
CREATE TABLE public.gw_social_media_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caption_facebook TEXT,
  caption_instagram TEXT,
  caption_twitter TEXT,
  caption_linkedin TEXT,
  raw_content TEXT NOT NULL,
  tone TEXT DEFAULT 'professional',
  image_urls TEXT[] DEFAULT '{}',
  event_url TEXT,
  scheduled_time TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'scheduled', 'posted', 'failed')),
  platform_flags JSONB DEFAULT '{"facebook": false, "instagram": false, "twitter": false, "linkedin": false}',
  hashtags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  posted_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Create indexes
CREATE INDEX idx_gw_social_media_posts_status ON public.gw_social_media_posts(status);
CREATE INDEX idx_gw_social_media_posts_scheduled_time ON public.gw_social_media_posts(scheduled_time);
CREATE INDEX idx_gw_social_media_posts_created_by ON public.gw_social_media_posts(created_by);

-- Enable RLS
ALTER TABLE public.gw_social_media_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all social media posts" 
ON public.gw_social_media_posts 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_gw_social_media_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gw_social_media_posts_updated_at
  BEFORE UPDATE ON public.gw_social_media_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gw_social_media_posts_updated_at();