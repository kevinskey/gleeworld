-- Insert first-year console module into gw_modules
INSERT INTO public.gw_modules (
  key,
  name,
  display_name,
  description,
  category,
  is_active,
  created_at,
  updated_at
) VALUES (
  'first-year-console',
  'first-year-console',
  'First-Year Console',
  'Administrative console for managing first-year students, tracking progress, and coordinating support',
  'administrative',
  true,
  now(),
  now()
) ON CONFLICT (key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  updated_at = now();