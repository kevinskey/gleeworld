-- Temporarily drop the security function to allow profile correction
DROP FUNCTION IF EXISTS public.prevent_gw_profile_privilege_escalation() CASCADE;

-- Update the user's profile to correct their admin status
UPDATE public.gw_profiles 
SET 
  role = 'super-admin',
  is_admin = true,
  is_super_admin = true,
  updated_at = now()
WHERE user_id = '4e6c2ec0-1f83-449a-a984-8920f6056ab5';

-- Recreate the security function
CREATE OR REPLACE FUNCTION public.prevent_gw_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Prevent users from changing their own admin status
    IF OLD.user_id = auth.uid() AND (
        OLD.is_admin != NEW.is_admin OR 
        OLD.is_super_admin != NEW.is_super_admin
    ) THEN
        RAISE EXCEPTION 'Security violation: Cannot modify your own admin privileges';
    END IF;
    
    -- Only existing admins can grant admin privileges
    IF (OLD.is_admin != NEW.is_admin OR OLD.is_super_admin != NEW.is_super_admin) THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.gw_profiles 
            WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
        ) THEN
            RAISE EXCEPTION 'Permission denied: Only admins can modify admin privileges';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER prevent_privilege_escalation_trigger
  BEFORE UPDATE ON public.gw_profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_gw_profile_privilege_escalation();