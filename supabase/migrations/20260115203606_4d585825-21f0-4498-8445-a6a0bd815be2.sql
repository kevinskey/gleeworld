-- Fix privilege escalation trigger: detect service role reliably via auth.role()
CREATE OR REPLACE FUNCTION public.prevent_gw_profile_privilege_escalation_enhanced()
RETURNS TRIGGER AS $$
DECLARE
  caller_is_admin BOOLEAN := FALSE;
BEGIN
  -- Allow backend/service operations
  IF auth.role() = 'service_role' OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Prevent users from changing their own admin status/role
  IF OLD.user_id = auth.uid() AND (
    OLD.is_admin IS DISTINCT FROM NEW.is_admin OR 
    OLD.is_super_admin IS DISTINCT FROM NEW.is_super_admin OR
    OLD.role IS DISTINCT FROM NEW.role
  ) THEN
    PERFORM public.log_security_event(
      'unauthorized_self_privilege_escalation',
      'gw_profile',
      NEW.id,
      jsonb_build_object(
        'old_is_admin', OLD.is_admin,
        'new_is_admin', NEW.is_admin,
        'old_is_super_admin', OLD.is_super_admin,
        'new_is_super_admin', NEW.is_super_admin,
        'old_role', OLD.role,
        'new_role', NEW.role,
        'user_id', auth.uid()
      )
    );

    RAISE EXCEPTION 'Security violation: Cannot modify your own privileges';
  END IF;

  -- Only existing admins can grant admin privileges
  IF (
    OLD.is_admin IS DISTINCT FROM NEW.is_admin OR
    OLD.is_super_admin IS DISTINCT FROM NEW.is_super_admin OR
    OLD.role IS DISTINCT FROM NEW.role
  ) THEN
    SELECT EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
    ) INTO caller_is_admin;

    IF NOT caller_is_admin THEN
      PERFORM public.log_security_event(
        'unauthorized_privilege_escalation_attempt',
        'gw_profile',
        NEW.id,
        jsonb_build_object(
          'attempted_by', auth.uid(),
          'target_user', NEW.user_id
        )
      );

      RAISE EXCEPTION 'Permission denied: Only admins can modify admin privileges';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;