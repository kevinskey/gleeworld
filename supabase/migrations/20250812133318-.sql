-- Standardize module names and consolidate permissions

-- First, create a mapping table for module name standardization
CREATE TEMP TABLE module_name_mapping AS
SELECT 
  old_name,
  new_name
FROM (VALUES
  ('ai_tools', 'ai-tools'),
  ('hero_manager', 'hero-manager'),
  ('media_library', 'media-library'),
  ('press_kits', 'press-kits'),
  ('pr_manager', 'pr-manager'),
  ('Media Library', 'media-library'),
  ('auditions-management', 'auditions'),
  ('media', 'media-library'),
  ('music-library', 'music-library'),
  ('student-conductor', 'student-conductor')
) AS t(old_name, new_name);

-- Update gw_modules table to use consistent kebab-case naming
UPDATE gw_modules SET name = 'ai-tools' WHERE name = 'ai_tools';
UPDATE gw_modules SET name = 'hero-manager' WHERE name = 'hero_manager';
UPDATE gw_modules SET name = 'media-library' WHERE name = 'media_library';
UPDATE gw_modules SET name = 'press-kits' WHERE name = 'press_kits';
UPDATE gw_modules SET name = 'pr-manager' WHERE name = 'pr_manager';

-- Update gw_role_module_permissions to use standardized names
UPDATE gw_role_module_permissions SET module_name = 'media-library' WHERE module_name IN ('Media Library', 'media', 'media-library');
UPDATE gw_role_module_permissions SET module_name = 'auditions' WHERE module_name = 'auditions-management';
UPDATE gw_role_module_permissions SET module_name = 'music-library' WHERE module_name = 'music-library';
UPDATE gw_role_module_permissions SET module_name = 'student-conductor' WHERE module_name = 'student-conductor';

-- Remove duplicate role permissions (keep most recent)
DELETE FROM gw_role_module_permissions a
USING gw_role_module_permissions b
WHERE a.id < b.id 
AND a.role = b.role 
AND a.module_name = b.module_name 
AND a.permission_type = b.permission_type;

-- Update username_permissions table to use standardized names
UPDATE username_permissions SET module_name = 'media-library' WHERE module_name IN ('Media Library', 'media');
UPDATE username_permissions SET module_name = 'auditions' WHERE module_name = 'auditions-management';

-- Remove duplicate username permissions (keep most recent)
DELETE FROM username_permissions a
USING username_permissions b
WHERE a.id < b.id 
AND a.user_email = b.user_email 
AND a.module_name = b.module_name;

-- Add constraint to ensure consistent naming in the future
ALTER TABLE gw_modules ADD CONSTRAINT module_name_format 
CHECK (name ~ '^[a-z]+(-[a-z]+)*$');

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_role_module_permissions_lookup 
ON gw_role_module_permissions (role, module_name, permission_type);