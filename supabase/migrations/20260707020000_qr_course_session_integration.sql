-- QR / attendance integration between the main calendar and Glee Academy classes.
--
-- Problem being fixed:
--   CourseClassCalendar created gw_attendance_qr_codes rows with
--   event_id = <gw_course_class_sessions.id> and attendance_session_id NULL.
--   process_qr_attendance_scan resolves event_id against gw_events/events, so
--   every one of those QR codes failed with "Event not found" when scanned.
--
-- This migration:
--   1. Links gw_attendance_sessions to class sessions (class_session_id) and
--      to main-calendar events (gw_event_id) so all three systems share one
--      attendance record set.
--   2. Adds ensure_attendance_session_for_class(): find-or-create the
--      gw_attendance_sessions row for a class session.
--   3. Teaches process_qr_attendance_scan to resolve legacy
--      context_type='course_session' QR codes through that helper (and to
--      permanently repair the QR row by stamping attendance_session_id).
--   4. Backfills attendance sessions for existing unexpired course_session
--      QR codes.

-- ---------------------------------------------------------------------------
-- 1. Schema links
-- ---------------------------------------------------------------------------
ALTER TABLE public.gw_attendance_sessions
  ADD COLUMN IF NOT EXISTS class_session_id UUID REFERENCES public.gw_course_class_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS gw_event_id UUID REFERENCES public.gw_events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_class_session
  ON public.gw_attendance_sessions(class_session_id) WHERE class_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_gw_event
  ON public.gw_attendance_sessions(gw_event_id) WHERE gw_event_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Find-or-create the attendance session for a class session
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_attendance_session_for_class(p_class_session_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
  v_class record;
  v_has_tenant boolean;
  v_tenant uuid;
BEGIN
  -- Already linked?
  SELECT id INTO v_session_id
  FROM gw_attendance_sessions
  WHERE class_session_id = p_class_session_id
  ORDER BY created_at DESC
  LIMIT 1;
  IF v_session_id IS NOT NULL THEN
    RETURN v_session_id;
  END IF;

  SELECT * INTO v_class FROM gw_course_class_sessions WHERE id = p_class_session_id;
  IF v_class IS NULL THEN
    RETURN NULL;
  END IF;

  -- tenant_id columns were added outside repo migrations; handle both shapes.
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'gw_attendance_sessions'
      AND column_name = 'tenant_id'
  ) INTO v_has_tenant;

  IF v_has_tenant THEN
    -- Copy tenant from the class session row so this also works without a JWT
    -- (migration backfill, service-role calls).
    EXECUTE 'SELECT tenant_id FROM gw_course_class_sessions WHERE id = $1'
      INTO v_tenant USING p_class_session_id;

    EXECUTE $ins$
      INSERT INTO gw_attendance_sessions
        (course_id, class_session_id, gw_event_id, title, opens_at, closes_at,
         status, mode, roster_scope, created_by, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6, 'open', 'qr', 'enrolled_students', $7,
              COALESCE($8, public.current_tenant_id()))
      RETURNING id
    $ins$
    INTO v_session_id
    USING v_class.course_id, p_class_session_id, v_class.gw_event_id,
          COALESCE(v_class.title, 'Class Session'),
          (v_class.session_date::date + v_class.start_time::time) AT TIME ZONE 'America/New_York',
          ((v_class.session_date::date + v_class.end_time::time) AT TIME ZONE 'America/New_York') + interval '2 hours',
          v_class.created_by, v_tenant;
  ELSE
    INSERT INTO gw_attendance_sessions
      (course_id, class_session_id, gw_event_id, title, opens_at, closes_at,
       status, mode, roster_scope, created_by)
    VALUES (v_class.course_id, p_class_session_id, v_class.gw_event_id,
            COALESCE(v_class.title, 'Class Session'),
            (v_class.session_date::date + v_class.start_time::time) AT TIME ZONE 'America/New_York',
            ((v_class.session_date::date + v_class.end_time::time) AT TIME ZONE 'America/New_York') + interval '2 hours',
            'open', 'qr', 'enrolled_students', v_class.created_by)
    RETURNING id INTO v_session_id;
  END IF;

  RETURN v_session_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_attendance_session_for_class(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ensure_attendance_session_for_class(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Scan RPC: resolve legacy course_session QR codes
-- ---------------------------------------------------------------------------
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
  v_session_id uuid;
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

  v_session_id := v_qr_record.attendance_session_id;

  -- Legacy course_session QR codes carry the class-session id in event_id /
  -- custom_data.session_id and no attendance_session_id. Resolve (and repair)
  -- them so they behave exactly like session QRs.
  IF v_session_id IS NULL AND v_qr_record.context_type = 'course_session' THEN
    v_session_id := public.ensure_attendance_session_for_class(
      COALESCE((v_qr_record.custom_data->>'session_id')::uuid, v_qr_record.event_id)
    );
    IF v_session_id IS NOT NULL THEN
      UPDATE gw_attendance_qr_codes
      SET attendance_session_id = v_session_id, updated_at = now()
      WHERE id = v_qr_record.id;
    END IF;
  END IF;

  -- BRANCH 1: Session-based attendance
  IF v_session_id IS NOT NULL THEN
    SELECT s.*, c.course_code, c.title as course_title, c.id as course_id
    INTO v_session
    FROM gw_attendance_sessions s
    LEFT JOIN gw_courses c ON s.course_id = c.id
    WHERE s.id = v_session_id;

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
    WHERE attendance_session_id = v_session_id AND student_profile_id = v_student_profile_id;

    IF v_existing_session_record IS NOT NULL THEN
      RETURN jsonb_build_object('success', true, 'message', 'Already checked in', 'already_recorded', true,
        'event_title', COALESCE(v_session.title, v_session.course_title),
        'course_id', v_session.course_id);
    END IF;

    INSERT INTO gw_attendance_scan_logs (qr_code_id, scanned_by, scan_result, scan_message, session_id, user_agent)
    VALUES (v_qr_record.id, p_user_id, 'success', 'Session check-in recorded (in_rehearsal)', v_session_id, p_user_agent)
    RETURNING id INTO v_scan_id;

    -- Two-step attendance: check-in marks 'in_rehearsal', checkout QR upgrades to 'present'
    INSERT INTO gw_attendance_records (attendance_session_id, student_profile_id, status, check_in_method, qr_scan_id, marked_at, note)
    VALUES (v_session_id, v_student_profile_id, 'in_rehearsal', 'qr', v_scan_id, NOW(), 'QR check-in at ' || to_char(now(), 'HH12:MI AM'))
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

-- ---------------------------------------------------------------------------
-- 4. Backfill: repair unexpired course_session QR codes now instead of lazily
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
  v_session_id uuid;
BEGIN
  FOR r IN
    SELECT q.id, COALESCE((q.custom_data->>'session_id')::uuid, q.event_id) AS class_session_id
    FROM gw_attendance_qr_codes q
    WHERE q.context_type = 'course_session'
      AND q.attendance_session_id IS NULL
      AND q.is_active = true
      AND q.expires_at > now()
  LOOP
    v_session_id := public.ensure_attendance_session_for_class(r.class_session_id);
    IF v_session_id IS NOT NULL THEN
      UPDATE gw_attendance_qr_codes
      SET attendance_session_id = v_session_id, updated_at = now()
      WHERE id = r.id;
    END IF;
  END LOOP;
END;
$$;
