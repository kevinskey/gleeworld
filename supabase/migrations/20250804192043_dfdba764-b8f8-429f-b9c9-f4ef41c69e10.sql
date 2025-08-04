-- Fix existing function that references wrong table name
CREATE OR REPLACE FUNCTION public.prevent_gw_profile_privilege_escalation_enhanced()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Prevent users from changing their own admin status
  IF OLD.user_id = auth.uid() AND (
    OLD.is_admin != NEW.is_admin OR 
    OLD.is_super_admin != NEW.is_super_admin OR
    OLD.role != NEW.role
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
  
  -- Only existing admins can grant admin privileges (FIXED: use gw_profiles not profiles)
  IF (OLD.is_admin != NEW.is_admin OR OLD.is_super_admin != NEW.is_super_admin OR OLD.role != NEW.role) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
    ) THEN
      PERFORM public.log_security_event(
        'unauthorized_privilege_escalation_attempt',
        'gw_profile',
        NEW.id,
        jsonb_build_object(
          'attempted_by', auth.uid(),
          'target_user', NEW.user_id
        )
      );
      
      RAISE EXCEPTION 'Permission denied: Only admins can modify privileges';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;