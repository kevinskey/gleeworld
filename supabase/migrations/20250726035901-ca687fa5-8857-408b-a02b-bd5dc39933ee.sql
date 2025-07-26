-- CRITICAL SECURITY FIXES

-- First, let's identify which tables need RLS policies by querying the database
-- We'll create policies for the most critical tables first

-- 1. Fix missing RLS policies for critical tables
-- gw_profiles table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gw_profiles' AND table_schema = 'public') THEN
        -- Create RLS policies for gw_profiles
        CREATE POLICY "Users can view their own profile" ON public.gw_profiles
        FOR SELECT USING (auth.uid() = user_id);
        
        CREATE POLICY "Users can update their own profile" ON public.gw_profiles
        FOR UPDATE USING (auth.uid() = user_id);
        
        CREATE POLICY "Users can insert their own profile" ON public.gw_profiles
        FOR INSERT WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY "Admins can view all profiles" ON public.gw_profiles
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
            )
        );
        
        CREATE POLICY "Admins can manage all profiles" ON public.gw_profiles
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
            )
        );
    END IF;
END $$;

-- 2. Fix missing RLS policies for other critical tables
-- excuse_requests table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'excuse_requests' AND table_schema = 'public') THEN
        CREATE POLICY "Users can view their own excuse requests" ON public.excuse_requests
        FOR SELECT USING (auth.uid() = user_id);
        
        CREATE POLICY "Users can create their own excuse requests" ON public.excuse_requests
        FOR INSERT WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY "Users can update their own excuse requests" ON public.excuse_requests
        FOR UPDATE USING (auth.uid() = user_id);
        
        CREATE POLICY "Admins can view all excuse requests" ON public.excuse_requests
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
            )
        );
        
        CREATE POLICY "Admins can manage all excuse requests" ON public.excuse_requests
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
            )
        );
    END IF;
END $$;

-- 3. Fix security definer functions - add proper search_path
-- Update existing functions to have proper security settings

-- Fix the function search path issues for security
ALTER FUNCTION public.get_user_admin_status(uuid) SET search_path TO 'public';
ALTER FUNCTION public.is_admin(uuid) SET search_path TO 'public';
ALTER FUNCTION public.is_super_admin(uuid) SET search_path TO 'public';
ALTER FUNCTION public.has_role(uuid, app_role) SET search_path TO 'public';
ALTER FUNCTION public.get_current_user_role() SET search_path TO 'public';
ALTER FUNCTION public.current_user_is_admin() SET search_path TO 'public';
ALTER FUNCTION public.user_can_access_sheet_music(uuid, uuid) SET search_path TO 'public';
ALTER FUNCTION public.log_sheet_music_analytics(uuid, uuid, text, integer, integer, text) SET search_path TO 'public';
ALTER FUNCTION public.get_upcoming_license_expirations(integer) SET search_path TO 'public';
ALTER FUNCTION public.check_vocal_health_alerts(uuid) SET search_path TO 'public';
ALTER FUNCTION public.mark_notification_read(uuid) SET search_path TO 'public';
ALTER FUNCTION public.admin_create_user(text, text, text) SET search_path TO 'public';
ALTER FUNCTION public.log_security_event(text, text, uuid, jsonb, inet, text) SET search_path TO 'public';
ALTER FUNCTION public.cleanup_old_rehearsals() SET search_path TO 'public';
ALTER FUNCTION public.get_on_this_day_content(date) SET search_path TO 'public';
ALTER FUNCTION public.user_has_budget_permission(uuid, text) SET search_path TO 'public';
ALTER FUNCTION public.generate_sheet_music_filename(text, text, text, integer) SET search_path TO 'public';
ALTER FUNCTION public.user_can_edit_budget(uuid, uuid) SET search_path TO 'public';
ALTER FUNCTION public.has_username_permission(text, text) SET search_path TO 'public';
ALTER FUNCTION public.get_user_username_permissions(text) SET search_path TO 'public';
ALTER FUNCTION public.delete_user_and_data(uuid) SET search_path TO 'public';
ALTER FUNCTION public.user_can_view_budget(uuid, uuid) SET search_path TO 'public';
ALTER FUNCTION public.secure_update_user_role(uuid, text, text) SET search_path TO 'public';
ALTER FUNCTION public.create_notification_with_delivery(uuid, text, text, text, text, text, text, jsonb, integer, timestamp with time zone, boolean, boolean) SET search_path TO 'public';
ALTER FUNCTION public.check_rate_limit(text, text, integer, integer) SET search_path TO 'public';
ALTER FUNCTION public.cleanup_expired_notifications() SET search_path TO 'public';
ALTER FUNCTION public.create_recurring_rehearsals(date, date, uuid) SET search_path TO 'public';
ALTER FUNCTION public.process_qr_attendance_scan(text, uuid, jsonb, text, inet) SET search_path TO 'public';