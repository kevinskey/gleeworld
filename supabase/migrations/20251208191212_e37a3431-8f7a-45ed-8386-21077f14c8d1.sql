-- Add Survey Module to gw_modules table
INSERT INTO public.gw_modules (key, name, description, category, is_active)
VALUES (
  'survey-module',
  'Survey Module',
  'View and manage survey responses',
  'member-management',
  true
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active;