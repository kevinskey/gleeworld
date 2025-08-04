-- CRITICAL SECURITY FIXES - Updated approach
-- Phase 1: Fix NULL user_id constraint and add server-side privilege protection

-- 1. First, let's create a system user UUID for orphaned records
-- Using a deterministic UUID for system/orphaned records
DO $$
DECLARE
    system_user_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
    -- Update NULL user_id records to point to system user
    -- This preserves data integrity while fixing the security issue
    UPDATE public.gw_profiles 
    SET user_id = system_user_id,
        role = 'user',
        is_admin = false,
        is_super_admin = false,
        is_exec_board = false,
        full_name = COALESCE(full_name, 'System User'),
        email = COALESCE(email, 'system@gleeworld.org'),
        updated_at = now()
    WHERE user_id IS NULL;
END $$;

-- 2. Now add NOT NULL constraint to prevent future NULL user_id values
ALTER TABLE public.gw_profiles 
ALTER COLUMN user_id SET NOT NULL;

-- 3. Enhanced privilege escalation prevention function
CREATE OR REPLACE FUNCTION public.prevent_self_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent users from changing their own admin status, role, or board membership
  IF OLD.user_id = auth.uid() AND (
    OLD.is_admin != NEW.is_admin OR 
    OLD.is_super_admin != NEW.is_super_admin OR
    OLD.role != NEW.role OR
    OLD.is_exec_board != NEW.is_exec_board
  ) THEN
    -- Log the security violation
    PERFORM public.log_security_event(
      'self_privilege_escalation_attempt',
      'gw_profile',
      NEW.user_id,
      jsonb_build_object(
        'old_is_admin', OLD.is_admin,
        'new_is_admin', NEW.is_admin,
        'old_is_super_admin', OLD.is_super_admin,
        'new_is_super_admin', NEW.is_super_admin,
        'old_role', OLD.role,
        'new_role', NEW.role,
        'old_is_exec_board', OLD.is_exec_board,
        'new_is_exec_board', NEW.is_exec_board,
        'user_id', auth.uid()
      )
    );
    
    RAISE EXCEPTION 'SECURITY VIOLATION: Users cannot modify their own privileges. This incident has been logged.';
  END IF;
  
  -- Only existing admins/super-admins can grant privileges
  IF (OLD.is_admin != NEW.is_admin OR OLD.is_super_admin != NEW.is_super_admin OR 
      OLD.role != NEW.role OR OLD.is_exec_board != NEW.is_exec_board) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    ) THEN
      PERFORM public.log_security_event(
        'unauthorized_privilege_escalation_attempt',
        'gw_profile',
        NEW.user_id,
        jsonb_build_object(
          'attempted_by', auth.uid(),
          'target_user', NEW.user_id
        )
      );
      
      RAISE EXCEPTION 'PERMISSION DENIED: Only administrators can modify user privileges. This incident has been logged.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger to enforce privilege escalation prevention
DROP TRIGGER IF EXISTS trigger_prevent_self_privilege_escalation ON public.gw_profiles;
CREATE TRIGGER trigger_prevent_self_privilege_escalation
  BEFORE UPDATE ON public.gw_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_privilege_escalation();