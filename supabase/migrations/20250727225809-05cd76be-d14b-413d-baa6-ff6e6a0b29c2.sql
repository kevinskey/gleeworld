-- Security improvements: Add secure database functions and improve RLS policies

-- 1. Add secure password validation function
CREATE OR REPLACE FUNCTION public.validate_password_strength(password_text text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  errors text[] := '{}';
BEGIN
  -- Check minimum length
  IF length(password_text) < 8 THEN
    errors := array_append(errors, 'Password must be at least 8 characters long');
  END IF;
  
  -- Check for uppercase letter
  IF password_text !~ '[A-Z]' THEN
    errors := array_append(errors, 'Password must contain at least one uppercase letter');
  END IF;
  
  -- Check for lowercase letter
  IF password_text !~ '[a-z]' THEN
    errors := array_append(errors, 'Password must contain at least one lowercase letter');
  END IF;
  
  -- Check for digit
  IF password_text !~ '[0-9]' THEN
    errors := array_append(errors, 'Password must contain at least one number');
  END IF;
  
  -- Check for special character
  IF password_text !~ '[!@#$%^&*(),.?":{}|<>]' THEN
    errors := array_append(errors, 'Password must contain at least one special character');
  END IF;
  
  result := jsonb_build_object(
    'is_valid', array_length(errors, 1) IS NULL,
    'errors', to_jsonb(errors)
  );
  
  RETURN result;
END;
$$;

-- 2. Enhance the role change audit trigger to prevent self-modification
CREATE OR REPLACE FUNCTION public.prevent_self_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Prevent any user from modifying their own role directly
  IF OLD.id = auth.uid() AND OLD.role != NEW.role THEN
    -- Log the attempt
    PERFORM public.log_security_event(
      'unauthorized_self_role_change',
      'user_profile',
      NEW.id,
      jsonb_build_object(
        'old_role', OLD.role,
        'attempted_new_role', NEW.role,
        'user_id', auth.uid()
      )
    );
    
    RAISE EXCEPTION 'Security violation: Cannot modify your own role. Use proper admin functions.';
  END IF;
  
  -- Only allow admin users to change roles
  IF OLD.role != NEW.role THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
    ) THEN
      PERFORM public.log_security_event(
        'unauthorized_role_change_attempt',
        'user_profile', 
        NEW.id,
        jsonb_build_object(
          'old_role', OLD.role,
          'attempted_new_role', NEW.role,
          'attempted_by', auth.uid()
        )
      );
      
      RAISE EXCEPTION 'Permission denied: Only administrators can change user roles';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Apply the enhanced security trigger to profiles table
DROP TRIGGER IF EXISTS prevent_self_role_escalation ON public.profiles;
CREATE TRIGGER prevent_self_privilege_escalation_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_privilege_escalation();

-- 4. Enhance gw_profiles security as well
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
  
  -- Only existing admins can grant admin privileges
  IF (OLD.is_admin != NEW.is_admin OR OLD.is_super_admin != NEW.is_super_admin OR OLD.role != NEW.role) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
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

-- Apply enhanced trigger to gw_profiles
DROP TRIGGER IF EXISTS prevent_gw_profile_privilege_escalation ON public.gw_profiles;
CREATE TRIGGER prevent_gw_profile_privilege_escalation_enhanced_trigger
  BEFORE UPDATE ON public.gw_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_gw_profile_privilege_escalation_enhanced();

-- 5. Add comprehensive security monitoring function
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action_type text,
  p_target_user_id uuid,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  log_id uuid;
BEGIN
  -- Only allow admins to use this function
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  ) THEN
    RAISE EXCEPTION 'Permission denied: Admin action logging requires admin privileges';
  END IF;
  
  -- Log the admin action
  INSERT INTO public.gw_security_audit_log (
    user_id, action_type, resource_type, resource_id, details, created_at
  ) VALUES (
    auth.uid(), p_action_type, 'admin_action', p_target_user_id, p_details, now()
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- 6. Create rate limiting table for database-level rate limiting
CREATE TABLE IF NOT EXISTS public.security_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  action_type text NOT NULL,
  count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(identifier, action_type)
);

-- Enable RLS on rate limiting table
ALTER TABLE public.security_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only system functions can access rate limiting data
CREATE POLICY "System access only for rate limits"
ON public.security_rate_limits
FOR ALL
USING (false)  -- No direct access
WITH CHECK (false);  -- No direct modifications

-- 7. Add database-level rate limiting function
CREATE OR REPLACE FUNCTION public.check_rate_limit_secure(
  identifier_param text, 
  action_type_param text, 
  max_attempts integer DEFAULT 5, 
  window_minutes integer DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_count integer;
  window_start_time timestamp with time zone;
BEGIN
  window_start_time := now() - (window_minutes || ' minutes')::interval;
  
  -- Clean up old entries
  DELETE FROM public.security_rate_limits 
  WHERE window_start < window_start_time;
  
  -- Get current count for this identifier and action
  SELECT COALESCE(SUM(count), 0) INTO current_count
  FROM public.security_rate_limits
  WHERE identifier = identifier_param 
  AND action_type = action_type_param
  AND window_start >= window_start_time;
  
  -- Check if limit exceeded
  IF current_count >= max_attempts THEN
    -- Log rate limit violation
    PERFORM public.log_security_event(
      'rate_limit_exceeded',
      'security_control',
      null,
      jsonb_build_object(
        'identifier', identifier_param,
        'action_type', action_type_param,
        'current_count', current_count,
        'max_attempts', max_attempts
      )
    );
    RETURN false;
  END IF;
  
  -- Increment counter
  INSERT INTO public.security_rate_limits (identifier, action_type, count)
  VALUES (identifier_param, action_type_param, 1)
  ON CONFLICT (identifier, action_type) 
  DO UPDATE SET 
    count = security_rate_limits.count + 1, 
    created_at = now();
  
  RETURN true;
END;
$$;