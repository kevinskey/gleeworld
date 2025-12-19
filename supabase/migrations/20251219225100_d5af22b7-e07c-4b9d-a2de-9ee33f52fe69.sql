-- Create advertising_hero table for the main promotional hero banner
CREATE TABLE public.advertising_hero (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  description TEXT,
  image_url TEXT NOT NULL,
  mobile_image_url TEXT,
  ipad_image_url TEXT,
  link_url TEXT,
  link_target TEXT DEFAULT '_self',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.advertising_hero ENABLE ROW LEVEL SECURITY;

-- Everyone can view active advertising heroes
CREATE POLICY "Anyone can view active advertising heroes"
ON public.advertising_hero
FOR SELECT
USING (is_active = true);

-- Only admins can manage advertising heroes
CREATE POLICY "Admins can manage advertising heroes"
ON public.advertising_hero
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_advertising_hero_updated_at
BEFORE UPDATE ON public.advertising_hero
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert a default hero
INSERT INTO public.advertising_hero (title, description, image_url, is_active)
VALUES (
  'Welcome to GleeWorld',
  'The official home of the Spelman College Glee Club',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=2070&q=80',
  true
);