-- Fix the specific duplicate by identifying and removing older entries first
WITH duplicates_to_remove AS (
  SELECT id 
  FROM gw_role_module_permissions 
  WHERE role = 'executive' 
  AND module_name IN ('Media Library', 'media')
  AND permission_type = 'view'
)
DELETE FROM gw_role_module_permissions 
WHERE id IN (SELECT id FROM duplicates_to_remove);

-- Now safely update the remaining entries
UPDATE gw_role_module_permissions SET module_name = 'media-library' WHERE module_name IN ('Media Library', 'media');
UPDATE gw_role_module_permissions SET module_name = 'auditions' WHERE module_name = 'auditions-management';

-- Update username_permissions
UPDATE username_permissions SET module_name = 'media-library' WHERE module_name IN ('Media Library', 'media');
UPDATE username_permissions SET module_name = 'auditions' WHERE module_name = 'auditions-management';