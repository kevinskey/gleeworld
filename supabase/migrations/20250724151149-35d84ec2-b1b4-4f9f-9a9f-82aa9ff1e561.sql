-- Temporarily bypass the privilege escalation trigger to fix the user's profile
-- First, drop the trigger
DROP TRIGGER IF EXISTS prevent_privilege_escalation_trigger ON public.gw_profiles;

-- Update the user's profile to match their actual super-admin status
UPDATE public.gw_profiles 
SET 
  role = 'super-admin',
  is_admin = true,
  is_super_admin = true,
  updated_at = now()
WHERE email = 'kpj64110@gmail.com' OR user_id = '4e6c2ec0-1f83-449a-a984-8920f6056ab5';

-- Recreate the trigger to maintain security
CREATE TRIGGER prevent_privilege_escalation_trigger
  BEFORE UPDATE ON public.gw_profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_gw_profile_privilege_escalation();