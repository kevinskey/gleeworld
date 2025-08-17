-- Insert missing sight-reading-generator module
INSERT INTO public.gw_app_functions (
  name, 
  module,
  category, 
  description, 
  is_active, 
  created_at
) VALUES (
  'sight-reading-generator',
  'sight-reading-generator',
  'musical-leadership',
  'Generate AI-powered sight-reading exercises with professional notation and evaluation',
  true,
  now()
) ON CONFLICT (name) DO UPDATE SET
  module = EXCLUDED.module,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = now();