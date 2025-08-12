-- Continue standardizing role permissions
UPDATE gw_role_module_permissions SET module_name = 'media-library' WHERE module_name IN ('Media Library', 'media');
UPDATE gw_role_module_permissions SET module_name = 'auditions' WHERE module_name = 'auditions-management';

-- Update username_permissions to use standardized names
UPDATE username_permissions SET module_name = 'media-library' WHERE module_name IN ('Media Library', 'media');
UPDATE username_permissions SET module_name = 'auditions' WHERE module_name = 'auditions-management';

-- Remove any remaining duplicates after updates
DELETE FROM gw_role_module_permissions 
WHERE id NOT IN (
  SELECT DISTINCT ON (role, module_name, permission_type) id
  FROM gw_role_module_permissions 
  ORDER BY role, module_name, permission_type, granted_at DESC, id DESC
);

DELETE FROM username_permissions 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_email, module_name) id
  FROM username_permissions 
  ORDER BY user_email, module_name, granted_at DESC, id DESC
);