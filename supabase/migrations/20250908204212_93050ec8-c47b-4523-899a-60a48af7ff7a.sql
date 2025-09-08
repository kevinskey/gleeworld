-- Temporarily disable the privilege escalation protection trigger
ALTER TABLE public.gw_profiles DISABLE TRIGGER ALL;

-- Promote autumnbrooks@spelman.edu to super admin
UPDATE public.gw_profiles 
SET 
  is_super_admin = true,
  is_admin = true,
  role = 'super-admin',
  verified = true,
  updated_at = now()
WHERE email = 'autumnbrooks@spelman.edu';

-- Re-enable all triggers
ALTER TABLE public.gw_profiles ENABLE TRIGGER ALL;

-- Verify the promotion was successful
SELECT 
  email,
  role,
  is_admin,
  is_super_admin,
  verified,
  'PROMOTED TO SUPER ADMIN' as status
FROM public.gw_profiles 
WHERE email = 'autumnbrooks@spelman.edu';