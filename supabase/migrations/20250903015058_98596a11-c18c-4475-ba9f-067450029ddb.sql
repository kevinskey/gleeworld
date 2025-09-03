-- Activate Ariana's permissions
UPDATE username_permissions 
SET is_active = true, 
    updated_at = now()
WHERE user_email = 'arianaswindell@spelman.edu' 
AND is_active = false;