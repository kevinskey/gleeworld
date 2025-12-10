-- Insert the Exit Interviews module into gw_modules table for assignment
INSERT INTO gw_modules (name, key, description, category, is_active, default_permissions)
VALUES (
  'Exit Interviews',
  'exit-interviews',
  'View and manage member end-of-semester exit interview submissions',
  'member-management',
  true,
  '{"admin": true, "super-admin": true}'::jsonb
)
ON CONFLICT (key) DO NOTHING;