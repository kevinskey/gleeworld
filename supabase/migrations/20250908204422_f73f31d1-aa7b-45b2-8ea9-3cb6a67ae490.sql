UPDATE public.gw_profiles 
SET is_super_admin = true, is_admin = true, role = 'super-admin', verified = true
WHERE email = 'autumnbrooks@spelman.edu';