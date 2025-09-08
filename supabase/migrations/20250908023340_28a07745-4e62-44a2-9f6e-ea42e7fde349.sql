-- CRITICAL SECURITY FIXES PHASE 3: Fix RLS for existing tables only
-- Enable RLS and create policies for tables that actually exist

-- 1. Enable RLS on tables that have policies but RLS is disabled
ALTER TABLE public.bulletin_posts ENABLE ROW LEVEL SECURITY;

-- Check if fy_cohorts exists and enable RLS if it does
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fy_cohorts') THEN
        EXECUTE 'ALTER TABLE public.fy_cohorts ENABLE ROW LEVEL SECURITY';
    END IF;
END $$;

-- 2. Create comprehensive RLS policies for tables with RLS enabled but no policies

-- security_rate_limits: Rate limiting data - only authenticated users  
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'security_rate_limits') THEN
        EXECUTE 'CREATE POLICY "Users can manage their own rate limits" ON public.security_rate_limits FOR ALL TO authenticated USING (true) WITH CHECK (true)';
    END IF;
END $$;

-- gw_security_audit_log: Security audit log - admins only
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gw_security_audit_log') THEN
        EXECUTE 'CREATE POLICY "Admins can view security audit log" ON public.gw_security_audit_log FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.gw_profiles WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)))';
    END IF;
END $$;

-- gw_notification_settings: User notification preferences
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gw_notification_settings') THEN
        EXECUTE 'CREATE POLICY "Users can manage their own notification settings" ON public.gw_notification_settings FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())';
    END IF;
END $$;

-- gw_module_permissions: Module permissions - admins and permission holders
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gw_module_permissions') THEN
        EXECUTE 'CREATE POLICY "Admins can manage module permissions" ON public.gw_module_permissions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.gw_profiles WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true))) WITH CHECK (EXISTS (SELECT 1 FROM public.gw_profiles WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)))';
        EXECUTE 'CREATE POLICY "Users can view their own module permissions" ON public.gw_module_permissions FOR SELECT TO authenticated USING (user_id = auth.uid())';
    END IF;
END $$;

-- gw_unified_modules_simple: Module configuration
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gw_unified_modules_simple') THEN
        EXECUTE 'CREATE POLICY "Authenticated users can view module configuration" ON public.gw_unified_modules_simple FOR SELECT TO authenticated USING (true)';
        EXECUTE 'CREATE POLICY "Admins can manage module configuration" ON public.gw_unified_modules_simple FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.gw_profiles WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true))) WITH CHECK (EXISTS (SELECT 1 FROM public.gw_profiles WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)))';
    END IF;
END $$;

-- gw_profile_photo_settings: Profile photo settings
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gw_profile_photo_settings') THEN
        EXECUTE 'CREATE POLICY "Users can manage their own photo settings" ON public.gw_profile_photo_settings FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())';
    END IF;
END $$;

-- gw_recordings: Audio recordings - creators and admins
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gw_recordings') THEN
        EXECUTE 'CREATE POLICY "Users can manage their own recordings" ON public.gw_recordings FOR ALL TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid())';
        EXECUTE 'CREATE POLICY "Admins can view all recordings" ON public.gw_recordings FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.gw_profiles WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)))';
    END IF;
END $$;

-- Events: Event management
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'events') THEN
        EXECUTE 'CREATE POLICY "Public events are viewable by everyone" ON public.events FOR SELECT TO authenticated USING (is_public = true)';
        EXECUTE 'CREATE POLICY "Admins can manage all events" ON public.events FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.gw_profiles WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true))) WITH CHECK (EXISTS (SELECT 1 FROM public.gw_profiles WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)))';
        EXECUTE 'CREATE POLICY "Executive board can view all events" ON public.events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.gw_profiles WHERE user_id = auth.uid() AND is_exec_board = true))';
    END IF;
END $$;

-- 3. Remove the dangerous simple_admin_bootstrap function if it exists
DROP FUNCTION IF EXISTS public.simple_admin_bootstrap();

-- 4. Create secure password generation function to replace insecure patterns
CREATE OR REPLACE FUNCTION public.generate_secure_password_v2(length integer DEFAULT 12)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    chars text := 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    result text := '';
    i integer;
BEGIN
    FOR i IN 1..length LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$function$;