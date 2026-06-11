-- QR vet fixes (2026-06-11)
-- 7 of 8 token-minting RPCs were SECURITY DEFINER with no role check and
-- granted to anon+authenticated: any caller could mint a valid attendance QR
-- for any event/session (self check-in) and deactivate the instructor's live
-- QR as a side effect. They also trusted a caller-supplied created_by.
-- Fix: shared guard helpers, gate every generator, stamp generated_by from
-- auth.uid(), revoke anon, and revoke authenticated on the unused generators.

-- Guard: admin / super-admin / exec board / event creator
CREATE OR REPLACE FUNCTION public.can_manage_event_qr(p_event_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE user_id = auth.uid()
      AND (is_admin = true OR is_super_admin = true OR is_exec_board = true
           OR role IN ('admin', 'super-admin'))
  )
  OR EXISTS (
    SELECT 1 FROM gw_executive_board_members
    WHERE user_id = auth.uid() AND is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM gw_events
    WHERE id = p_event_id AND created_by = auth.uid()
  );
$$;

-- Guard: course instructor/TA for the session, or admin / exec board
CREATE OR REPLACE FUNCTION public.can_manage_session_qr(p_session_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM gw_attendance_sessions s
    JOIN gw_course_enrollments e ON e.course_id = s.course_id
    WHERE s.id = p_session_id
      AND e.user_id = auth.uid()
      AND e.role IN ('instructor', 'ta')
  )
  OR EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE user_id = auth.uid()
      AND (is_admin = true OR is_super_admin = true OR is_exec_board = true
           OR role IN ('admin', 'super-admin'))
  )
  OR EXISTS (
    SELECT 1 FROM gw_executive_board_members
    WHERE user_id = auth.uid() AND is_active = true
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_manage_event_qr(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_session_qr(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_event_qr(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_session_qr(uuid) TO authenticated, service_role;

-- Event-level token generator (used by QRAttendanceGenerator)
CREATE OR REPLACE FUNCTION public.generate_qr_attendance_token(p_event_id uuid, p_created_by uuid, p_expires_in_minutes integer DEFAULT 30)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_token text;
  v_expires_at timestamptz;
begin
  IF NOT public.can_manage_event_qr(p_event_id) THEN
    RAISE EXCEPTION 'Insufficient permissions to generate QR tokens';
  END IF;

  -- Generate a secure hex token
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_expires_at := now() + (p_expires_in_minutes || ' minutes')::interval;

  -- Deactivate any previous active tokens for this event
  UPDATE gw_attendance_qr_codes
  SET is_active = false, updated_at = now()
  WHERE event_id = p_event_id AND is_active = true;

  INSERT INTO gw_attendance_qr_codes (
    qr_token,
    event_id,
    generated_by,
    expires_at,
    is_active,
    context_type
  ) VALUES (
    v_token,
    p_event_id,
    auth.uid(),
    v_expires_at,
    true,
    'event'
  );

  RETURN v_token;
exception when others then
  raise exception 'Failed to create QR token: %', SQLERRM;
end;
$function$;

-- Rotating event QR generator (used by EventQRCode)
CREATE OR REPLACE FUNCTION public.generate_rotating_qr_code(p_event_id uuid, p_created_by uuid, p_rotate_interval_seconds integer DEFAULT 60, p_time_window_enabled boolean DEFAULT false, p_time_window_minutes integer DEFAULT 15, p_geofence_enabled boolean DEFAULT false, p_geofence_latitude double precision DEFAULT NULL::double precision, p_geofence_longitude double precision DEFAULT NULL::double precision, p_geofence_radius_meters integer DEFAULT 100)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_qr_id uuid;
  v_qr_token text;
  v_pin_code text;
  v_parent_id uuid;
  v_sequence integer;
  v_expires_at timestamptz;
  v_effective_expiry_minutes integer;
BEGIN
  IF NOT public.can_manage_event_qr(p_event_id) THEN
    RAISE EXCEPTION 'Insufficient permissions to generate QR tokens';
  END IF;

  -- Find existing parent QR or get the latest sequence
  SELECT id, COALESCE(rotation_sequence, 0) + 1
  INTO v_parent_id, v_sequence
  FROM gw_attendance_qr_codes
  WHERE event_id = p_event_id
    AND auto_rotate_enabled = true
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_parent_id IS NULL THEN
    v_sequence := 1;
  END IF;

  -- Deactivate previous QR codes for this event
  UPDATE gw_attendance_qr_codes
  SET is_active = false
  WHERE event_id = p_event_id AND is_active = true;

  -- Generate a secure random token
  v_qr_token := encode(gen_random_uuid()::text::bytea, 'hex') || '-' || extract(epoch from now())::text;

  -- Generate a 6-digit PIN code
  v_pin_code := lpad(floor(random() * 1000000)::text, 6, '0');

  IF p_time_window_enabled AND p_time_window_minutes > 0 THEN
    v_effective_expiry_minutes := p_time_window_minutes;
  ELSE
    v_effective_expiry_minutes := 30;
  END IF;

  IF v_effective_expiry_minutes < 5 THEN
    v_effective_expiry_minutes := 5;
  END IF;

  v_expires_at := now() + (v_effective_expiry_minutes || ' minutes')::interval;

  INSERT INTO gw_attendance_qr_codes (
    event_id, qr_token, generated_by, pin_code, is_active,
    auto_rotate_enabled, rotate_interval_seconds,
    time_window_enabled, time_window_minutes,
    geofence_enabled, geofence_latitude, geofence_longitude, geofence_radius_meters,
    parent_qr_id, rotation_sequence, expires_at
  ) VALUES (
    p_event_id, v_qr_token, auth.uid(), v_pin_code, true,
    true, p_rotate_interval_seconds,
    p_time_window_enabled, p_time_window_minutes,
    p_geofence_enabled, p_geofence_latitude, p_geofence_longitude, p_geofence_radius_meters,
    CASE WHEN v_sequence > 1 THEN v_parent_id ELSE NULL END,
    v_sequence, v_expires_at
  )
  RETURNING id INTO v_qr_id;

  -- Return BOTH 'token' and 'qr_token' for backward compatibility
  RETURN jsonb_build_object(
    'success', true,
    'qr_id', v_qr_id,
    'token', v_qr_token,
    'qr_token', v_qr_token,
    'token_id', v_qr_id,
    'pin_code', v_pin_code,
    'expires_at', v_expires_at,
    'sequence', v_sequence,
    'time_window_minutes', v_effective_expiry_minutes
  );
END;
$function$;

-- Session QR generator, 3-arg overload (used by AttendanceQRDisplay)
CREATE OR REPLACE FUNCTION public.generate_session_qr_code(p_session_id uuid, p_generated_by uuid, p_expires_in_minutes integer DEFAULT 2)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_qr_token text;
  v_expires_at timestamptz;
  v_qr_id uuid;
  v_session_course_id uuid;
BEGIN
  IF NOT public.can_manage_session_qr(p_session_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions to generate QR codes');
  END IF;

  -- Get the course_id from the session
  SELECT course_id INTO v_session_course_id
  FROM gw_attendance_sessions
  WHERE id = p_session_id;

  IF v_session_course_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session not found');
  END IF;

  -- Generate URL-safe token (replace + with -, / with _, remove = padding)
  v_qr_token := encode(extensions.gen_random_bytes(32), 'base64');
  v_qr_token := replace(replace(v_qr_token, '+', '-'), '/', '_');
  v_qr_token := rtrim(v_qr_token, '=');

  v_expires_at := now() + (p_expires_in_minutes || ' minutes')::interval;

  -- Deactivate any existing active QR codes for this session
  UPDATE gw_attendance_qr_codes
  SET is_active = false, updated_at = now()
  WHERE attendance_session_id = p_session_id AND is_active = true;

  -- Insert new QR code
  INSERT INTO gw_attendance_qr_codes (
    qr_token,
    attendance_session_id,
    course_id,
    generated_by,
    expires_at,
    is_active,
    context_type
  ) VALUES (
    v_qr_token,
    p_session_id,
    v_session_course_id,
    auth.uid(),
    v_expires_at,
    true,
    'session_attendance'
  )
  RETURNING id INTO v_qr_id;

  RETURN jsonb_build_object(
    'success', true,
    'qr_token', v_qr_token,
    'expires_at', v_expires_at,
    'qr_id', v_qr_id
  );
END;
$function$;

-- Session QR generator, 4-arg overload (used by QuickAttendanceQR, InstructorAttendanceHub)
CREATE OR REPLACE FUNCTION public.generate_session_qr_code(p_session_id uuid, p_generated_by uuid, p_expires_in_minutes integer DEFAULT 5, p_qr_type text DEFAULT 'checkin'::text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_qr_token text;
  v_expires_at timestamptz;
  v_qr_id uuid;
  v_session_course_id uuid;
BEGIN
  IF NOT public.can_manage_session_qr(p_session_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions to generate QR codes');
  END IF;

  -- Get the course_id from the session
  SELECT course_id INTO v_session_course_id
  FROM gw_attendance_sessions
  WHERE id = p_session_id;

  IF v_session_course_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session not found');
  END IF;

  -- Generate URL-safe token
  v_qr_token := encode(extensions.gen_random_bytes(32), 'base64');
  v_qr_token := replace(replace(v_qr_token, '+', '-'), '/', '_');
  v_qr_token := rtrim(v_qr_token, '=');

  v_expires_at := now() + (p_expires_in_minutes || ' minutes')::interval;

  -- Deactivate any existing active QR codes for this session of the SAME type
  UPDATE gw_attendance_qr_codes
  SET is_active = false, updated_at = now()
  WHERE attendance_session_id = p_session_id AND is_active = true AND qr_type = p_qr_type;

  -- Insert new QR code
  INSERT INTO gw_attendance_qr_codes (
    qr_token,
    attendance_session_id,
    course_id,
    generated_by,
    expires_at,
    is_active,
    context_type,
    qr_type
  ) VALUES (
    v_qr_token,
    p_session_id,
    v_session_course_id,
    auth.uid(),
    v_expires_at,
    true,
    'session_attendance',
    p_qr_type
  )
  RETURNING id INTO v_qr_id;

  RETURN jsonb_build_object(
    'success', true,
    'qr_token', v_qr_token,
    'expires_at', v_expires_at,
    'qr_id', v_qr_id,
    'qr_type', p_qr_type
  );
END;
$function$;

-- Session token generator used by useAttendanceSessions: already gated by the
-- instructor/ta WHERE clause, but it returned a (useless) token even when the
-- caller was unauthorized. Make the failure explicit.
CREATE OR REPLACE FUNCTION public.generate_attendance_qr_token(p_session_id uuid, p_expires_in_minutes integer DEFAULT 5)
RETURNS TABLE(qr_token text, expires_at timestamp with time zone)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_token TEXT;
  v_expires TIMESTAMP WITH TIME ZONE;
  v_hash TEXT;
BEGIN
  IF NOT public.can_manage_session_qr(p_session_id) THEN
    RAISE EXCEPTION 'Insufficient permissions to generate QR tokens';
  END IF;

  -- Generate secure token
  v_token := encode(gen_random_bytes(32), 'base64');
  v_expires := now() + (p_expires_in_minutes || ' minutes')::interval;
  v_hash := encode(digest(v_token, 'sha256'), 'hex');

  UPDATE gw_attendance_sessions
  SET qr_token_hash = v_hash,
      qr_expires_at = v_expires,
      updated_at = now()
  WHERE id = p_session_id;

  RETURN QUERY SELECT v_token, v_expires;
END;
$function$;

-- Revoke anon from every QR generator (all overloads); revoke authenticated
-- from the generators no frontend code calls.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS fn, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'generate_attendance_qr_token',
        'generate_course_qr_code',
        'generate_qr_attendance_token',
        'generate_qr_attendance_token_with_pin',
        'generate_qr_token',
        'generate_rotating_qr_code',
        'generate_secure_qr_token',
        'generate_session_qr_code'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', r.fn);
    IF r.proname IN ('generate_course_qr_code', 'generate_qr_token', 'generate_secure_qr_token') THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', r.fn);
    END IF;
  END LOOP;
END $$;
