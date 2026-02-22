
-- Update process_qr_attendance_scan: session-based check-in now marks 'in_rehearsal' instead of 'present'
-- Students must scan a checkout QR to be upgraded to 'present'

CREATE OR REPLACE FUNCTION public.process_qr_attendance_scan(
  p_qr_token text,
  p_user_id uuid,
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

    SELECT * INTO v_existing_session_record
    FROM gw_attendance_records
    WHERE attendance_session_id = v_qr_record.attendance_session_id AND student_profile_id = v_student_profile_id;

    IF v_existing_session_record IS NOT NULL THEN
      RETURN jsonb_build_object('success', true, 'message', 'Already checked in', 'already_recorded', true, 
        'event_title', COALESCE(v_session.title, v_session.course_title),
        'course_id', v_session.course_id);
    END IF;

    INSERT INTO gw_attendance_scan_logs (qr_code_id, scanned_by, scan_result, scan_message, session_id, user_agent)
    VALUES (v_qr_record.id, p_user_id, 'success', 'Session check-in recorded (in_rehearsal)', v_qr_record.attendance_session_id, p_user_agent)
    RETURNING id INTO v_scan_id;

    -- Two-step attendance: check-in marks 'in_rehearsal', checkout QR upgrades to 'present'
    INSERT INTO gw_attendance_records (attendance_session_id, student_profile_id, status, check_in_method, qr_scan_id, marked_at, note)
    VALUES (v_qr_record.attendance_session_id, v_student_profile_id, 'in_rehearsal', 'qr', v_scan_id, NOW(), 'QR check-in at ' || to_char(now(), 'HH12:MI AM'))
    RETURNING id INTO v_record_id;

    UPDATE gw_attendance_qr_codes SET scan_count = COALESCE(scan_count, 0) + 1, updated_at = now() WHERE id = v_qr_record.id;

    RETURN jsonb_build_object('success', true, 
      'message', 'Checked in for ' || COALESCE(v_session.title, v_session.course_title) || '. Scan the checkout QR at the end of class to confirm attendance.',
      'event_title', COALESCE(v_session.title, v_session.course_title), 
      'course_code', v_session.course_code, 
      'course_id', v_session.course_id,
      'status', 'in_rehearsal');
  END IF;

  -- BRANCH 2: Event-based attendance (unchanged - still marks present directly)
  IF v_qr_record.event_id IS NOT NULL THEN
    v_event_source := NULL;
    
    SELECT id, title INTO v_event FROM gw_events WHERE id = v_qr_record.event_id;
    IF v_event IS NOT NULL THEN 
      v_event_source := 'gw_events';
    ELSE
      SELECT id, title INTO v_event FROM events WHERE id = v_qr_record.event_id;
      IF v_event IS NOT NULL THEN 
        v_event_source := 'events'; 
      END IF;
    END IF;

    IF v_event IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'event_not_found', 'message', 'Event not found');
    END IF;

    IF v_event_source = 'gw_events' THEN
      SELECT * INTO v_existing_attendance FROM gw_event_attendance
      WHERE event_id = v_qr_record.event_id AND user_id = p_user_id;
    ELSE
      SELECT * INTO v_existing_attendance FROM attendance
      WHERE event_id = v_qr_record.event_id AND user_id = p_user_id;
    END IF;

    IF v_existing_attendance IS NOT NULL THEN
      RETURN jsonb_build_object('success', true, 'message', 'Already checked in for ' || v_event.title, 'already_recorded', true);
    END IF;

    INSERT INTO gw_attendance_scan_logs (qr_code_id, scanned_by, scan_result, scan_message, event_id, user_agent)
    VALUES (v_qr_record.id, p_user_id, 'success', 'Event attendance recorded', v_qr_record.event_id, p_user_agent);

    IF v_event_source = 'gw_events' THEN
      INSERT INTO gw_event_attendance (event_id, user_id, attendance_status, check_in_time)
      VALUES (v_qr_record.event_id, p_user_id, 'present', now())
      ON CONFLICT (event_id, user_id) DO NOTHING;
    ELSE
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

