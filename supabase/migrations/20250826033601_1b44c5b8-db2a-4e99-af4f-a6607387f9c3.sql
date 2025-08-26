-- Update tour manager role to enable dashboard access
UPDATE public.gw_profiles 
SET role = 'executive'
WHERE user_id = 'b648f12d-9a63-4eae-b768-413a467567b4' 
AND email = 'onnestypeele@spelman.edu';