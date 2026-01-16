-- Create lyke_house_hero table for LH100 YouTube video slider
CREATE TABLE public.lyke_house_hero (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  video_id TEXT NOT NULL,
  video_url TEXT,
  thumbnail_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.lyke_house_hero ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Everyone can view lyke house hero"
ON public.lyke_house_hero FOR SELECT
USING (true);

CREATE POLICY "Admins can manage lyke house hero"
ON public.lyke_house_hero FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.app_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin')
    AND is_active = true
  )
);

-- Create updated_at trigger
CREATE TRIGGER update_lyke_house_hero_updated_at
BEFORE UPDATE ON public.lyke_house_hero
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();