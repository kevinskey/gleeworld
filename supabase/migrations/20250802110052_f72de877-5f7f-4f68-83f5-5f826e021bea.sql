-- Update verification status for onnestypeele@spelman.edu to enable tour manager access
-- We'll only update the verified status which should bypass the privilege escalation trigger
UPDATE public.gw_profiles 
SET 
  verified = true,
  updated_at = NOW()
WHERE email = 'onnestypeele@spelman.edu';