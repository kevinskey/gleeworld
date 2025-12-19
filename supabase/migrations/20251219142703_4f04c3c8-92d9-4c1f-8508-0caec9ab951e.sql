-- Activate the Messenger Admin module
UPDATE public.gw_modules 
SET is_active = true, updated_at = now() 
WHERE key = 'messenger-admin';