-- Insert the member-sight-reading-studio module into gw_modules table
INSERT INTO public.gw_modules (
  id,
  name, 
  description,
  category,
  is_active,
  key,
  created_at
) VALUES (
  gen_random_uuid(),
  'member-sight-reading-studio',
  'Complete assignments, practice sight reading, track grades, and manage submissions (Student Portal)',
  'musical-leadership',
  true,
  'member-sight-reading-studio',
  now()
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active,
  key = EXCLUDED.key,
  updated_at = now();