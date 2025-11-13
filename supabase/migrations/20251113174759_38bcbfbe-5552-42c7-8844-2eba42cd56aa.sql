-- Add grading module to gw_modules table with key field
INSERT INTO gw_modules (name, key, description, category, is_active, default_permissions)
VALUES (
  'grading',
  'grading',
  'Manage courses, assignments, and student grades. Students view assignments and progress.',
  'education',
  true,
  '{"canAccess": ["member", "instructor", "admin", "super-admin"], "canManage": ["instructor", "admin", "super-admin"]}'::jsonb
)
ON CONFLICT (name) DO UPDATE SET
  key = EXCLUDED.key,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active,
  default_permissions = EXCLUDED.default_permissions;