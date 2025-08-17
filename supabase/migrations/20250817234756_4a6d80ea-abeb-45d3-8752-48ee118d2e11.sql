-- Insert the member-sight-reading-studio module into gw_modules table
INSERT INTO public.gw_modules (
  id,
  name, 
  title,
  description,
  category,
  icon,
  icon_color,
  is_active,
  is_new,
  db_function_name,
  required_roles,
  created_at
) VALUES (
  'member-sight-reading-studio',
  'member-sight-reading-studio',
  'Sight Reading Studio',
  'Complete assignments, practice sight reading, track grades, and manage submissions (Student Portal)',
  'musical-leadership',
  'Music',
  'purple',
  true,
  true,
  'member-sight-reading-studio',
  ARRAY['member', 'admin', 'super-admin'],
  now()
) ON CONFLICT (name) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  icon_color = EXCLUDED.icon_color,
  is_active = EXCLUDED.is_active,
  is_new = EXCLUDED.is_new,
  db_function_name = EXCLUDED.db_function_name,
  required_roles = EXCLUDED.required_roles,
  updated_at = now();