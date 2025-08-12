-- Remove duplicates and standardize module names

-- First, remove duplicates from gw_role_module_permissions
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY role, module_name, permission_type 
    ORDER BY granted_at DESC, id DESC
  ) as rn
  FROM gw_role_module_permissions
)
DELETE FROM gw_role_module_permissions 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Now update gw_modules table to use consistent kebab-case naming
UPDATE gw_modules SET name = 'ai-tools' WHERE name = 'ai_tools';
UPDATE gw_modules SET name = 'hero-manager' WHERE name = 'hero_manager';
UPDATE gw_modules SET name = 'media-library' WHERE name = 'media_library';
UPDATE gw_modules SET name = 'press-kits' WHERE name = 'press_kits';
UPDATE gw_modules SET name = 'pr-manager' WHERE name = 'pr_manager';

-- Update gw_role_module_permissions to use standardized names
UPDATE gw_role_module_permissions SET module_name = 'media-library' WHERE module_name IN ('Media Library', 'media');
UPDATE gw_role_module_permissions SET module_name = 'auditions' WHERE module_name = 'auditions-management';

-- Remove any new duplicates created by the updates
WITH new_duplicates AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY role, module_name, permission_type 
    ORDER BY granted_at DESC, id DESC
  ) as rn
  FROM gw_role_module_permissions
)
DELETE FROM gw_role_module_permissions 
WHERE id IN (
  SELECT id FROM new_duplicates WHERE rn > 1
);

-- Update username_permissions table to use standardized names  
UPDATE username_permissions SET module_name = 'media-library' WHERE module_name IN ('Media Library', 'media');
UPDATE username_permissions SET module_name = 'auditions' WHERE module_name = 'auditions-management';

-- Remove duplicates from username_permissions
WITH username_duplicates AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY user_email, module_name 
    ORDER BY granted_at DESC, id DESC
  ) as rn
  FROM username_permissions
)
DELETE FROM username_permissions 
WHERE id IN (
  SELECT id FROM username_duplicates WHERE rn > 1
);

-- Add performance index
CREATE INDEX IF NOT EXISTS idx_role_module_permissions_lookup 
ON gw_role_module_permissions (role, module_name, permission_type);