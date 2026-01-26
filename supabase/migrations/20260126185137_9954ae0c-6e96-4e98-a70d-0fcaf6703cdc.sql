-- Add attendance_session_id to gw_attendance_qr_codes to link QR codes to session-based attendance
ALTER TABLE gw_attendance_qr_codes
ADD COLUMN IF NOT EXISTS attendance_session_id UUID REFERENCES gw_attendance_sessions(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_qr_codes_attendance_session 
ON gw_attendance_qr_codes(attendance_session_id) 
WHERE attendance_session_id IS NOT NULL;

-- Update the process_qr_attendance_scan function to handle both event-based and session-based attendance
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
BEGIN
  -- Find the QR code record - check active codes first
  SELECT * INTO v_qr_record
  FROM gw_attendance_qr_codes
  WHERE qr_token = qr_token_param
    AND is_active = true;

  -- If not found as active, check recently expired codes (within grace period)
  IF v_qr_record IS NULL THEN
    SELECT * INTO v_qr_record
    FROM gw_attendance_qr_codes
    WHERE qr_token = qr_token_param
      AND expires_at > (NOW() - (v_grace_period_seconds || ' seconds')::interval);
  END IF;

  IF v_qr_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid or inactive QR code',
      'error', 'QR_INVALID'
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
    SELECT s.*, c.course_code, c.title as course_title
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

    -- Check if session is open
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
        'error', 'PROFILE_NOT_FOUND'
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
        'message', 'Already checked in for ' || v_session.title,
        'event_title', v_session.title,
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
      'Checked in via QR code scan'
    ) RETURNING id INTO v_session_record_id;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Attendance recorded for ' || v_session.title,
      'event_title', v_session.title,
      'course_code', v_session.course_code,
      'course_id', v_session.course_id,
      'status', v_check_in_status,
      'scanned_at', NOW()
    );
  END IF;

  -- BRANCH 2: Event-based attendance (legacy system)
  -- Get event details from gw_events or events table
  SELECT * INTO v_event
  FROM gw_events
  WHERE id = v_qr_record.event_id;
  
  IF v_event IS NULL THEN
    SELECT * INTO v_event
    FROM events
    WHERE id = v_qr_record.event_id;
  END IF;

  IF v_event IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Event not found',
      'error', 'EVENT_NOT_FOUND'
    );
  END IF;

  -- Check for existing event attendance
  SELECT * INTO v_existing_attendance
  FROM attendance
  WHERE event_id = v_qr_record.event_id
    AND user_id = user_id_param;

  IF v_existing_attendance IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Already checked in for ' || v_event.title,
      'event_title', v_event.title,
      'course_id', v_qr_record.course_id,
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

  -- Create event attendance record
  INSERT INTO attendance (
    event_id,
    user_id,
    status,
    notes,
    recorded_at
  ) VALUES (
    v_qr_record.event_id,
    user_id_param,
    'present',
    'Checked in via QR code',
    NOW()
  ) RETURNING id INTO v_attendance_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Attendance recorded for ' || v_event.title,
    'event_title', v_event.title,
    'course_id', v_qr_record.course_id,
    'scanned_at', NOW()
  );
END;
$$;

-- Create function to generate QR codes for attendance sessions
CREATE OR REPLACE FUNCTION public.generate_session_qr_code(
  p_session_id UUID,
  p_generated_by UUID,
  p_expires_in_minutes INTEGER DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
  v_qr_token TEXT;
  v_qr_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Get session info
  SELECT s.*, c.course_code
  INTO v_session
  FROM gw_attendance_sessions s
  LEFT JOIN gw_courses c ON s.course_id = c.id
  WHERE s.id = p_session_id;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session not found');
  END IF;

  -- Deactivate previous QR codes for this session
  UPDATE gw_attendance_qr_codes
  SET is_active = false, updated_at = NOW()
  WHERE attendance_session_id = p_session_id AND is_active = true;

  -- Generate new token
  v_qr_token := encode(gen_random_bytes(32), 'base64');
  v_expires_at := NOW() + (p_expires_in_minutes || ' minutes')::interval;

  -- Create new QR code record
  INSERT INTO gw_attendance_qr_codes (
    event_id,
    attendance_session_id,
    course_id,
    qr_token,
    generated_by,
    generated_at,
    expires_at,
    is_active,
    scan_count,
    context_type,
    course_code
  ) VALUES (
    v_session.event_id,
    p_session_id,
    v_session.course_id,
    v_qr_token,
    p_generated_by,
    NOW(),
    v_expires_at,
    true,
    0,
    'session_attendance',
    v_session.course_code
  ) RETURNING id INTO v_qr_id;

  RETURN jsonb_build_object(
    'success', true,
    'qr_token', v_qr_token,
    'qr_id', v_qr_id,
    'expires_at', v_expires_at,
    'session_title', v_session.title
  );
END;
$$;