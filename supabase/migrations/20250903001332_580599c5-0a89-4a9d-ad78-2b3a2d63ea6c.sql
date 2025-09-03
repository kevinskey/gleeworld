-- Remove all module permissions for Arianna Swindell
UPDATE username_module_permissions 
SET is_active = false
WHERE user_id = '6f14998d-a7ba-47f2-a331-5bc44445ec98'
AND is_active = true;