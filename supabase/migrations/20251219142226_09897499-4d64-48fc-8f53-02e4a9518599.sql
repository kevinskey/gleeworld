-- Insert Messenger Admin module into gw_modules table
INSERT INTO public.gw_modules (key, name, description, category, is_active)
VALUES (
  'messenger-admin',
  'Messenger Admin',
  'Manage messenger groups, recipients, and communication settings',
  'communications',
  true
)
ON CONFLICT (key) DO NOTHING;