-- Also update process_qr_checkout_scan error message to reflect QR-based check-in (not GPS)
CREATE OR REPLACE FUNCTION process_qr_checkout_scan(
  p_qr_token text,
  p_user_id uuid,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qr_record record;
  v_session record;
  v_normalized_token text;
  v_student_profile_id uuid;
  v_existing_record record;
  v_is_enrolled boolean;
BEGIN
  v_normalized_token := replace(replace(p_qr_token, '-', '+'), '_', '/');
  v_normalized_token := rtrim(v_normalized_token, '=');

  -- Find the QR code - must be a checkout type
  SELECT * INTO v_qr_record
  FROM gw_attendance_qr_codes
  WHERE (
    qr_token = p_qr_token
    OR qr_token = v_normalized_token
    OR replace(replace(qr_token, '-', '+'), '_', '/') = v_normalized_token
    OR rtrim(replace(replace(qr_token, '-', '+'), '_', '/'), '=') = v_normalized_token
  )
  AND is_active = true
  AND qr_type = 'checkout';

  IF v_qr_record IS NULL THEN
    -- Check if it's a checkin QR being scanned
    PERFORM 1 FROM gw_attendance_qr_codes
    WHERE (
      qr_token = p_qr_token
      OR qr_token = v_normalized_token
      OR replace(replace(qr_token, '-', '+'), '_', '/') = v_normalized_token
      OR rtrim(replace(replace(qr_token, '-', '+'), '_', '/'), '=') = v_normalized_token
    )
    AND is_active = true
    AND qr_type = 'checkin';

    IF FOUND THEN
      RETURN process_qr_attendance_scan(p_qr_token, p_user_id, p_user_agent);
    END IF;

    INSERT INTO gw_attendance_scan_logs (scanned_by, scan_result, scan_message, qr_token_used, user_agent)
    VALUES (p_user_id, 'invalid_token', 'Checkout QR token not found or inactive', left(p_qr_token, 50), p_user_agent);
    RETURN jsonb_build_object('success', false, 'error', 'invalid_token', 'message', 'Invalid or expired QR code');
  END IF;

  IF v_qr_record.expires_at < (now() - interval '120 seconds') THEN
    INSERT INTO gw_attendance_scan_logs (qr_code_id, scanned_by, scan_result, scan_message, qr_token_used, user_agent)
    VALUES (v_qr_record.id, p_user_id, 'expired', 'Checkout QR code expired', left(p_qr_token, 50), p_user_agent);
    RETURN jsonb_build_object('success', false, 'error', 'expired', 'message', 'This QR code has expired. Please ask for a new one.');
  END IF;

  IF v_qr_record.attendance_session_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_session', 'message', 'Checkout QR has no associated session');
  END IF;

  SELECT s.*, c.course_code, c.title as course_title, c.id as course_id
  INTO v_session
  FROM gw_attendance_sessions s
  LEFT JOIN gw_courses c ON s.course_id = c.id
  WHERE s.id = v_qr_record.attendance_session_id;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'SESSION_NOT_FOUND', 'message', 'Attendance session not found');
  END IF;

  SELECT id INTO v_student_profile_id FROM gw_profiles WHERE user_id = p_user_id;
  IF v_student_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'PROFILE_NOT_FOUND', 'message', 'Student profile not found.');
  END IF;

  SELECT * INTO v_existing_record
  FROM gw_attendance_records
  WHERE attendance_session_id = v_qr_record.attendance_session_id
    AND student_profile_id = v_student_profile_id;

  IF v_existing_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_CHECKIN', 'message', 'You must check in first before scanning the checkout QR.');
  END IF;

  IF v_existing_record.status = 'present' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Already marked present', 'already_recorded', true,
      'event_title', COALESCE(v_session.title, v_session.course_title),
      'course_id', v_session.course_id);
  END IF;

  IF v_existing_record.status <> 'in_rehearsal' THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_STATUS', 'message', 'Your current status (' || v_existing_record.status || ') cannot be checked out.');
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext('checkout_' || v_qr_record.attendance_session_id::text || '_' || v_student_profile_id::text)
  );

  UPDATE gw_attendance_records
  SET status = 'present',
      note = COALESCE(note, '') || ' | QR checkout at ' || to_char(now(), 'HH12:MI AM'),
      updated_at = now()
  WHERE attendance_session_id = v_qr_record.attendance_session_id
    AND student_profile_id = v_student_profile_id
    AND status = 'in_rehearsal';

  INSERT INTO gw_attendance_scan_logs (qr_code_id, scanned_by, scan_result, scan_message, session_id, user_agent)
  VALUES (v_qr_record.id, p_user_id, 'checkout_success', 'Checkout recorded', v_qr_record.attendance_session_id, p_user_agent);

  UPDATE gw_attendance_qr_codes SET scan_count = COALESCE(scan_count, 0) + 1, updated_at = now() WHERE id = v_qr_record.id;

  RETURN jsonb_build_object('success', true, 'message', 'Attendance confirmed for ' || COALESCE(v_session.title, v_session.course_title),
    'event_title', COALESCE(v_session.title, v_session.course_title), 'course_code', v_session.course_code, 'course_id', v_session.course_id,
    'checkout', true);
END;
$$;
