-- Create a more secure function to prevent privilege escalation
CREATE OR REPLACE FUNCTION public.secure_bulk_update_user_roles(
  target_user_ids uuid[],
  new_role text,
  reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_role text;
  current_user_id uuid;
  target_id uuid;
  updated_count integer := 0;
  errors jsonb := '[]'::jsonb;
  result jsonb;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- Check if current user is admin or super-admin
  SELECT role INTO current_user_role 
  FROM public.gw_profiles 
  WHERE user_id = current_user_id;
  
  IF current_user_role NOT IN ('admin', 'super-admin') THEN
    RAISE EXCEPTION 'Permission denied: Only admins can update user roles';
  END IF;
  
  -- Prevent self-role changes (critical security check)
  IF current_user_id = ANY(target_user_ids) THEN
    RAISE EXCEPTION 'Security violation: Cannot modify your own role through bulk operations';
  END IF;
  
  -- Only super-admins can assign super-admin role
  IF new_role = 'super-admin' AND current_user_role != 'super-admin' THEN
    RAISE EXCEPTION 'Permission denied: Only super-admins can assign super-admin role';
  END IF;
  
  -- Validate role
  IF new_role NOT IN ('admin', 'user', 'super-admin', 'member', 'alumna', 'fan', 'executive') THEN
    RAISE EXCEPTION 'Invalid role: %', new_role;
  END IF;
  
  -- Process each target user
  FOREACH target_id IN ARRAY target_user_ids
  LOOP
    -- Double-check that target is not current user
    IF target_id = current_user_id THEN
      errors := errors || jsonb_build_object(
        'user_id', target_id,
        'error', 'Cannot modify your own role'
      );
      CONTINUE;
    END IF;
    
    BEGIN
      -- Update both profiles tables
      UPDATE public.profiles 
      SET role = new_role, updated_at = now()
      WHERE id = target_id;
      
      UPDATE public.gw_profiles 
      SET role = new_role, updated_at = now()
      WHERE user_id = target_id;
      
      -- Log the action
      PERFORM public.log_security_event(
        'bulk_role_changed',
        'user',
        target_id,
        jsonb_build_object(
          'new_role', new_role,
          'changed_by', current_user_id,
          'reason', reason,
          'bulk_operation', true
        )
      );
      
      updated_count := updated_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      errors := errors || jsonb_build_object(
        'user_id', target_id,
        'error', SQLERRM
      );
    END;
  END LOOP;
  
  result := jsonb_build_object(
    'updated_count', updated_count,
    'total_requested', array_length(target_user_ids, 1),
    'errors', errors,
    'success', updated_count > 0
  );
  
  RETURN result;
END;
$$;

-- Enhanced trigger to prevent privilege escalation in both tables
CREATE OR REPLACE FUNCTION public.prevent_privilege_escalation_enhanced()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Prevent users from changing their own admin status or role
  IF OLD.id = auth.uid() AND (
    (TG_TABLE_NAME = 'profiles' AND OLD.role != NEW.role) OR
    (TG_TABLE_NAME = 'gw_profiles' AND (
      OLD.user_id = auth.uid() AND (
        OLD.is_admin != NEW.is_admin OR 
        OLD.is_super_admin != NEW.is_super_admin OR
        OLD.role != NEW.role
      )
    ))
  ) THEN
    PERFORM public.log_security_event(
      'unauthorized_self_privilege_escalation',
      TG_TABLE_NAME,
      COALESCE(NEW.id, NEW.user_id),
      jsonb_build_object(
        'attempted_by', auth.uid(),
        'table', TG_TABLE_NAME
      )
    );
    
    RAISE EXCEPTION 'Security violation: Cannot modify your own privileges';
  END IF;
  
  -- Only existing admins can grant admin privileges
  IF (
    (TG_TABLE_NAME = 'profiles' AND OLD.role != NEW.role) OR
    (TG_TABLE_NAME = 'gw_profiles' AND (
      OLD.is_admin != NEW.is_admin OR 
      OLD.is_super_admin != NEW.is_super_admin OR 
      OLD.role != NEW.role
    ))
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    ) THEN
      PERFORM public.log_security_event(
        'unauthorized_privilege_escalation_attempt',
        TG_TABLE_NAME,
        COALESCE(NEW.id, NEW.user_id),
        jsonb_build_object(
          'attempted_by', auth.uid(),
          'target_user', COALESCE(NEW.id, NEW.user_id)
        )
      );
      
      RAISE EXCEPTION 'Permission denied: Only admins can modify privileges';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply the trigger to both tables if not already exists
DROP TRIGGER IF EXISTS prevent_privilege_escalation_profiles ON public.profiles;
CREATE TRIGGER prevent_privilege_escalation_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_privilege_escalation_enhanced();

DROP TRIGGER IF EXISTS prevent_privilege_escalation_gw_profiles ON public.gw_profiles;
CREATE TRIGGER prevent_privilege_escalation_gw_profiles
  BEFORE UPDATE ON public.gw_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_privilege_escalation_enhanced();