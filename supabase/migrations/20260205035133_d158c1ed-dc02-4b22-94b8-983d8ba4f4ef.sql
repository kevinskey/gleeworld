-- Create alumnae page hero table for the alumnae landing page
CREATE TABLE public.alumnae_page_hero (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  mobile_image_url TEXT,
  ipad_image_url TEXT,
  link_url TEXT,
  link_target TEXT DEFAULT '_self',
  title TEXT,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  duration_ms INTEGER DEFAULT 5000,
  layout TEXT DEFAULT 'one',
  transition TEXT DEFAULT 'fade',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.alumnae_page_hero ENABLE ROW LEVEL SECURITY;

-- Public read access for active heroes
CREATE POLICY "Anyone can view active alumnae heroes"
ON public.alumnae_page_hero
FOR SELECT
USING (is_active = true);

-- Admin/authenticated users can manage heroes
CREATE POLICY "Authenticated users can manage alumnae heroes"
ON public.alumnae_page_hero
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create updated_at trigger
CREATE TRIGGER update_alumnae_page_hero_updated_at
BEFORE UPDATE ON public.alumnae_page_hero
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();