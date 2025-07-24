-- PHASE 1: CRITICAL SECURITY FIXES

-- 1. Fix Database Function Search Paths (Critical Security Issue)
-- Update all security-critical functions to use explicit search_path

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
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
SET search_path = 'public'
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = _user_id AND role = 'super-admin'
    );
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_view_budget(budget_id_param uuid, created_by_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT (
    created_by_param = auth.uid() 
    OR public.user_has_budget_permission(budget_id_param, 'view')
    OR public.user_has_budget_permission(budget_id_param, 'edit')
    OR public.user_has_budget_permission(budget_id_param, 'manage')
    OR public.is_admin(auth.uid()) 
    OR public.is_super_admin(auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_edit_budget(budget_id_param uuid, created_by_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT (
    created_by_param = auth.uid() 
    OR public.user_has_budget_permission(budget_id_param, 'edit')
    OR public.user_has_budget_permission(budget_id_param, 'manage')
    OR public.is_admin(auth.uid()) 
    OR public.is_super_admin(auth.uid())
  );
$$;

-- 2. Add Role Change Audit Trail and Security Constraints

-- Create audit table for role changes
CREATE TABLE IF NOT EXISTS public.role_change_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    old_role text,
    new_role text NOT NULL,
    changed_by uuid NOT NULL,
    changed_at timestamp with time zone DEFAULT now(),
    reason text,
    ip_address inet,
    user_agent text
);

-- Enable RLS on audit table
ALTER TABLE public.role_change_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view role change audit" ON public.role_change_audit
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
    )
);

-- Function to securely update user roles with audit trail
CREATE OR REPLACE FUNCTION public.secure_update_user_role(
    target_user_id uuid,
    new_role text,
    reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
    
    -- Create audit record
    INSERT INTO public.role_change_audit (
        user_id, old_role, new_role, changed_by, reason
    ) VALUES (
        target_user_id, old_role, new_role, admin_user_id, reason
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

-- 3. Add Security Constraints to Prevent Privilege Escalation

-- Trigger to prevent direct role escalation
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Prevent users from changing their own role directly
    IF OLD.id = auth.uid() AND OLD.role != NEW.role THEN
        RAISE EXCEPTION 'Security violation: Cannot modify your own role directly. Use proper admin functions.';
    END IF;
    
    -- Log suspicious activity
    IF OLD.role != NEW.role THEN
        PERFORM public.log_security_event(
            'direct_role_change_attempt',
            'user',
            NEW.id,
            jsonb_build_object(
                'old_role', OLD.role,
                'new_role', NEW.role,
                'attempted_by', auth.uid()
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Add trigger to profiles table
DROP TRIGGER IF EXISTS prevent_self_role_escalation_trigger ON public.profiles;
CREATE TRIGGER prevent_self_role_escalation_trigger
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_self_role_escalation();

-- 4. Fix GW_Profiles Privilege Escalation Issue

-- Add trigger to prevent privilege escalation in gw_profiles
CREATE OR REPLACE FUNCTION public.prevent_gw_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Add trigger to gw_profiles table
DROP TRIGGER IF EXISTS prevent_gw_profile_privilege_escalation_trigger ON public.gw_profiles;
CREATE TRIGGER prevent_gw_profile_privilege_escalation_trigger
    BEFORE UPDATE ON public.gw_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_gw_profile_privilege_escalation();

-- 5. Enhanced Security Event Logging

-- Update log_security_event function with better security
CREATE OR REPLACE FUNCTION public.log_security_event(
    p_action_type text, 
    p_resource_type text, 
    p_resource_id uuid DEFAULT NULL, 
    p_details jsonb DEFAULT '{}', 
    p_ip_address inet DEFAULT NULL, 
    p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO public.gw_security_audit_log (
    user_id, action_type, resource_type, resource_id,
    details, ip_address, user_agent, created_at
  )
  VALUES (
    auth.uid(), p_action_type, p_resource_type, p_resource_id,
    p_details, p_ip_address, p_user_agent, now()
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;