-- Remove ALL media library duplicates, keeping only the most recent one
DELETE FROM gw_role_module_permissions 
WHERE role = 'executive' 
AND module_name IN ('Media Library', 'media', 'media-library')
AND id NOT IN (
  SELECT id FROM (
    SELECT DISTINCT ON (permission_type) id
    FROM gw_role_module_permissions 
    WHERE role = 'executive' 
    AND module_name IN ('Media Library', 'media', 'media-library')
    ORDER BY permission_type, granted_at DESC, id DESC
  ) AS kept_rows
);

-- Now safely update any remaining role permissions
UPDATE gw_role_module_permissions SET module_name = 'media-library' WHERE module_name IN ('Media Library', 'media');
UPDATE gw_role_module_permissions SET module_name = 'auditions' WHERE module_name = 'auditions-management';

-- Update username_permissions
UPDATE username_permissions SET module_name = 'media-library' WHERE module_name IN ('Media Library', 'media');
UPDATE username_permissions SET module_name = 'auditions' WHERE module_name = 'auditions-management';