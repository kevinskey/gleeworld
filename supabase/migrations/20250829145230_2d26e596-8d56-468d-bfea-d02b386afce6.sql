-- Create MUS 240 resources table
CREATE TABLE public.mus240_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('reading', 'website', 'video', 'article', 'database')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mus240_resources ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Everyone can view active resources" 
ON public.mus240_resources 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage all resources" 
ON public.mus240_resources 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION public.update_mus240_resources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mus240_resources_updated_at
BEFORE UPDATE ON public.mus240_resources
FOR EACH ROW
EXECUTE FUNCTION public.update_mus240_resources_updated_at();

-- Insert existing resource as sample data
INSERT INTO public.mus240_resources (title, url, description, category, display_order) VALUES
('African Origins and Adaptations in African American Music', 'https://timeline.carnegiehall.org/stories/african-origins-and-adaptations-in-african-american-music', 'Explore the African musical traditions that form the foundation of African American music, including rhythmic patterns, call-and-response techniques, and instrumental traditions that crossed the Atlantic and evolved in America.', 'website', 1);