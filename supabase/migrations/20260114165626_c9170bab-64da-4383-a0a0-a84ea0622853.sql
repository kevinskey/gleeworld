-- Create table for MUS240 module settings
CREATE TABLE IF NOT EXISTS public.mus240_module_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id TEXT NOT NULL UNIQUE, -- matches the hardcoded module ids like 'week-1'
  is_active BOOLEAN DEFAULT true,
  is_locked BOOLEAN DEFAULT false,
  unlock_date TIMESTAMPTZ,
  semester TEXT DEFAULT 'Spring 2026',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.mus240_module_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read module settings
CREATE POLICY "Anyone can view module settings" 
  ON public.mus240_module_settings 
  FOR SELECT 
  USING (true);

-- Allow admins to manage module settings
CREATE POLICY "Admins can manage module settings" 
  ON public.mus240_module_settings 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND is_super_admin = true
    )
  );

-- Insert default settings for all 16 weeks
INSERT INTO public.mus240_module_settings (module_id, is_active, is_locked, semester) VALUES
  ('week-1', true, false, 'Spring 2026'),
  ('week-2', true, false, 'Spring 2026'),
  ('week-3', false, false, 'Spring 2026'),
  ('week-4', false, false, 'Spring 2026'),
  ('week-5', false, true, 'Spring 2026'),
  ('week-6', false, true, 'Spring 2026'),
  ('week-7', false, true, 'Spring 2026'),
  ('week-8', false, true, 'Spring 2026'),
  ('week-9', false, true, 'Spring 2026'),
  ('week-10', false, true, 'Spring 2026'),
  ('week-11', false, true, 'Spring 2026'),
  ('week-12', false, true, 'Spring 2026'),
  ('week-13', false, true, 'Spring 2026'),
  ('week-14', false, true, 'Spring 2026'),
  ('week-15', false, true, 'Spring 2026'),
  ('week-16', false, true, 'Spring 2026')
ON CONFLICT (module_id) DO NOTHING;