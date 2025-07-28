-- Fix security linter warnings

-- 1. Fix function search path issues by updating existing functions
-- These functions need explicit search_path set for security

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

CREATE OR REPLACE FUNCTION public.generate_qr_token(event_id_param uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  token TEXT;
BEGIN
  -- Generate a secure token combining event ID, timestamp, and random string
  token := encode(
    digest(
      event_id_param::text || 
      extract(epoch from now())::text || 
      gen_random_bytes(16)::text, 
      'sha256'
    ), 
    'base64'
  );
  
  RETURN token;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = _user_id AND role = 'admin'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = _user_id AND role = 'super-admin'
    );
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  );
$$;

-- 2. Update other critical security functions
CREATE OR REPLACE FUNCTION public.secure_update_user_role(target_user_id uuid, new_role text, reason text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
    current_user_role text;
    old_role text;
    admin_user_id uuid;
BEGIN
    -- Get current user making the change
    admin_user_id := auth.uid();
    
    -- Check if current user is admin or super-admin
    SELECT role INTO current_user_role 
    FROM public.profiles 
    WHERE id = admin_user_id;
    
    IF current_user_role NOT IN ('admin', 'super-admin') THEN
        RAISE EXCEPTION 'Permission denied: Only admins can update user roles';
    END IF;
    
    -- Prevent self-role changes (critical security check)
    IF target_user_id = admin_user_id THEN
        RAISE EXCEPTION 'Security violation: Cannot modify your own role';
    END IF;
    
    -- Only super-admins can assign super-admin role
    IF new_role = 'super-admin' AND current_user_role != 'super-admin' THEN
        RAISE EXCEPTION 'Permission denied: Only super-admins can assign super-admin role';
    END IF;
    
    -- Get old role for audit
    SELECT role INTO old_role 
    FROM public.profiles 
    WHERE id = target_user_id;
    
    -- Validate role
    IF new_role NOT IN ('admin', 'user', 'super-admin', 'member', 'alumna', 'fan', 'executive') THEN
        RAISE EXCEPTION 'Invalid role: %', new_role;
    END IF;
    
    -- Update the role
    UPDATE public.profiles 
    SET role = new_role, updated_at = now()
    WHERE id = target_user_id;
    
    -- Create audit record in activity logs
    PERFORM public.log_activity(
        admin_user_id,
        'role_changed',
        'user_profile',
        target_user_id,
        jsonb_build_object(
            'old_role', old_role,
            'new_role', new_role,
            'reason', reason
        )
    );
    
    -- Log security event
    PERFORM public.log_security_event(
        'role_changed',
        'user',
        target_user_id,
        jsonb_build_object(
            'old_role', old_role,
            'new_role', new_role,
            'changed_by', admin_user_id,
            'reason', reason
        )
    );
    
    RETURN FOUND;
END;
$$;