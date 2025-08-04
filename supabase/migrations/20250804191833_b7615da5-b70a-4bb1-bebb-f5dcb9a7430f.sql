-- CRITICAL SECURITY FIXES
-- Phase 1: Fix NULL user_id constraint and add server-side privilege protection

-- 1. First, let's check and fix any NULL user_id records in gw_profiles
-- We'll set them to a special system account or remove them
DELETE FROM public.gw_profiles WHERE user_id IS NULL;

-- 2. Add NOT NULL constraint to prevent future NULL user_id values
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

-- 5. Secure bulk role update function with enhanced protection
CREATE OR REPLACE FUNCTION public.secure_bulk_update_user_roles(
  user_ids uuid[],
  new_role text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer := 0;
  current_user_role text;
  result json;
  user_id uuid;
BEGIN
  -- Check if current user is admin or super-admin
  SELECT role INTO current_user_role 
  FROM public.gw_profiles 
  WHERE user_id = auth.uid();
  
  IF current_user_role NOT IN ('admin', 'super-admin') THEN
    RAISE EXCEPTION 'Permission denied: Only admins can perform bulk role updates';
  END IF;
  
  -- Validate role
  IF new_role NOT IN ('user', 'member', 'alumna', 'fan', 'executive', 'admin', 'super-admin') THEN
    RAISE EXCEPTION 'Invalid role: %', new_role;
  END IF;
  
  -- Only super-admins can assign super-admin role
  IF new_role = 'super-admin' AND current_user_role != 'super-admin' THEN
    RAISE EXCEPTION 'Permission denied: Only super-admins can assign super-admin role';
  END IF;
  
  -- Prevent users from modifying their own role in bulk operations
  IF auth.uid() = ANY(user_ids) THEN
    RAISE EXCEPTION 'Security violation: Cannot modify your own role in bulk operations';
  END IF;
  
  -- Update roles for each user
  FOREACH user_id IN ARRAY user_ids
  LOOP
    -- Skip if user doesn't exist
    IF NOT EXISTS (SELECT 1 FROM public.gw_profiles WHERE gw_profiles.user_id = user_id) THEN
      CONTINUE;
    END IF;
    
    -- Update the role
    UPDATE public.gw_profiles 
    SET role = new_role, updated_at = now()
    WHERE gw_profiles.user_id = user_id;
    
    -- Log the change
    PERFORM public.log_security_event(
      'bulk_role_change',
      'gw_profile',
      user_id,
      jsonb_build_object(
        'new_role', new_role,
        'changed_by', auth.uid(),
        'bulk_operation', true
      )
    );
    
    updated_count := updated_count + 1;
  END LOOP;
  
  result := json_build_object(
    'success', true,
    'updated_count', updated_count,
    'total_requested', array_length(user_ids, 1)
  );
  
  RETURN result;
END;
$$;