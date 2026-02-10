
-- Drop all overloads of process_qr_attendance_scan
DROP FUNCTION IF EXISTS public.process_qr_attendance_scan(text, uuid);
DROP FUNCTION IF EXISTS public.process_qr_attendance_scan(text, uuid, text, text);
DROP FUNCTION IF EXISTS public.process_qr_attendance_scan(text, uuid, jsonb, text, text);

-- Drop process_pin_attendance_scan
DROP FUNCTION IF EXISTS public.process_pin_attendance_scan(text, uuid, jsonb);

-- Recreate single canonical process_qr_attendance_scan
CREATE OR REPLACE FUNCTION public.process_qr_attendance_scan(
  p_qr_token text,
  p_user_id uuid,
  p_scan_location text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_qr_record record;
  v_event record;
  v_session record;
  v_existing_attendance record;
  v_normalized_token text;
  v_event_source text;
  v_student_profile_id uuid;
  v_is_enrolled boolean;
  v_existing_session_record record;
  v_scan_id uuid;
  v_record_id uuid;
begin
  -- Normalize token
  v_normalized_token := replace(replace(p_qr_token, '-', '+'), '_', '/');
  v_normalized_token := rtrim(v_normalized_token, '=');

  -- Look up QR code
  SELECT * INTO v_qr_record
  FROM gw_attendance_qr_codes
  WHERE (
    qr_token = p_qr_token
    OR qr_token = v_normalized_token
    OR replace(replace(qr_token, '-', '+'), '_', '/') = v_normalized_token
    OR rtrim(replace(replace(qr_token, '-', '+'), '_', '/'), '=') = v_normalized_token
  )
  AND is_active = true;

  IF v_qr_record IS NULL THEN
    INSERT INTO gw_attendance_scan_logs (scanned_by, scan_result, scan_message, qr_token_used, user_agent)
    VALUES (p_user_id, 'invalid_token', 'QR token not found or inactive', left(p_qr_token, 50), p_user_agent);
    RETURN jsonb_build_object('success', false, 'error', 'invalid_token', 'message', 'Invalid or expired QR code');
  END IF;

  -- Check expiry with 120-second grace
  IF v_qr_record.expires_at < (now() - interval '120 seconds') THEN
    INSERT INTO gw_attendance_scan_logs (qr_code_id, scanned_by, scan_result, scan_message, qr_token_used, user_agent)
    VALUES (v_qr_record.id, p_user_id, 'expired', 'QR code expired', left(p_qr_token, 50), p_user_agent);
    RETURN jsonb_build_object('success', false, 'error', 'expired', 'message', 'This QR code has expired. Please ask for a new one.');
  END IF;

  -- BRANCH 1: Session-based (attendance_session_id)
  IF v_qr_record.attendance_session_id IS NOT NULL THEN
    SELECT s.*, c.course_code, c.title as course_title, c.id as course_id
    INTO v_session
    FROM gw_attendance_sessions s
    LEFT JOIN gw_courses c ON s.course_id = c.id
    WHERE s.id = v_qr_record.attendance_session_id;

    IF v_session IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'SESSION_NOT_FOUND', 'message', 'Attendance session not found');
    END IF;

    IF v_session.status NOT IN ('open', 'scheduled') THEN
      RETURN jsonb_build_object('success', false, 'error', 'SESSION_CLOSED', 'message', 'This attendance session is ' || v_session.status);
    END IF;

    SELECT id INTO v_student_profile_id FROM gw_profiles WHERE user_id = p_user_id;
    IF v_student_profile_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'PROFILE_NOT_FOUND', 'message', 'Student profile not found.');
    END IF;

    -- Check enrollment (skip for super admins)
    IF v_session.course_id IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM gw_profiles WHERE user_id = p_user_id AND is_super_admin = true
      ) INTO v_is_enrolled;
      
      IF NOT v_is_enrolled THEN
        SELECT EXISTS (
          SELECT 1 FROM gw_course_enrollments
          WHERE user_id = p_user_id AND course_id = v_session.course_id AND enrollment_status = 'enrolled'
        ) INTO v_is_enrolled;
      END IF;

      IF NOT v_is_enrolled THEN
        RETURN jsonb_build_object('success', false, 'error', 'NOT_ENROLLED', 'message', 'You are not enrolled in ' || COALESCE(v_session.course_code, 'this course'));
      END IF;
    END IF;

    -- Check existing
    SELECT * INTO v_existing_session_record
    FROM gw_attendance_records
    WHERE attendance_session_id = v_qr_record.attendance_session_id AND student_profile_id = v_student_profile_id;

    IF v_existing_session_record IS NOT NULL THEN
      RETURN jsonb_build_object('success', true, 'message', 'Already checked in', 'already_recorded', true, 'event_title', COALESCE(v_session.title, v_session.course_title));
    END IF;

    INSERT INTO gw_attendance_scan_logs (qr_code_id, scanned_by, scan_result, scan_message, session_id, user_agent)
    VALUES (v_qr_record.id, p_user_id, 'success', 'Session attendance recorded', v_qr_record.attendance_session_id, p_user_agent)
    RETURNING id INTO v_scan_id;

    INSERT INTO gw_attendance_records (attendance_session_id, student_profile_id, status, check_in_method, qr_scan_id, marked_at)
    VALUES (v_qr_record.attendance_session_id, v_student_profile_id, 'present', 'qr_scan', v_scan_id, NOW())
    RETURNING id INTO v_record_id;

    UPDATE gw_attendance_qr_codes SET scan_count = COALESCE(scan_count, 0) + 1, updated_at = now() WHERE id = v_qr_record.id;

    RETURN jsonb_build_object('success', true, 'message', 'Attendance recorded for ' || COALESCE(v_session.title, v_session.course_title),
      'event_title', COALESCE(v_session.title, v_session.course_title), 'course_code', v_session.course_code, 'course_id', v_session.course_id);
  END IF;

  -- BRANCH 1b: session_id field
  IF v_qr_record.session_id IS NOT NULL THEN
    SELECT * INTO v_session FROM gw_course_class_sessions WHERE id = v_qr_record.session_id;
    IF v_session IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'session_not_found', 'message', 'Session not found');
    END IF;

    SELECT * INTO v_existing_attendance FROM gw_session_attendance
    WHERE session_id = v_qr_record.session_id AND student_id = p_user_id;

    IF v_existing_attendance IS NOT NULL THEN
      RETURN jsonb_build_object('success', true, 'message', 'Attendance already recorded', 'already_recorded', true);
    END IF;

    INSERT INTO gw_session_attendance (session_id, student_id, status, check_in_time, check_in_method)
    VALUES (v_qr_record.session_id, p_user_id, 'present', now(), 'qr_code');

    UPDATE gw_attendance_qr_codes SET scan_count = COALESCE(scan_count, 0) + 1, updated_at = now() WHERE id = v_qr_record.id;
    RETURN jsonb_build_object('success', true, 'message', 'Attendance recorded successfully!', 'session_title', v_session.title);
  END IF;

  -- BRANCH 2: Event-based attendance
  IF v_qr_record.event_id IS NOT NULL THEN
    v_event_source := NULL;
    SELECT id, title INTO v_event FROM events WHERE id = v_qr_record.event_id;
    IF v_event IS NOT NULL THEN v_event_source := 'events';
    ELSE
      SELECT id, title INTO v_event FROM gw_events WHERE id = v_qr_record.event_id;
      IF v_event IS NOT NULL THEN v_event_source := 'gw_events'; END IF;
    END IF;

    IF v_event IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'event_not_found', 'message', 'Event not found');
    END IF;

    -- Check existing in gw_event_attendance
    SELECT * INTO v_existing_attendance FROM gw_event_attendance
    WHERE event_id = v_qr_record.event_id AND user_id = p_user_id;

    IF v_existing_attendance IS NOT NULL THEN
      RETURN jsonb_build_object('success', true, 'message', 'Already checked in for ' || v_event.title, 'already_recorded', true);
    END IF;

    -- Also check legacy table if event is in events table
    IF v_event_source = 'events' THEN
      SELECT * INTO v_existing_attendance FROM attendance
      WHERE event_id = v_qr_record.event_id AND user_id = p_user_id;
      IF v_existing_attendance IS NOT NULL THEN
        RETURN jsonb_build_object('success', true, 'message', 'Already checked in for ' || v_event.title, 'already_recorded', true);
      END IF;
    END IF;

    INSERT INTO gw_attendance_scan_logs (qr_code_id, scanned_by, scan_result, scan_message, event_id, user_agent)
    VALUES (v_qr_record.id, p_user_id, 'success', 'Event attendance recorded', v_qr_record.event_id, p_user_agent);

    -- Always record in gw_event_attendance
    INSERT INTO gw_event_attendance (event_id, user_id, status, check_in_time, check_in_method)
    VALUES (v_qr_record.event_id, p_user_id, 'present', now(), 'qr_code')
    ON CONFLICT (event_id, user_id) DO NOTHING;

    -- Only insert into legacy attendance if event exists in events table
    IF v_event_source = 'events' THEN
      INSERT INTO attendance (event_id, user_id, status, recorded_at)
      VALUES (v_qr_record.event_id, p_user_id, 'present', now())
      ON CONFLICT DO NOTHING;
    END IF;

    UPDATE gw_attendance_qr_codes SET scan_count = COALESCE(scan_count, 0) + 1, updated_at = now() WHERE id = v_qr_record.id;
    RETURN jsonb_build_object('success', true, 'message', 'Attendance recorded for ' || COALESCE(v_event.title, 'event'), 'event_title', v_event.title);
  END IF;

  RETURN jsonb_build_object('success', false, 'error', 'no_context', 'message', 'QR code has no associated event or session');
