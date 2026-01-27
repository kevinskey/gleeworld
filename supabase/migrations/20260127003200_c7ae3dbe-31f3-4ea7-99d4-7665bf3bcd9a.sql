-- Fix the process_qr_attendance_scan function to handle both URL-safe and legacy tokens
-- Also add better error messages for debugging

CREATE OR REPLACE FUNCTION public.process_qr_attendance_scan(
  qr_token_param TEXT,
  user_id_param UUID,
  scan_location_param JSONB DEFAULT NULL,
  user_agent_param TEXT DEFAULT NULL,
  ip_address_param TEXT DEFAULT NULL
)
RETURNS JSONB
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
  v_grace_period_seconds INTEGER := 120; -- 2 minute grace period
  v_student_profile_id UUID;
  v_check_in_status TEXT := 'present';
  v_normalized_token TEXT;
BEGIN
  -- Normalize the token - try both URL-safe and standard base64 formats
  v_normalized_token := TRIM(qr_token_param);
  
  -- Find the QR code record - check active codes first (exact match)
  SELECT * INTO v_qr_record
  FROM gw_attendance_qr_codes
  WHERE qr_token = v_normalized_token
    AND is_active = true;

  -- If not found, try converting URL-safe base64 back to standard
  IF v_qr_record IS NULL THEN
    SELECT * INTO v_qr_record
    FROM gw_attendance_qr_codes
    WHERE qr_token = replace(replace(v_normalized_token, '-', '+'), '_', '/')
      AND is_active = true;
  END IF;

  -- If still not found as active, check recently expired codes (within grace period)
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

  -- Check if QR code has expired beyond grace period
  IF v_qr_record.expires_at IS NOT NULL AND v_qr_record.expires_at < (NOW() - (v_grace_period_seconds || ' seconds')::interval) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'QR code has expired. Please ask your instructor for a new code.',
      'error', 'QR_EXPIRED',
      'expired_at', v_qr_record.expires_at
    );
  END IF;

  -- BRANCH 1: Session-based attendance (MUS 240, etc.)
  IF v_qr_record.attendance_session_id IS NOT NULL THEN
    -- Get session details
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

    -- Check if session is open (allow scheduled for pre-class scanning)
    IF v_session.status NOT IN ('open', 'scheduled') THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'This attendance session is ' || v_session.status,
        'error', 'SESSION_CLOSED'
      );
    END IF;

    -- Get user's profile ID for session records
    SELECT id INTO v_student_profile_id
    FROM gw_profiles
    WHERE user_id = user_id_param;

    IF v_student_profile_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Student profile not found. Please contact your instructor.',
        'error', 'PROFILE_NOT_FOUND',
        'user_id', user_id_param
      );
    END IF;

    -- Check for existing session attendance
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

    -- Determine if late (after session open time + threshold)
    IF v_session.allow_late_checkin AND v_session.late_threshold_minutes IS NOT NULL THEN
      IF NOW() > (v_session.opens_at + (v_session.late_threshold_minutes || ' minutes')::interval) THEN
        v_check_in_status := 'late';
      END IF;
    END IF;

    -- Record QR scan
    INSERT INTO gw_attendance_qr_scans (
      qr_code_id,
      user_id,
      scan_location,
      user_agent,
      ip_address
    ) VALUES (
      v_qr_record.id,
      user_id_param,
      scan_location_param,
      user_agent_param,
      CASE WHEN ip_address_param IS NOT NULL AND ip_address_param != '' 
           THEN ip_address_param::inet 
           ELSE NULL 
      END
    ) RETURNING id INTO v_scan_id;

    -- Update scan count
    UPDATE gw_attendance_qr_codes
    SET scan_count = COALESCE(scan_count, 0) + 1,
        updated_at = NOW()
    WHERE id = v_qr_record.id;

    -- Create session attendance record
    INSERT INTO gw_attendance_records (
      attendance_session_id,
      student_profile_id,
      status,
      check_in_method,
      marked_at,
      note
    ) VALUES (
      v_qr_record.attendance_session_id,
      v_student_profile_id,
      v_check_in_status,
      'qr',
      NOW(),
      'Scanned via QR code'
    ) RETURNING id INTO v_session_record_id;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Attendance recorded for ' || COALESCE(v_session.title, v_session.course_title, 'class'),
      'event_title', COALESCE(v_session.title, v_session.course_title),
      'course_code', v_session.course_code,
      'course_id', v_session.course_id,
      'session_id', v_qr_record.attendance_session_id,
      'status', v_check_in_status,
      'scanned_at', NOW(),
      'record_id', v_session_record_id
    );
  END IF;

  -- BRANCH 2: Event-based attendance (legacy/general events)
  IF v_qr_record.event_id IS NOT NULL THEN
    -- Get event details
    SELECT * INTO v_event
    FROM gw_events
    WHERE id = v_qr_record.event_id;

    IF v_event IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Event not found',
        'error', 'EVENT_NOT_FOUND'
      );
    END IF;

    -- Check for existing attendance
    SELECT * INTO v_existing_attendance
    FROM attendance
    WHERE event_id = v_qr_record.event_id
      AND user_id = user_id_param;

    IF v_existing_attendance IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'message', 'Already checked in for ' || v_event.title,
        'event_title', v_event.title,
        'already_recorded', true,
        'recorded_at', v_existing_attendance.recorded_at
      );
    END IF;

    -- Record QR scan
    INSERT INTO gw_attendance_qr_scans (
      qr_code_id,
      user_id,
      scan_location,
      user_agent,
      ip_address
    ) VALUES (
      v_qr_record.id,
      user_id_param,
      scan_location_param,
      user_agent_param,
      CASE WHEN ip_address_param IS NOT NULL AND ip_address_param != '' 
           THEN ip_address_param::inet 
           ELSE NULL 
      END
    ) RETURNING id INTO v_scan_id;

    -- Update scan count
    UPDATE gw_attendance_qr_codes
    SET scan_count = COALESCE(scan_count, 0) + 1,
        updated_at = NOW()
    WHERE id = v_qr_record.id;

    -- Create attendance record
    INSERT INTO attendance (
      event_id,
      user_id,
      status,
      notes
    ) VALUES (
      v_qr_record.event_id,
      user_id_param,
      'present',
      'Checked in via QR code scan'
    ) RETURNING id INTO v_attendance_id;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Attendance recorded for ' || v_event.title,
      'event_title', v_event.title,
      'event_info', jsonb_build_object(
        'title', v_event.title,
        'start_date', v_event.start_date
      ),
      'scanned_at', NOW(),
      'attendance_id', v_attendance_id
    );
  END IF;

  -- QR code has neither event_id nor attendance_session_id
  RETURN jsonb_build_object(
    'success', false,
    'message', 'This QR code is not linked to any event or session',
    'error', 'QR_NOT_LINKED'
  );
END;
$$;

-- Also deactivate old tokens with non-URL-safe characters to prevent confusion
UPDATE gw_attendance_qr_codes
SET is_active = false, updated_at = NOW()
WHERE is_active = true 
  AND (qr_token LIKE '%+%' OR qr_token LIKE '%/%' OR qr_token LIKE '%=%')
  AND created_at < NOW() - interval '1 hour';