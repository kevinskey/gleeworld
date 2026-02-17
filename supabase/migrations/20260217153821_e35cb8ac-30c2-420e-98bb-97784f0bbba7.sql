
-- 1. Add 'in_rehearsal' to valid attendance statuses and 'gps' to check_in_method
ALTER TABLE gw_attendance_records DROP CONSTRAINT gw_attendance_records_status_check;
ALTER TABLE gw_attendance_records ADD CONSTRAINT gw_attendance_records_status_check
  CHECK (status = ANY (ARRAY['present','late','absent','excused','in_rehearsal']));

ALTER TABLE gw_attendance_records DROP CONSTRAINT gw_attendance_records_check_in_method_check;
ALTER TABLE gw_attendance_records ADD CONSTRAINT gw_attendance_records_check_in_method_check
  CHECK (check_in_method = ANY (ARRAY['qr','manual','pin','auto','gps']));

-- 2. Add qr_type column to gw_attendance_qr_codes (default 'checkin')
ALTER TABLE gw_attendance_qr_codes ADD COLUMN IF NOT EXISTS qr_type text NOT NULL DEFAULT 'checkin'
  CHECK (qr_type IN ('checkin', 'checkout'));

-- 3. Update generate_session_qr_code to accept p_qr_type parameter
CREATE OR REPLACE FUNCTION generate_session_qr_code(
  p_session_id uuid,
  p_generated_by uuid,
  p_expires_in_minutes integer DEFAULT 5,
  p_qr_type text DEFAULT 'checkin'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qr_token text;
  v_expires_at timestamptz;
  v_qr_id uuid;
  v_session_course_id uuid;
BEGIN
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
    p_generated_by,
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
$$;

-- 4. Create process_qr_checkout_scan RPC
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
  -- Normalize token for matching
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
      -- It's a checkin QR, delegate to the regular scan
      RETURN process_qr_attendance_scan(p_qr_token, p_user_id, p_user_agent);
    END IF;

    INSERT INTO gw_attendance_scan_logs (scanned_by, scan_result, scan_message, qr_token_used, user_agent)
    VALUES (p_user_id, 'invalid_token', 'Checkout QR token not found or inactive', left(p_qr_token, 50), p_user_agent);
    RETURN jsonb_build_object('success', false, 'error', 'invalid_token', 'message', 'Invalid or expired QR code');
  END IF;

  -- Check expiry (with 120s grace)
  IF v_qr_record.expires_at < (now() - interval '120 seconds') THEN
    INSERT INTO gw_attendance_scan_logs (qr_code_id, scanned_by, scan_result, scan_message, qr_token_used, user_agent)
    VALUES (v_qr_record.id, p_user_id, 'expired', 'Checkout QR code expired', left(p_qr_token, 50), p_user_agent);
    RETURN jsonb_build_object('success', false, 'error', 'expired', 'message', 'This QR code has expired. Please ask for a new one.');
  END IF;

  -- Must be session-based
  IF v_qr_record.attendance_session_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_session', 'message', 'Checkout QR has no associated session');
  END IF;

  -- Get session info
  SELECT s.*, c.course_code, c.title as course_title, c.id as course_id
  INTO v_session
  FROM gw_attendance_sessions s
  LEFT JOIN gw_courses c ON s.course_id = c.id
  WHERE s.id = v_qr_record.attendance_session_id;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'SESSION_NOT_FOUND', 'message', 'Attendance session not found');
  END IF;

  -- Get student profile
  SELECT id INTO v_student_profile_id FROM gw_profiles WHERE user_id = p_user_id;
  IF v_student_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'PROFILE_NOT_FOUND', 'message', 'Student profile not found.');
  END IF;

  -- Find the student's in_rehearsal record for this session
  SELECT * INTO v_existing_record
  FROM gw_attendance_records
  WHERE attendance_session_id = v_qr_record.attendance_session_id
    AND student_profile_id = v_student_profile_id;

  IF v_existing_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_CHECKIN', 'message', 'You must check in via GPS first before scanning the checkout QR.');
  END IF;

  IF v_existing_record.status = 'present' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Already marked present', 'already_recorded', true,
      'event_title', COALESCE(v_session.title, v_session.course_title));
  END IF;

  IF v_existing_record.status <> 'in_rehearsal' THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_STATUS', 'message', 'Your current status (' || v_existing_record.status || ') cannot be checked out.');
  END IF;

  -- Advisory lock
  PERFORM pg_advisory_xact_lock(
    hashtext('checkout_' || v_qr_record.attendance_session_id::text || '_' || v_student_profile_id::text)
  );

  -- Update from in_rehearsal to present
  UPDATE gw_attendance_records
  SET status = 'present',
      note = COALESCE(note, '') || ' | QR checkout at ' || to_char(now(), 'HH12:MI AM'),
      updated_at = now()
  WHERE attendance_session_id = v_qr_record.attendance_session_id
    AND student_profile_id = v_student_profile_id
    AND status = 'in_rehearsal';

  -- Log the scan
  INSERT INTO gw_attendance_scan_logs (qr_code_id, scanned_by, scan_result, scan_message, session_id, user_agent)
  VALUES (v_qr_record.id, p_user_id, 'checkout_success', 'Checkout recorded', v_qr_record.attendance_session_id, p_user_agent);

  -- Update scan count
  UPDATE gw_attendance_qr_codes SET scan_count = COALESCE(scan_count, 0) + 1, updated_at = now() WHERE id = v_qr_record.id;

  RETURN jsonb_build_object('success', true, 'message', 'Attendance confirmed for ' || COALESCE(v_session.title, v_session.course_title),
    'event_title', COALESCE(v_session.title, v_session.course_title), 'course_code', v_session.course_code, 'course_id', v_session.course_id,
    'checkout', true);
END;
$$;
