-- Fix duplicates by deleting older entries first

-- Delete duplicates, keeping only the most recent entry for each combination
DELETE FROM gw_role_module_permissions 
WHERE id NOT IN (
  SELECT DISTINCT ON (role, module_name, permission_type) id
  FROM gw_role_module_permissions 
  ORDER BY role, module_name, permission_type, granted_at DESC, id DESC
);

-- Now safely update module names
UPDATE gw_modules SET name = 'ai-tools' WHERE name = 'ai_tools';
UPDATE gw_modules SET name = 'hero-manager' WHERE name = 'hero_manager';  
UPDATE gw_modules SET name = 'media-library' WHERE name = 'media_library';
UPDATE gw_modules SET name = 'press-kits' WHERE name = 'press_kits';
UPDATE gw_modules SET name = 'pr-manager' WHERE name = 'pr_manager';