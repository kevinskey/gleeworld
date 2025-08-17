-- Insert the member sight reading studio module into the database permissions table
INSERT INTO public.gw_app_functions (
  name, 
  module,
  category, 
  description, 
  is_active, 
  created_at
) VALUES (
  'member_sight_reading_studio',
  'member-sight-reading-studio',
  'musical-leadership',
  'Complete assignments, practice sight reading, track grades, and manage submissions',
  true,
  now()
) ON CONFLICT (name) DO UPDATE SET
  module = EXCLUDED.module,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = now();