-- Fix RLS policies that directly query gw_profiles (causes recursion)

-- Fix gw_security_audit_log policies
DROP POLICY IF EXISTS "Admins can manage gw_security_audit_log entries" ON public.gw_security_audit_log;
DROP POLICY IF EXISTS "Admins can view security audit log" ON public.gw_security_audit_log;
DROP POLICY IF EXISTS "Only admins can view security audit logs" ON public.gw_security_audit_log;

CREATE POLICY "Admins can view security audit log"
ON public.gw_security_audit_log
FOR SELECT
USING (is_gw_admin_v2());

CREATE POLICY "Admins can insert security audit log"
ON public.gw_security_audit_log
FOR INSERT
WITH CHECK (is_gw_admin_v2());

-- Fix user_role_transitions policies
DROP POLICY IF EXISTS "Admins can insert role transitions" ON public.user_role_transitions;
DROP POLICY IF EXISTS "Admins can view all role transitions" ON public.user_role_transitions;

CREATE POLICY "Admins can view all role transitions"
ON public.user_role_transitions
FOR SELECT
USING (is_gw_admin_v2());

CREATE POLICY "Admins can insert role transitions"
ON public.user_role_transitions
FOR INSERT
WITH CHECK (is_gw_admin_v2());