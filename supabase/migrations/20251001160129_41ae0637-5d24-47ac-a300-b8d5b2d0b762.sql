-- Create table for midterm exam configuration
CREATE TABLE IF NOT EXISTS public.mus240_midterm_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  excerpt_1_url TEXT,
  excerpt_2_url TEXT,
  excerpt_3_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mus240_midterm_config ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view the active config
CREATE POLICY "Anyone can view midterm config"
  ON public.mus240_midterm_config
  FOR SELECT
  USING (is_active = true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can manage midterm config"
  ON public.mus240_midterm_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE user_id = auth.uid()
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Create trigger to update updated_at
CREATE TRIGGER update_mus240_midterm_config_updated_at
  BEFORE UPDATE ON public.mus240_midterm_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial empty config row
INSERT INTO public.mus240_midterm_config (excerpt_1_url, excerpt_2_url, excerpt_3_url)
VALUES ('', '', '')
ON CONFLICT DO NOTHING;