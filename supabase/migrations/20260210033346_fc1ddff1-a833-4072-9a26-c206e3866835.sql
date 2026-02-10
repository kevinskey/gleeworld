
CREATE OR REPLACE FUNCTION public.process_qr_attendance_scan(
  qr_token_param text,
  user_id_param uuid,
  scan_location_param jsonb DEFAULT NULL,
  user_agent_param text DEFAULT NULL,
  ip_address_param text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qr_record RECORD;
  v_event RECORD;
  v_session RECORD;
  v_existing_attendance RECORD;
  v_existing_session_record RECORD;
  v_scan_id UUID;
  v_attendance_id UUID;
  v_session_record_id UUID;
  v_grace_period_seconds INTEGER := 120;
  v_student_profile_id UUID;
  v_check_in_status TEXT := 'present';
  v_normalized_token TEXT;
  v_is_enrolled BOOLEAN := false;
BEGIN
  v_normalized_token := TRIM(qr_token_param);
  
  -- Find the QR code record
  SELECT * INTO v_qr_record
  FROM gw_attendance_qr_codes
  WHERE qr_token = v_normalized_token
    AND is_active = true;

  IF v_qr_record IS NULL THEN
    SELECT * INTO v_qr_record
    FROM gw_attendance_qr_codes
    WHERE qr_token = replace(replace(v_normalized_token, '-', '+'), '_', '/')
      AND is_active = true;
  END IF;

  IF v_qr_record IS NULL THEN
    SELECT * INTO v_qr_record
    FROM gw_attendance_qr_codes
    WHERE (qr_token = v_normalized_token 
           OR qr_token = replace(replace(v_normalized_token, '-', '+'), '_', '/'))
      AND expires_at > (NOW() - (v_grace_period_seconds || ' seconds')::interval);
  END IF;

  IF v_qr_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid or expired QR code. Please ask for a fresh code.',
      'error', 'QR_INVALID',
      'debug_token_length', LENGTH(v_normalized_token)
    );
  END IF;

  IF v_qr_record.expires_at IS NOT NULL AND v_qr_record.expires_at < (NOW() - (v_grace_period_seconds || ' seconds')::interval) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'QR code has expired. Please ask your instructor for a new code.',
      'error', 'QR_EXPIRED',
      'expired_at', v_qr_record.expires_at
    );
  END IF;

  -- BRANCH 1: Session-based attendance
  IF v_qr_record.attendance_session_id IS NOT NULL THEN
    SELECT s.*, c.course_code, c.title as course_title, c.id as course_id
    INTO v_session
    FROM gw_attendance_sessions s
    LEFT JOIN gw_courses c ON s.course_id = c.id
    WHERE s.id = v_qr_record.attendance_session_id;

    IF v_session IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Attendance session not found',
        'error', 'SESSION_NOT_FOUND'
      );
    END IF;

    IF v_session.status NOT IN ('open', 'scheduled') THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'This attendance session is ' || v_session.status,
        'error', 'SESSION_CLOSED'
      );
    END IF;

    SELECT id INTO v_student_profile_id
    FROM gw_profiles
    WHERE user_id = user_id_param;

    IF v_student_profile_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Student profile not found. Please contact your instructor.',
        'error', 'PROFILE_NOT_FOUND'
      );
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM gw_course_enrollments
      WHERE user_id = user_id_param
        AND course_id = v_session.course_id
        AND enrollment_status = 'enrolled'
    ) INTO v_is_enrolled;

    IF NOT v_is_enrolled THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'You are not enrolled in ' || COALESCE(v_session.course_code, 'this course'),
        'error', 'NOT_ENROLLED'
      );
    END IF;

    SELECT * INTO v_existing_session_record
    FROM gw_attendance_records
    WHERE attendance_session_id = v_qr_record.attendance_session_id
      AND student_profile_id = v_student_profile_id;

    IF v_existing_session_record IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'message', 'Already checked in for ' || COALESCE(v_session.title, 'this session'),
        'event_title', COALESCE(v_session.title, v_session.course_title),
        'course_code', v_session.course_code,
        'course_id', v_session.course_id,
        'already_recorded', true,
        'recorded_at', v_existing_session_record.marked_at
      );
    END IF;

    INSERT INTO gw_attendance_scan_logs (
      qr_code_id, scanned_by, scan_result, scan_location, user_agent, ip_address
    ) VALUES (
      v_qr_record.id, user_id_param, 'success', scan_location_param, user_agent_param, ip_address_param::inet
    ) RETURNING id INTO v_scan_id;

    INSERT INTO gw_attendance_records (
      attendance_session_id, student_profile_id, status, check_in_method, qr_scan_id, marked_at
    ) VALUES (
      v_qr_record.attendance_session_id, v_student_profile_id, v_check_in_status, 'qr_scan', v_scan_id, NOW()
    ) RETURNING id INTO v_session_record_id;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Attendance recorded for ' || COALESCE(v_session.title, v_session.course_title),
      'event_title', COALESCE(v_session.title, v_session.course_title),
      'course_code', v_session.course_code,
      'course_id', v_session.course_id,
      'scan_id', v_scan_id,
      'attendance_record_id', v_session_record_id,
      'scanned_at', NOW()
    );
  END IF;

  -- BRANCH 2: Event-based attendance — check BOTH events and gw_events tables
  IF v_qr_record.event_id IS NOT NULL THEN
    -- Try the legacy events table first
    SELECT id, title INTO v_event
    FROM events
    WHERE id = v_qr_record.event_id;

    -- If not found, try gw_events
    IF v_event IS NULL THEN
      SELECT id, title INTO v_event
      FROM gw_events
      WHERE id = v_qr_record.event_id;
    END IF;

    IF v_event IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Event not found',
        'error', 'EVENT_NOT_FOUND'
      );
    END IF;

    -- Check for existing attendance in both tables
    SELECT * INTO v_existing_attendance
    FROM attendance
    WHERE event_id = v_qr_record.event_id
      AND user_id = user_id_param;

    IF v_existing_attendance IS NULL THEN
      SELECT * INTO v_existing_attendance
      FROM gw_event_attendance
      WHERE event_id = v_qr_record.event_id
        AND user_id = user_id_param;
    END IF;

    IF v_existing_attendance IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'message', 'Already checked in for ' || v_event.title,
        'event_title', v_event.title,
        'already_recorded', true
      );
    END IF;

    INSERT INTO gw_attendance_scan_logs (
      qr_code_id, scanned_by, scan_result, scan_location, user_agent, ip_address
    ) VALUES (
      v_qr_record.id, user_id_param, 'success', scan_location_param, user_agent_param, ip_address_param::inet
    ) RETURNING id INTO v_scan_id;

    -- Record in both tables for compatibility
    INSERT INTO attendance (event_id, user_id, status, recorded_at)
    VALUES (v_qr_record.event_id, user_id_param, 'present', NOW())
    ON CONFLICT DO NOTHING;

    INSERT INTO gw_event_attendance (event_id, user_id, status, checked_in_at)
    VALUES (v_qr_record.event_id, user_id_param, 'present', NOW())
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_attendance_id;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Attendance recorded for ' || v_event.title,
      'event_title', v_event.title,
      'scan_id', v_scan_id,
      'attendance_id', v_attendance_id,
      'scanned_at', NOW()
    );
  END IF;

  RETURN jsonb_build_object(
    'success', false,
    'message', 'QR code is not linked to any event or session',
    'error', 'NO_TARGET'
  );
END;
$$;
