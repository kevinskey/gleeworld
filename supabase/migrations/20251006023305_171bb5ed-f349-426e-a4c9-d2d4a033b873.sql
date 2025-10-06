-- Add test-builder module to gw_modules table
INSERT INTO gw_modules (name, key, description, category, is_active, default_permissions, created_at, updated_at)
VALUES (
  'test-builder',
  'test-builder',
  'Create and manage tests, quizzes, and assessments for Glee Academy courses',
  'education',
  true,
  '["view"]'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();