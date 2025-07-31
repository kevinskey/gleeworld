-- CRITICAL SECURITY FIX: Replace overly permissive RLS policies on gw_profiles
-- This prevents users from escalating their own privileges

-- First, drop the dangerous existing policies
DROP POLICY IF EXISTS "gw_profiles_basic_access" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_select" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_insert" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_update" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_delete" ON public.gw_profiles;

-- Create secure granular policies

-- 1. Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON public.gw_profiles 
FOR SELECT 
USING (user_id = auth.uid());

-- 2. Users can view basic info of other verified users (for directory purposes)
CREATE POLICY "Users can view verified profiles basic info" 
ON public.gw_profiles 
FOR SELECT 
USING (verified = true AND user_id != auth.uid());

-- 3. Users can insert their own profile (during signup)
CREATE POLICY "Users can create own profile" 
ON public.gw_profiles 
FOR INSERT 
WITH CHECK (user_id = auth.uid() AND is_admin = false AND is_super_admin = false AND is_exec_board = false);

-- 4. Users can update non-privileged fields only
CREATE POLICY "Users can update own non-privileged fields" 
ON public.gw_profiles 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid() AND
  -- Prevent escalation of privileges - only allow if values haven't changed
  (is_admin IS NULL OR is_admin = (SELECT is_admin FROM public.gw_profiles WHERE user_id = auth.uid())) AND
  (is_super_admin IS NULL OR is_super_admin = (SELECT is_super_admin FROM public.gw_profiles WHERE user_id = auth.uid())) AND
  (is_exec_board IS NULL OR is_exec_board = (SELECT is_exec_board FROM public.gw_profiles WHERE user_id = auth.uid())) AND
  (exec_board_role IS NULL OR exec_board_role = (SELECT exec_board_role FROM public.gw_profiles WHERE user_id = auth.uid())) AND
  (role IS NULL OR role = (SELECT role FROM public.gw_profiles WHERE user_id = auth.uid()))
);

-- 5. Only admins can manage all profiles
CREATE POLICY "Admins can manage all profiles" 
ON public.gw_profiles 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles admin_profile 
    WHERE admin_profile.user_id = auth.uid() 
    AND (admin_profile.is_admin = true OR admin_profile.is_super_admin = true)
  )
);

-- 6. Only super admins can delete profiles
CREATE POLICY "Super admins can delete profiles" 
ON public.gw_profiles 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles admin_profile 
    WHERE admin_profile.user_id = auth.uid() 
    AND admin_profile.is_super_admin = true
  )
);

-- Fix database function security issues - set proper search paths
CREATE OR REPLACE FUNCTION public.is_current_user_gw_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_admin_or_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER  
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  );
$$;

-- Add secure admin verification function
CREATE OR REPLACE FUNCTION public.verify_admin_access(requesting_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = requesting_user_id 
    AND (is_admin = true OR is_super_admin = true)
    AND verified = true
  );
$$;

-- Secure the overly permissive contract templates policies
DROP POLICY IF EXISTS "Allow anyone to delete templates" ON public.contract_templates;
DROP POLICY IF EXISTS "Allow anyone to insert templates" ON public.contract_templates;
DROP POLICY IF EXISTS "Allow anyone to select templates" ON public.contract_templates;
DROP POLICY IF EXISTS "Allow anyone to update templates" ON public.contract_templates;

-- Replace with secure policies for contract templates
CREATE POLICY "Authenticated users can view active templates"
ON public.contract_templates
FOR SELECT
USING (is_active = true AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage contract templates"
ON public.contract_templates
FOR ALL
USING (public.verify_admin_access(auth.uid()));

-- Secure admin contract notifications
DROP POLICY IF EXISTS "Allow public access to admin notifications" ON public.admin_contract_notifications;

CREATE POLICY "Admins can manage admin notifications"
ON public.admin_contract_notifications
FOR ALL
USING (public.verify_admin_access(auth.uid()));

-- Add rate limiting table for security
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

CREATE POLICY "System can manage rate limits"
ON public.security_rate_limits
FOR ALL
USING (true);