-- SECURITY FIXES - PHASE 2
-- Address Remaining Security Issues

-- 1. Fix remaining functions with missing search path
CREATE OR REPLACE FUNCTION public.log_sheet_music_action(p_sheet_music_id uuid, p_user_id uuid, p_action_type text, p_page_number integer DEFAULT NULL::integer, p_session_duration integer DEFAULT NULL::integer, p_device_type text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  analytics_id UUID;
BEGIN
  INSERT INTO public.gw_sheet_music_analytics (
    sheet_music_id,
    user_id, 
    action_type,
    page_number,
    session_duration,
    device_type,
    timestamp_recorded
  ) VALUES (
    p_sheet_music_id,
    p_user_id,
    p_action_type,
    p_page_number,
    p_session_duration,
    p_device_type,
    NOW()
  ) RETURNING id INTO analytics_id;
  
  RETURN analytics_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.user_can_access_sheet_music(sheet_music_id_param uuid, user_id_param uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_sheet_music sm
    WHERE sm.id = sheet_music_id_param
    AND (
      sm.is_public = true OR
      sm.created_by = user_id_param OR
      EXISTS (
        SELECT 1 FROM public.gw_sheet_music_permissions smp
        WHERE smp.sheet_music_id = sheet_music_id_param 
        AND smp.user_id = user_id_param 
        AND smp.permission_type IN ('view', 'annotate', 'manage')
        AND smp.is_active = true
        AND (smp.expires_at IS NULL OR smp.expires_at > now())
      ) OR
      EXISTS (
        SELECT 1 FROM public.gw_profiles p
        WHERE p.user_id = user_id_param AND p.is_admin = true
      )
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.log_sheet_music_analytics(sheet_music_id_param uuid, user_id_param uuid, action_type_param text, page_number_param integer DEFAULT NULL::integer, session_duration_param integer DEFAULT NULL::integer, device_type_param text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  analytics_id UUID;
BEGIN
  INSERT INTO public.gw_sheet_music_analytics (
    sheet_music_id, user_id, action_type, page_number, 
    session_duration, device_type
  )
  VALUES (
    sheet_music_id_param, user_id_param, action_type_param, 
    page_number_param, session_duration_param, device_type_param
  )
  RETURNING id INTO analytics_id;
  
  RETURN analytics_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_upcoming_license_expirations(days_ahead integer DEFAULT 30)
 RETURNS TABLE(id uuid, music_title text, license_type text, expires_on date, days_until_expiry integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT 
    le.id,
    sm.title as music_title,
    le.license_type,
    le.expires_on,
    (le.expires_on - CURRENT_DATE) as days_until_expiry
  FROM public.gw_licensing_entries le
  JOIN public.gw_sheet_music sm ON sm.id = le.music_id
  WHERE le.is_active = true
    AND le.expires_on IS NOT NULL
    AND le.expires_on <= CURRENT_DATE + INTERVAL '1 day' * days_ahead
    AND le.expires_on >= CURRENT_DATE
  ORDER BY le.expires_on ASC;
$function$;

CREATE OR REPLACE FUNCTION public.check_vocal_health_alerts(target_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.gw_vocal_health_entries 
    WHERE user_id = target_user_id 
    AND vocal_status = 'Fatigued'
    AND date >= CURRENT_DATE - INTERVAL '5 days'
    GROUP BY user_id
    HAVING COUNT(*) >= 3
  );
END;
$function$;

-- 2. Add RLS Policies for remaining tables without policies

-- alumnae_audio_stories - Add comprehensive policies
CREATE POLICY "Users can view their own audio stories"
ON public.alumnae_audio_stories
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own audio stories"
ON public.alumnae_audio_stories
FOR UPDATE
USING (user_id = auth.uid());

-- alumnae_messages - Add user policies
CREATE POLICY "Users can view their own messages"
ON public.alumnae_messages
FOR SELECT
USING (sender_id = auth.uid());

-- alumnae_stories - Add user policies  
CREATE POLICY "Users can view their own stories"
ON public.alumnae_stories
FOR SELECT
USING (user_id = auth.uid());

-- audio_archive - Add comprehensive policies
CREATE POLICY "Users can view their own audio archive entries"
ON public.audio_archive
FOR SELECT
USING (created_by = auth.uid() OR is_public = true);

-- bulletin_posts - Add user policies
CREATE POLICY "Users can view their own bulletin posts"
ON public.bulletin_posts
FOR SELECT
USING (user_id = auth.uid());

-- 3. Strengthen Authentication Configuration
-- These require manual configuration in Supabase Dashboard:
-- - Reduce OTP expiry to 600 seconds (10 minutes)
-- - Enable password leak protection

-- 4. Enhanced Security Event Logging
CREATE OR REPLACE FUNCTION public.log_security_event_enhanced(
  p_action_type text, 
  p_resource_type text, 
  p_resource_id uuid DEFAULT NULL, 
  p_details jsonb DEFAULT '{}', 
  p_ip_address inet DEFAULT NULL, 
  p_user_agent text DEFAULT NULL,
  p_severity text DEFAULT 'info'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  log_id uuid;
  risk_score integer DEFAULT 0;
BEGIN
  -- Calculate risk score based on action type
  CASE p_action_type
    WHEN 'login_failed' THEN risk_score := 3;
    WHEN 'privilege_escalation_attempt' THEN risk_score := 10;
    WHEN 'unauthorized_access_attempt' THEN risk_score := 7;
    WHEN 'rate_limit_exceeded' THEN risk_score := 5;
    ELSE risk_score := 1;
  END CASE;
  
  INSERT INTO public.gw_security_audit_log (
    user_id, action_type, resource_type, resource_id,
    details, ip_address, user_agent, created_at
  )
  VALUES (
    auth.uid(), p_action_type, p_resource_type, p_resource_id,
    p_details || jsonb_build_object('severity', p_severity, 'risk_score', risk_score), 
    p_ip_address, p_user_agent, now()
  )
  RETURNING id INTO log_id;
  
  -- Alert on high risk events
  IF risk_score >= 7 THEN
    INSERT INTO public.gw_notifications (
      user_id, title, message, type, priority
    )
    SELECT 
      p.user_id,
      'Security Alert',
      'High-risk security event detected: ' || p_action_type,
      'security',
      10
    FROM public.gw_profiles p 
    WHERE p.is_admin = true OR p.is_super_admin = true;
  END IF;
  
  RETURN log_id;
END;
$function$;

-- 5. Create session management table and functions
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_token text NOT NULL UNIQUE,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  last_activity timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '1 hour'),
  is_active boolean DEFAULT true
);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Session policies
CREATE POLICY "Users can view their own sessions"
ON public.user_sessions
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own sessions"
ON public.user_sessions
FOR UPDATE
USING (user_id = auth.uid());

-- Session management functions
CREATE OR REPLACE FUNCTION public.create_user_session(p_user_id uuid, p_ip_address inet DEFAULT NULL, p_user_agent text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  session_token text;
  session_id uuid;
BEGIN
  -- Generate secure session token
  session_token := encode(gen_random_bytes(32), 'base64');
  
  -- Insert session
  INSERT INTO public.user_sessions (user_id, session_token, ip_address, user_agent)
  VALUES (p_user_id, session_token, p_ip_address, p_user_agent)
  RETURNING id INTO session_id;
  
  -- Log session creation
  PERFORM public.log_security_event_enhanced(
    'session_created',
    'user_session',
    session_id,
    jsonb_build_object('user_id', p_user_id),
    p_ip_address,
    p_user_agent
  );
  
  RETURN session_token;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_user_session(p_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  session_record RECORD;
BEGIN
  -- Get session record
  SELECT * INTO session_record
  FROM public.user_sessions
  WHERE session_token = p_session_token 
  AND is_active = true 
  AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or expired session');
  END IF;
  
  -- Update last activity
  UPDATE public.user_sessions 
  SET last_activity = now()
  WHERE id = session_record.id;
  
  RETURN jsonb_build_object(
    'valid', true, 
    'user_id', session_record.user_id,
    'session_id', session_record.id
  );
END;
$function$;

-- 6. Cleanup expired sessions function
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  cleaned_count integer;
BEGIN
  UPDATE public.user_sessions 
  SET is_active = false
  WHERE expires_at < now() AND is_active = true;
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  RETURN cleaned_count;
END;
$function$;