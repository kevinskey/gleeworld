-- Add appointments module to gw_modules table
INSERT INTO public.gw_modules (key, name, description, category, is_active, created_at, updated_at)
VALUES (
  'appointments',
  'Appointment System',
  'Complete appointment scheduling and management system for providers and clients',
  'communications',
  true,
  now(),
  now()
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active,
  updated_at = now();