end;
$$;

-- Recreate process_pin_attendance_scan (fixed to use gw_event_attendance instead of legacy attendance)
CREATE OR REPLACE FUNCTION public.process_pin_attendance_scan(
  pin_code_param text,
  user_id_param uuid,
  scan_location_param jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qr_record RECORD;
  v_event RECORD;
  v_existing_attendance RECORD;
  v_event_source text;
BEGIN
  SELECT * INTO v_qr_record
  FROM gw_attendance_qr_codes
  WHERE pin_code = pin_code_param AND is_active = true AND expires_at > NOW();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid or expired PIN code', 'error', 'PIN not found or expired');
  END IF;

  -- Get event info - check both tables
  v_event_source := NULL;
  SELECT id, title INTO v_event FROM events WHERE id = v_qr_record.event_id;
  IF v_event IS NOT NULL THEN v_event_source := 'events';
  ELSE
    SELECT id, title INTO v_event FROM gw_events WHERE id = v_qr_record.event_id;
    IF v_event IS NOT NULL THEN v_event_source := 'gw_events'; END IF;
  END IF;

  -- Check existing attendance in gw_event_attendance
  SELECT * INTO v_existing_attendance
  FROM gw_event_attendance
  WHERE event_id = v_qr_record.event_id AND user_id = user_id_param;

  IF v_existing_attendance IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'message', 'Already marked present', 'event_title', COALESCE(v_event.title, ''), 'already_recorded', true);
  END IF;

  -- Also check legacy table
  IF v_event_source = 'events' THEN
    SELECT * INTO v_existing_attendance FROM attendance
    WHERE event_id = v_qr_record.event_id AND user_id = user_id_param;
    IF v_existing_attendance IS NOT NULL THEN
      RETURN jsonb_build_object('success', true, 'message', 'Already marked present', 'event_title', COALESCE(v_event.title, ''), 'already_recorded', true);
    END IF;
  END IF;

  -- Record scan
  INSERT INTO gw_attendance_qr_scans (qr_code_id, scanned_by, scan_location, user_agent)
  VALUES (v_qr_record.id, user_id_param, scan_location_param, 'PIN entry');

  UPDATE gw_attendance_qr_codes SET scan_count = scan_count + 1 WHERE id = v_qr_record.id;

  -- Record in gw_event_attendance (always)
  INSERT INTO gw_event_attendance (event_id, user_id, status, check_in_time, check_in_method)
  VALUES (v_qr_record.event_id, user_id_param, 'present', now(), 'pin_code')
  ON CONFLICT (event_id, user_id) DO NOTHING;

  -- Only insert into legacy attendance if event is in events table
  IF v_event_source = 'events' THEN
    INSERT INTO attendance (event_id, user_id, status, notes)
    VALUES (v_qr_record.event_id, user_id_param, 'present', 'Checked in via PIN code')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Attendance recorded successfully', 'event_title', COALESCE(v_event.title, ''), 'scanned_at', NOW());
END;
$$;
