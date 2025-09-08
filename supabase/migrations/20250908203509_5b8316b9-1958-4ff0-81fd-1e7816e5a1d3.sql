-- Update autumnbrooks@spelman.edu to be a super admin
UPDATE public.gw_profiles 
SET 
  is_super_admin = true,
  is_admin = true,
  role = 'super-admin',
  verified = true,
  updated_at = now()
WHERE email = 'autumnbrooks@spelman.edu';