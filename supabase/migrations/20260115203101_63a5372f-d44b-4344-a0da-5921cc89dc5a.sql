-- Update the trigger function to allow service-role operations
-- Service role operations have auth.uid() as NULL or can be detected via current_setting
CREATE OR REPLACE FUNCTION public.prevent_gw_profile_privilege_escalation_enhanced()
RETURNS TRIGGER AS $$
DECLARE
  caller_is_admin BOOLEAN := FALSE;
  jwt_role TEXT;
BEGIN
  -- Get the current role from JWT (service_role bypasses security)
  jwt_role := current_setting('request.jwt.claims', true)::json->>'role';
  
  -- Allow service-role operations (when role is 'service_role' or auth.uid() is NULL)
  IF jwt_role = 'service_role' OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Prevent users from changing their own admin status
  IF OLD.user_id = auth.uid() AND (
    OLD.is_admin IS DISTINCT FROM NEW.is_admin OR 
    OLD.is_super_admin IS DISTINCT FROM NEW.is_super_admin OR
    OLD.role IS DISTINCT FROM NEW.role
  ) THEN
    RAISE EXCEPTION 'Security violation: Cannot modify your own privileges';
  END IF;
  
  -- Only existing admins can grant admin privileges
  IF (OLD.is_admin IS DISTINCT FROM NEW.is_admin OR OLD.is_super_admin IS DISTINCT FROM NEW.is_super_admin OR OLD.role IS DISTINCT FROM NEW.role) THEN
    SELECT EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
    ) INTO caller_is_admin;
    
    IF NOT caller_is_admin THEN
      RAISE EXCEPTION 'Permission denied: Only admins can modify admin privileges';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;