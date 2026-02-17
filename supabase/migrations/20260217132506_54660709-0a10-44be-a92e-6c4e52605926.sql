
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
  v_student_profile_id uuid;
  v_is_enrolled boolean;
  v_existing_session_record record;
  v_scan_id uuid;
  v_record_id uuid;
  v_att_session_id uuid;
begin
  v_normalized_token := replace(replace(p_qr_token, '-', '+'), '_', '/');
  v_normalized_token := rtrim(v_normalized_token, '=');

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

  IF v_qr_record.expires_at < (now() - interval '120 seconds') THEN
    INSERT INTO gw_attendance_scan_logs (qr_code_id, scanned_by, scan_result, scan_message, qr_token_used, user_agent)
    VALUES (v_qr_record.id, p_user_id, 'expired', 'QR code expired', left(p_qr_token, 50), p_user_agent);
    RETURN jsonb_build_object('success', false, 'error', 'expired', 'message', 'This QR code has expired. Please ask for a new one.');
  END IF;

  -- BRANCH 1: Session-based (from Instructor Console)
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
      RETURN jsonb_build_object('success', true, 'message', 'Already checked in', 'already_recorded', true, 'event_title', COALESCE(v_session.title, v_session.course_title));
    END IF;

    PERFORM pg_advisory_xact_lock(
      hashtext('att_' || v_qr_record.attendance_session_id::text || '_' || v_student_profile_id::text)
    );

    SELECT * INTO v_existing_session_record
    FROM gw_attendance_records
    WHERE attendance_session_id = v_qr_record.attendance_session_id AND student_profile_id = v_student_profile_id;

    IF v_existing_session_record IS NOT NULL THEN
      RETURN jsonb_build_object('success', true, 'message', 'Already checked in', 'already_recorded', true, 'event_title', COALESCE(v_session.title, v_session.course_title));
    END IF;

    INSERT INTO gw_attendance_scan_logs (qr_code_id, scanned_by, scan_result, scan_message, session_id, user_agent)
    VALUES (v_qr_record.id, p_user_id, 'success', 'Session attendance recorded', v_qr_record.attendance_session_id, p_user_agent)
    RETURNING id INTO v_scan_id;

    INSERT INTO gw_attendance_records (attendance_session_id, student_profile_id, status, check_in_method, note, marked_at)
    VALUES (v_qr_record.attendance_session_id, v_student_profile_id, 'present', 'qr', 'Scan log: ' || v_scan_id::text, NOW())
    ON CONFLICT (attendance_session_id, student_profile_id) DO NOTHING
    RETURNING id INTO v_record_id;

    UPDATE gw_attendance_qr_codes SET scan_count = COALESCE(scan_count, 0) + 1, updated_at = now() WHERE id = v_qr_record.id;

    RETURN jsonb_build_object('success', true, 'message', 'Attendance recorded for ' || COALESCE(v_session.title, v_session.course_title),
      'event_title', COALESCE(v_session.title, v_session.course_title), 'course_code', v_session.course_code, 'course_id', v_session.course_id);
  END IF;

  -- BRANCH 2: Event-based (from Calendar QR)
  -- Now also writes to gw_attendance_records for course-linked events
  IF v_qr_record.event_id IS NOT NULL THEN
    SELECT e.id, e.title, e.course_id, c.course_code
    INTO v_event
    FROM gw_events e
    LEFT JOIN gw_courses c ON e.course_id = c.id
    WHERE e.id = v_qr_record.event_id;

    IF v_event IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'event_not_found', 'message', 'Event not found');
    END IF;

    -- Check for existing event attendance
    SELECT * INTO v_existing_attendance FROM gw_event_attendance
    WHERE event_id = v_qr_record.event_id AND user_id = p_user_id;

    IF v_existing_attendance IS NOT NULL THEN
      RETURN jsonb_build_object('success', true, 'message', 'Already checked in for ' || v_event.title, 'already_recorded', true,
        'event_title', v_event.title, 'course_code', v_event.course_code, 'course_id', v_event.course_id);
    END IF;

    -- Advisory lock to prevent double-tap race conditions
    PERFORM pg_advisory_xact_lock(
      hashtext('evt_' || v_qr_record.event_id::text || '_' || p_user_id::text)
    );

    -- Re-check after lock
    SELECT * INTO v_existing_attendance FROM gw_event_attendance
    WHERE event_id = v_qr_record.event_id AND user_id = p_user_id;

    IF v_existing_attendance IS NOT NULL THEN
      RETURN jsonb_build_object('success', true, 'message', 'Already checked in for ' || v_event.title, 'already_recorded', true,
        'event_title', v_event.title, 'course_code', v_event.course_code, 'course_id', v_event.course_id);
    END IF;

    -- Log the scan
    INSERT INTO gw_attendance_scan_logs (qr_code_id, scanned_by, scan_result, scan_message, event_id, user_agent)
    VALUES (v_qr_record.id, p_user_id, 'success', 'Event attendance recorded', v_qr_record.event_id, p_user_agent)
    RETURNING id INTO v_scan_id;

    -- Always write to gw_event_attendance (for calendar/member views)
    INSERT INTO gw_event_attendance (event_id, user_id, attendance_status, check_in_time)
    VALUES (v_qr_record.event_id, p_user_id, 'present', now())
    ON CONFLICT (event_id, user_id) DO NOTHING;

    -- NEW: For course-linked events, also write to gw_attendance_records (instructor console source of truth)
    IF v_event.course_id IS NOT NULL THEN
      -- Get the student's profile_id
      SELECT id INTO v_student_profile_id FROM gw_profiles WHERE user_id = p_user_id;
      
      IF v_student_profile_id IS NOT NULL THEN
        -- Find or create a matching gw_attendance_sessions record for this event
        SELECT id INTO v_att_session_id
        FROM gw_attendance_sessions
        WHERE course_id = v_event.course_id
          AND event_id = v_qr_record.event_id;

        -- If no session linked by event_id, try matching by date+title
        IF v_att_session_id IS NULL THEN
          SELECT s.id INTO v_att_session_id
          FROM gw_attendance_sessions s
          JOIN gw_events e ON e.id = v_qr_record.event_id
          WHERE s.course_id = v_event.course_id
            AND s.opens_at::date = e.start_date::date
            AND s.title = e.title
          LIMIT 1;
        END IF;

        -- If still no session, auto-create one
        IF v_att_session_id IS NULL THEN
          INSERT INTO gw_attendance_sessions (
            course_id, event_id, title, opens_at, closes_at, status, mode, roster_scope, created_by
          )
          SELECT 
            v_event.course_id,
            v_qr_record.event_id,
            v_event.title,
            e.start_date,
            COALESCE(e.end_date, e.start_date + interval '1 hour'),
            'open',
            'qr',
            'enrolled_students',
            p_user_id
          FROM gw_events e WHERE e.id = v_qr_record.event_id
          RETURNING id INTO v_att_session_id;
        END IF;

        -- Write attendance record
        IF v_att_session_id IS NOT NULL THEN
          INSERT INTO gw_attendance_records (
            attendance_session_id, student_profile_id, status, check_in_method, note, marked_at
          )
          VALUES (
            v_att_session_id, v_student_profile_id, 'present', 'qr',
            'Event scan: ' || v_scan_id::text, NOW()
          )
          ON CONFLICT (attendance_session_id, student_profile_id) DO NOTHING;
        END IF;
      END IF;
    END IF;

    UPDATE gw_attendance_qr_codes SET scan_count = COALESCE(scan_count, 0) + 1, updated_at = now() WHERE id = v_qr_record.id;
    RETURN jsonb_build_object('success', true, 'message', 'Attendance recorded for ' || COALESCE(v_event.title, 'event'),
      'event_title', v_event.title, 'course_code', v_event.course_code, 'course_id', v_event.course_id);
  END IF;

  RETURN jsonb_build_object('success', false, 'error', 'no_context', 'message', 'QR code has no associated event or session');
end;
$$;
