-- Update Onnesty's profile to have admin privileges
UPDATE public.gw_profiles 
SET is_admin = true, is_super_admin = true 
WHERE user_id = 'b648f12d-9a63-4eae-b768-413a467567b4' AND email = 'onnestypeele@spelman.edu';