-- Temporarily disable the trigger to update super admin status
ALTER TABLE public.gw_profiles DISABLE TRIGGER prevent_gw_profile_privilege_escalation_enhanced_trigger;

-- Update autumnbrooks@spelman.edu to be a super admin
UPDATE public.gw_profiles 
SET 
  is_super_admin = true,
  is_admin = true,
  role = 'super-admin',
  verified = true,
  updated_at = now()
WHERE email = 'autumnbrooks@spelman.edu';

-- Re-enable the trigger
ALTER TABLE public.gw_profiles ENABLE TRIGGER prevent_gw_profile_privilege_escalation_enhanced_trigger;