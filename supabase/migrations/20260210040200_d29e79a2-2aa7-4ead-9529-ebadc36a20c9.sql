
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
  v_result jsonb;
  v_event_source text; -- 'events' or 'gw_events'
begin
  -- Normalize token (handle both base64 and URL-safe base64)
  v_normalized_token := replace(replace(p_qr_token, '-', '+'), '_', '/');
  -- Trim trailing '=' padding
  v_normalized_token := rtrim(v_normalized_token, '=');

  -- Also try the raw token
  -- Look up QR code with either format
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
    -- Log failed scan
    INSERT INTO gw_attendance_scan_logs (scanned_by, scan_result, scan_message, qr_token_used, user_agent)
    VALUES (p_user_id, 'invalid_token', 'QR token not found or inactive', left(p_qr_token, 50), p_user_agent);
    
    RETURN jsonb_build_object('success', false, 'error', 'invalid_token', 'message', 'Invalid or expired QR code');
  END IF;

  -- Check expiry with 120-second grace period
  IF v_qr_record.expires_at < (now() - interval '120 seconds') THEN
    INSERT INTO gw_attendance_scan_logs (qr_code_id, scanned_by, scan_result, scan_message, qr_token_used, user_agent)
    VALUES (v_qr_record.id, p_user_id, 'expired', 'QR code expired', left(p_qr_token, 50), p_user_agent);
    
    RETURN jsonb_build_object('success', false, 'error', 'expired', 'message', 'This QR code has expired. Please ask for a new one.');
  END IF;

  -- Handle session-based attendance
  IF v_qr_record.session_id IS NOT NULL THEN
    SELECT * INTO v_session FROM gw_course_class_sessions WHERE id = v_qr_record.session_id;
    
    IF v_session IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'session_not_found', 'message', 'Session not found');
    END IF;

    -- Check for existing attendance
    SELECT * INTO v_existing_attendance
    FROM gw_session_attendance
    WHERE session_id = v_qr_record.session_id AND student_id = p_user_id;

    IF v_existing_attendance IS NOT NULL THEN
      INSERT INTO gw_attendance_scan_logs (qr_code_id, scanned_by, scan_result, scan_message, session_id, user_agent)
      VALUES (v_qr_record.id, p_user_id, 'already_recorded', 'Attendance already exists', v_qr_record.session_id, p_user_agent);
      
      RETURN jsonb_build_object('success', true, 'message', 'Attendance already recorded', 'already_recorded', true);
    END IF;

    -- Record session attendance
    INSERT INTO gw_session_attendance (session_id, student_id, status, check_in_time, check_in_method)
    VALUES (v_qr_record.session_id, p_user_id, 'present', now(), 'qr_code');

    -- Update scan count
    UPDATE gw_attendance_qr_codes SET scan_count = COALESCE(scan_count, 0) + 1, updated_at = now() WHERE id = v_qr_record.id;

    INSERT INTO gw_attendance_scan_logs (qr_code_id, scanned_by, scan_result, scan_message, session_id, user_agent)
    VALUES (v_qr_record.id, p_user_id, 'success', 'Session attendance recorded', v_qr_record.session_id, p_user_agent);

    RETURN jsonb_build_object('success', true, 'message', 'Attendance recorded successfully!', 'session_title', v_session.title);
  END IF;

  -- Handle event-based attendance
  IF v_qr_record.event_id IS NOT NULL THEN
    v_event_source := NULL;

    -- Try events table first
    SELECT id, title INTO v_event FROM events WHERE id = v_qr_record.event_id;
    IF v_event IS NOT NULL THEN
      v_event_source := 'events';
    ELSE
      -- Try gw_events table
      SELECT id, title INTO v_event FROM gw_events WHERE id = v_qr_record.event_id;
      IF v_event IS NOT NULL THEN
        v_event_source := 'gw_events';
      END IF;
    END IF;

    IF v_event IS NULL THEN
      INSERT INTO gw_attendance_scan_logs (qr_code_id, scanned_by, scan_result, scan_message, event_id, user_agent)
      VALUES (v_qr_record.id, p_user_id, 'event_not_found', 'Event not found', v_qr_record.event_id, p_user_agent);
      
      RETURN jsonb_build_object('success', false, 'error', 'event_not_found', 'message', 'Event not found');
    END IF;

    -- Check existing in gw_event_attendance
    SELECT * INTO v_existing_attendance
    FROM gw_event_attendance
    WHERE event_id = v_qr_record.event_id AND user_id = p_user_id;

    IF v_existing_attendance IS NOT NULL THEN
      INSERT INTO gw_attendance_scan_logs (qr_code_id, scanned_by, scan_result, scan_message, event_id, user_agent)
      VALUES (v_qr_record.id, p_user_id, 'already_recorded', 'Attendance already exists', v_qr_record.event_id, p_user_agent);
      
      RETURN jsonb_build_object('success', true, 'message', 'Attendance already recorded', 'already_recorded', true);
    END IF;

    -- Record in gw_event_attendance (always)
    INSERT INTO gw_event_attendance (event_id, user_id, status, check_in_time, check_in_method)
    VALUES (v_qr_record.event_id, p_user_id, 'present', now(), 'qr_code')
    ON CONFLICT (event_id, user_id) DO NOTHING;

    -- Only insert into legacy attendance table if event exists in the events table (FK constraint)
    IF v_event_source = 'events' THEN
      INSERT INTO attendance (event_id, user_id, status, recorded_at)
      VALUES (v_qr_record.event_id, p_user_id, 'present', now())
      ON CONFLICT DO NOTHING;
    END IF;

    -- Update scan count
    UPDATE gw_attendance_qr_codes SET scan_count = COALESCE(scan_count, 0) + 1, updated_at = now() WHERE id = v_qr_record.id;

    INSERT INTO gw_attendance_scan_logs (qr_code_id, scanned_by, scan_result, scan_message, event_id, user_agent)
    VALUES (v_qr_record.id, p_user_id, 'success', 'Event attendance recorded', v_qr_record.event_id, p_user_agent);

    RETURN jsonb_build_object('success', true, 'message', 'Attendance recorded for ' || COALESCE(v_event.title, 'event'), 'event_title', v_event.title);
  END IF;

  RETURN jsonb_build_object('success', false, 'error', 'no_context', 'message', 'QR code has no associated event or session');
end;
$$;
