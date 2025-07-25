-- Security Fix Migration: Fix RLS Policies and Functions for Tables That Now Have RLS Enabled

-- 1. Fix security definer functions - add proper search path
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
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
SET search_path = ''
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
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.user_can_view_budget(budget_id_param uuid, created_by_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
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
SET search_path = ''
AS $$
  SELECT (
    created_by_param = auth.uid() 
    OR public.user_has_budget_permission(budget_id_param, 'edit')
    OR public.user_has_budget_permission(budget_id_param, 'manage')
    OR public.is_admin(auth.uid()) 
    OR public.is_super_admin(auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_budget_permission(budget_id_param uuid, permission_type_param text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.budget_permissions
    WHERE budget_id = budget_id_param 
    AND user_id = auth.uid() 
    AND permission_type = permission_type_param
  );
$$;

CREATE OR REPLACE FUNCTION public.has_username_permission(user_email_param text, module_name_param text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.username_permissions
    WHERE user_email = user_email_param 
    AND module_name = module_name_param
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_username_permissions(user_email_param text)
RETURNS TABLE(module_name text, granted_at timestamp with time zone, expires_at timestamp with time zone, notes text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT up.module_name, up.granted_at, up.expires_at, up.notes
  FROM public.username_permissions up
  WHERE up.user_email = user_email_param 
  AND up.is_active = true
  AND (up.expires_at IS NULL OR up.expires_at > now());
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_sheet_music(sheet_music_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.get_user_admin_status(user_id_param uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'is_admin', COALESCE(is_admin, false),
    'is_super_admin', COALESCE(is_super_admin, false)
  )
  FROM public.gw_profiles 
  WHERE user_id = user_id_param;
$$;

-- 2. Enhanced QR code security function
CREATE OR REPLACE FUNCTION public.generate_secure_qr_token(event_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  token TEXT;
  current_time BIGINT;
BEGIN
  -- Generate timestamp
  current_time := extract(epoch from now());
  
  -- Generate a more secure token using event ID, timestamp, and random bytes
  token := encode(
    digest(
      event_id_param::text || 
      current_time::text || 
      gen_random_bytes(32)::text || 
      auth.uid()::text,
      'sha256'
    ), 
    'base64'
  );
  
  RETURN token;
END;
$$;

-- 3. Enhanced QR scan processing with rate limiting
CREATE OR REPLACE FUNCTION public.process_qr_attendance_scan_secure(
  qr_token_param text, 
  user_id_param uuid, 
  scan_location_param jsonb DEFAULT NULL::jsonb, 
  user_agent_param text DEFAULT NULL::text, 
  ip_address_param inet DEFAULT NULL::inet
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  qr_record RECORD;
  existing_scan_count INTEGER;
  recent_scan_count INTEGER;
  attendance_record RECORD;
BEGIN
  -- Check for rate limiting - max 5 scans per minute per user
  SELECT COUNT(*) INTO recent_scan_count
  FROM public.gw_attendance_qr_scans qrs
  JOIN public.gw_attendance_qr_codes qrc ON qrc.id = qrs.qr_code_id
  WHERE qrs.user_id = user_id_param 
  AND qrs.scanned_at > now() - INTERVAL '1 minute';
  
  IF recent_scan_count >= 5 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Rate limit exceeded. Please wait before scanning again.'
    );
  END IF;
  
  -- Validate user_id matches authenticated user
  IF user_id_param != auth.uid() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User validation failed'
    );
  END IF;
  
  -- Get QR code record with enhanced validation
  SELECT * INTO qr_record
  FROM public.gw_attendance_qr_codes 
  WHERE qr_token = qr_token_param 
  AND is_active = true 
  AND expires_at > now()
  AND created_at > now() - INTERVAL '24 hours'; -- Additional time bound
  
  IF NOT FOUND THEN
    -- Log failed scan attempt
    INSERT INTO public.gw_security_audit_log (
      user_id, action_type, resource_type, 
      details, ip_address, user_agent, created_at
    ) VALUES (
      user_id_param, 'qr_scan_failed', 'attendance_qr',
      jsonb_build_object('token', qr_token_param, 'reason', 'invalid_token'),
      ip_address_param, user_agent_param, now()
    );
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired QR code'
    );
  END IF;
  
  -- Check if user already scanned this QR code
  SELECT COUNT(*) INTO existing_scan_count
  FROM public.gw_attendance_qr_scans
  WHERE qr_code_id = qr_record.id 
  AND user_id = user_id_param;
  
  IF existing_scan_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You have already scanned this QR code'
    );
  END IF;
  
  -- Record the scan
  INSERT INTO public.gw_attendance_qr_scans (
    qr_code_id, user_id, scan_location, user_agent, ip_address
  ) VALUES (
    qr_record.id, user_id_param, scan_location_param, user_agent_param, ip_address_param
  );
  
  -- Update scan count
  UPDATE public.gw_attendance_qr_codes 
  SET scan_count = scan_count + 1
  WHERE id = qr_record.id;
  
  -- Create or update attendance record
  INSERT INTO public.gw_attendance (
    event_id, user_id, status, notes, created_at, updated_at
  ) VALUES (
    qr_record.event_id, user_id_param, 'present', 'Marked via QR scan', now(), now()
  )
  ON CONFLICT (event_id, user_id) 
  DO UPDATE SET 
    status = 'present',
    notes = COALESCE(gw_attendance.notes, '') || ' | QR scan at ' || now()::text,
    updated_at = now();
  
  -- Log successful scan
  INSERT INTO public.gw_security_audit_log (
    user_id, action_type, resource_type, resource_id,
    details, ip_address, user_agent, created_at
  ) VALUES (
    user_id_param, 'qr_scan_success', 'attendance_qr', qr_record.event_id,
    jsonb_build_object('qr_code_id', qr_record.id, 'event_id', qr_record.event_id),
    ip_address_param, user_agent_param, now()
  );
  
  -- Get event details for response
  SELECT title INTO attendance_record
  FROM public.gw_events 
  WHERE id = qr_record.event_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Attendance marked successfully',
    'event_title', COALESCE(attendance_record.title, 'Event'),
    'scanned_at', now()
  );
END;
$$;