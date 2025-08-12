-- Comprehensive cleanup: remove all duplicates before renaming
-- First, identify all entries that need to be renamed
CREATE TEMP TABLE rename_mappings AS 
SELECT DISTINCT module_name, 
  CASE 
    WHEN module_name IN ('Media Library', 'media') THEN 'media-library'
    WHEN module_name = 'auditions-management' THEN 'auditions'
    ELSE module_name
  END as new_name
FROM gw_role_module_permissions
WHERE module_name IN ('Media Library', 'media', 'auditions-management');

-- For each mapping, remove duplicates before renaming
WITH media_duplicates AS (
  SELECT id, 
    ROW_NUMBER() OVER (
      PARTITION BY role, permission_type 
      ORDER BY granted_at DESC, id DESC
    ) as rn
  FROM gw_role_module_permissions 
  WHERE module_name IN ('Media Library', 'media', 'media-library')
)
DELETE FROM gw_role_module_permissions 
WHERE id IN (SELECT id FROM media_duplicates WHERE rn > 1);

WITH audition_duplicates AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY role, permission_type 
      ORDER BY granted_at DESC, id DESC
    ) as rn
  FROM gw_role_module_permissions 
  WHERE module_name IN ('auditions', 'auditions-management')
)
DELETE FROM gw_role_module_permissions 
WHERE id IN (SELECT id FROM audition_duplicates WHERE rn > 1);

-- Now safely rename
UPDATE gw_role_module_permissions SET module_name = 'media-library' WHERE module_name IN ('Media Library', 'media');
UPDATE gw_role_module_permissions SET module_name = 'auditions' WHERE module_name = 'auditions-management';