-- CRITICAL SECURITY FIXES PHASE 2: Enable RLS and Create Missing Policies
-- Fix the critical RLS disabled errors and missing policies

-- 1. Enable RLS on tables that have policies but RLS is disabled
ALTER TABLE public.bulletin_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fy_cohorts ENABLE ROW LEVEL SECURITY;

-- 2. Create comprehensive RLS policies for tables with RLS enabled but no policies

-- security_rate_limits: Rate limiting data - only authenticated users
CREATE POLICY "Users can manage their own rate limits"
ON public.security_rate_limits
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- gw_security_audit_log: Security audit log - admins only
CREATE POLICY "Admins can view security audit log"
ON public.gw_security_audit_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- gw_audition_appointments: Audition appointments
CREATE POLICY "Admins can manage audition appointments"
ON public.gw_audition_appointments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Users can view their own appointments
CREATE POLICY "Users can view their own audition appointments"
ON public.gw_audition_appointments
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- gw_notification_settings: User notification preferences
CREATE POLICY "Users can manage their own notification settings"
ON public.gw_notification_settings
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- gw_module_permissions: Module permissions - admins and permission holders
CREATE POLICY "Admins can manage module permissions"
ON public.gw_module_permissions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Users can view their own permissions
CREATE POLICY "Users can view their own module permissions"
ON public.gw_module_permissions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- gw_unified_modules_simple: Module configuration
CREATE POLICY "Authenticated users can view module configuration"
ON public.gw_unified_modules_simple
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage module configuration"
ON public.gw_unified_modules_simple
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- gw_profile_photo_settings: Profile photo settings
CREATE POLICY "Users can manage their own photo settings"
ON public.gw_profile_photo_settings
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- gw_recordings: Audio recordings - creators and admins
CREATE POLICY "Users can manage their own recordings"
ON public.gw_recordings
FOR ALL
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can view all recordings"
ON public.gw_recordings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Events: Event management
CREATE POLICY "Public events are viewable by everyone"
ON public.events
FOR SELECT
TO authenticated
USING (is_public = true);

CREATE POLICY "Admins can manage all events"
ON public.events
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Executive board can view all events
CREATE POLICY "Executive board can view all events"
ON public.events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND is_exec_board = true
  )
);

-- 3. Remove the dangerous simple_admin_bootstrap function
DROP FUNCTION IF EXISTS public.simple_admin_bootstrap();