-- Add missing RLS policies for tables without existing conflicts
-- Based on the linter results, we need policies for multiple tables

-- 1. role_change_audit table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_change_audit' AND table_schema = 'public') THEN
        CREATE POLICY "Only admins can view role change audits" ON public.role_change_audit
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
            )
        );
        
        CREATE POLICY "Only admins can insert role change audits" ON public.role_change_audit
        FOR INSERT WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
            )
        );
    END IF;
END $$;

-- 2. security_rate_limits table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'security_rate_limits' AND table_schema = 'public') THEN
        CREATE POLICY "System can manage rate limits" ON public.security_rate_limits
        FOR ALL USING (true);
    END IF;
END $$;

-- 3. excuse_request_history table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'excuse_request_history' AND table_schema = 'public') THEN
        CREATE POLICY "Users can view history for their excuse requests" ON public.excuse_request_history
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.excuse_requests er
                WHERE er.id = excuse_request_history.excuse_request_id 
                AND er.user_id = auth.uid()
            )
        );
        
        CREATE POLICY "Admins can view all excuse request history" ON public.excuse_request_history
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
            )
        );
        
        CREATE POLICY "System can insert excuse request history" ON public.excuse_request_history
        FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- 4. gw_security_audit_log table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gw_security_audit_log' AND table_schema = 'public') THEN
        CREATE POLICY "Only admins can view security audit logs" ON public.gw_security_audit_log
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
            )
        );
        
        CREATE POLICY "System can insert security audit logs" ON public.gw_security_audit_log
        FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- 5. gw_events table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gw_events' AND table_schema = 'public') THEN
        CREATE POLICY "Everyone can view public events" ON public.gw_events
        FOR SELECT USING (is_public = true);
        
        CREATE POLICY "Authenticated users can view all events" ON public.gw_events
        FOR SELECT USING (auth.uid() IS NOT NULL);
        
        CREATE POLICY "Admins can manage all events" ON public.gw_events
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
            )
        );
        
        CREATE POLICY "Event creators can manage their events" ON public.gw_events
        FOR ALL USING (created_by = auth.uid());
    END IF;
END $$;

-- 6. events table (if it doesn't have policies)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events' AND table_schema = 'public') 
    AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND schemaname = 'public') THEN
        CREATE POLICY "Everyone can view events" ON public.events
        FOR SELECT USING (true);
        
        CREATE POLICY "Admins can manage all events" ON public.events
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
            )
        );
        
        CREATE POLICY "Event creators can manage their events" ON public.events
        FOR ALL USING (created_by = auth.uid());
    END IF;
END $$;