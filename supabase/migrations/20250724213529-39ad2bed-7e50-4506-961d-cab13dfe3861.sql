-- Fix the infinite recursion in gw_profiles RLS policies
-- Drop the problematic trigger and recreate it properly
DROP TRIGGER IF EXISTS prevent_privilege_escalation_trigger ON public.gw_profiles;
DROP FUNCTION IF EXISTS public.prevent_gw_profile_privilege_escalation() CASCADE;

-- Create a secure function that doesn't cause recursion
CREATE OR REPLACE FUNCTION public.get_user_admin_status(user_id_param uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'is_admin', COALESCE(is_admin, false),
    'is_super_admin', COALESCE(is_super_admin, false)
  )
  FROM public.gw_profiles 
  WHERE user_id = user_id_param;
$$;

-- Recreate the privilege escalation prevention function without recursion
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
    -- Use the profiles table instead to avoid recursion
    IF (OLD.is_admin != NEW.is_admin OR OLD.is_super_admin != NEW.is_super_admin) THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
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