-- Insert the member sight reading studio module into the database permissions table
INSERT INTO public.gw_app_functions (
  function_name, 
  category, 
  description, 
  is_active, 
  created_at
) VALUES (
  'member-sight-reading-studio',
  'musical-leadership',
  'Complete assignments, practice sight reading, track grades, and manage submissions',
  true,
  now()
) ON CONFLICT (function_name) DO UPDATE SET
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = now();