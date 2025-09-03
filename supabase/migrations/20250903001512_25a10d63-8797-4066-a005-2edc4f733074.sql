-- Remove all permissions from the OLD username_permissions table for Arianna
UPDATE username_permissions 
SET is_active = false
WHERE user_email = 'arianaswindell@spelman.edu'
AND is_active = true;