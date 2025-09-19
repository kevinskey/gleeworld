-- Create the MUS240 Groups module in gw_modules table
INSERT INTO public.gw_modules (key, name, description, category, is_active, default_permissions)
VALUES (
  'mus240-groups',
  'MUS240 Groups', 
  'Collaborative project groups for MUS240 AI Music course',
  'education',
  true,
  '["view"]'::jsonb
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;