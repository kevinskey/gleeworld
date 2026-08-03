-- =============================================================================
-- ACADEMY ROLL CALL — rotating-challenge self check-in
-- Spec: docs/superpowers/specs/2026-08-02-academy-roll-call-design.md
-- =============================================================================

-- 1. Widen mode / check_in_method constraints.
-- NOTE: live data contains check_in_method values beyond the original CHECK
-- (process_qr_attendance_scan inserts 'qr_scan'), so recreate the constraint
-- with the full observed set + 'self'. NOT VALID skips a scan of legacy rows.
ALTER TABLE public.gw_attendance_sessions DROP CONSTRAINT IF EXISTS gw_attendance_sessions_mode_check;
ALTER TABLE public.gw_attendance_sessions
  ADD CONSTRAINT gw_attendance_sessions_mode_check
  CHECK (mode IN ('qr', 'manual', 'hybrid', 'roll_call'));

ALTER TABLE public.gw_attendance_records DROP CONSTRAINT IF EXISTS gw_attendance_records_check_in_method_check;
ALTER TABLE public.gw_attendance_records
  ADD CONSTRAINT gw_attendance_records_check_in_method_check
  CHECK (check_in_method IN ('qr', 'manual', 'pin', 'auto', 'qr_scan', 'gps', 'self')) NOT VALID;

-- 2. Per-session secret seed (NEVER student-readable)
CREATE TABLE public.gw_attendance_session_secrets (
  session_id UUID PRIMARY KEY REFERENCES public.gw_attendance_sessions(id) ON DELETE CASCADE,
  challenge_seed UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID DEFAULT public.current_tenant_id(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gw_attendance_session_secrets ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_tenant_id_secrets BEFORE INSERT ON public.gw_attendance_session_secrets
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default();

-- Instructors/TAs of the course (and admins) may read; nobody writes directly.
CREATE POLICY "Instructors read roll call seeds"
ON public.gw_attendance_session_secrets FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM gw_attendance_sessions s
    JOIN gw_course_enrollments e ON e.course_id = s.course_id
    WHERE s.id = gw_attendance_session_secrets.session_id
      AND e.user_id = auth.uid()
      AND e.role IN ('instructor', 'ta')
      AND e.enrollment_status = 'enrolled'
  )
  OR EXISTS (
    SELECT 1 FROM app_roles ar
    WHERE ar.user_id = auth.uid()
      AND ar.role IN ('superadmin', 'admin', 'super_admin', 'super-admin')
      AND ar.is_active = true
  )
);

-- 3. Challenge attempts (written only by the check-in RPC)
CREATE TABLE public.gw_attendance_challenge_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.gw_attendance_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  symbol_index INTEGER NOT NULL,
  was_correct BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tenant_id UUID DEFAULT public.current_tenant_id()
);
CREATE INDEX idx_challenge_attempts_session_user
  ON public.gw_attendance_challenge_attempts(session_id, user_id);
ALTER TABLE public.gw_attendance_challenge_attempts ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_tenant_id_attempts BEFORE INSERT ON public.gw_attendance_challenge_attempts
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default();

CREATE POLICY "Instructors and owner read challenge attempts"
ON public.gw_attendance_challenge_attempts FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM gw_attendance_sessions s
    JOIN gw_course_enrollments e ON e.course_id = s.course_id
    WHERE s.id = gw_attendance_challenge_attempts.session_id
      AND e.user_id = auth.uid()
      AND e.role IN ('instructor', 'ta')
      AND e.enrollment_status = 'enrolled'
  )
  OR EXISTS (
    SELECT 1 FROM app_roles ar
    WHERE ar.user_id = auth.uid()
      AND ar.role IN ('superadmin', 'admin', 'super_admin', 'super-admin')
      AND ar.is_active = true
  )
);

-- 4. Seed trigger: every roll_call session gets a secret automatically.
CREATE OR REPLACE FUNCTION public.seed_roll_call_secret()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant UUID := (to_jsonb(NEW) ->> 'tenant_id')::uuid;
BEGIN
  IF NEW.mode = 'roll_call' THEN
    INSERT INTO gw_attendance_session_secrets (session_id, tenant_id)
    VALUES (NEW.id, COALESCE(v_tenant, public.current_tenant_id()))
    ON CONFLICT (session_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER seed_roll_call_secret_trigger
  AFTER INSERT OR UPDATE OF mode ON public.gw_attendance_sessions
  FOR EACH ROW EXECUTE FUNCTION public.seed_roll_call_secret();

-- 5. Shared symbol derivation. 8 symbols; slot = floor(epoch/30).
--    Correct index for a slot = first md5 byte of "seed:slot" mod 8.
CREATE OR REPLACE FUNCTION public.roll_call_symbol_for_slot(p_seed uuid, p_slot bigint)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT get_byte(decode(md5(p_seed::text || ':' || p_slot::text), 'hex'), 0) % 8;
$$;

-- 6. Student check-in RPC. Caller = auth.uid(); no user param.
CREATE OR REPLACE FUNCTION public.roll_call_check_in(p_session_id uuid, p_symbol_index integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_session RECORD;
  v_seed UUID;
  v_profile_id UUID;
  v_slot BIGINT;
  v_wrong_count INTEGER;
  v_status TEXT := 'present';
  v_existing RECORD;
  v_now TIMESTAMPTZ := now();
  v_tenant UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHENTICATED', 'message', 'Please sign in.');
  END IF;
  IF p_symbol_index IS NULL OR p_symbol_index < 0 OR p_symbol_index > 7 THEN
    RETURN jsonb_build_object('success', false, 'error', 'BAD_SYMBOL', 'message', 'Invalid symbol.');
  END IF;

  SELECT * INTO v_session FROM gw_attendance_sessions WHERE id = p_session_id;
  IF v_session IS NULL OR v_session.mode <> 'roll_call' THEN
    RETURN jsonb_build_object('success', false, 'error', 'SESSION_NOT_FOUND', 'message', 'Roll call not found.');
  END IF;
  v_tenant := (to_jsonb(v_session) ->> 'tenant_id')::uuid;
  IF v_session.status <> 'open' OR v_now < v_session.opens_at OR v_now > v_session.closes_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'SESSION_CLOSED', 'message', 'This roll call is not open.');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM gw_course_enrollments
    WHERE user_id = v_uid AND course_id = v_session.course_id AND enrollment_status = 'enrolled'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_ENROLLED', 'message', 'You are not enrolled in this course.');
  END IF;

  SELECT id INTO v_profile_id FROM gw_profiles WHERE user_id = v_uid;
  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'PROFILE_NOT_FOUND', 'message', 'Profile not found. See your instructor.');
  END IF;

  -- Already checked in? Idempotent success.
  SELECT * INTO v_existing FROM gw_attendance_records
  WHERE attendance_session_id = p_session_id AND student_profile_id = v_profile_id;
  IF v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'already_recorded', true,
      'status', v_existing.status, 'marked_at', v_existing.marked_at);
  END IF;

  -- Lockout BEFORE symbol validation (brute-force cap).
  SELECT count(*) INTO v_wrong_count FROM gw_attendance_challenge_attempts
  WHERE session_id = p_session_id AND user_id = v_uid AND was_correct = false;
  IF v_wrong_count >= 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'LOCKED', 'locked', true,
      'message', 'Self check-in locked. See your instructor to be marked present.');
  END IF;

  SELECT challenge_seed INTO v_seed FROM gw_attendance_session_secrets WHERE session_id = p_session_id;
  IF v_seed IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_SEED', 'message', 'Session misconfigured. See your instructor.');
  END IF;

  v_slot := floor(extract(epoch FROM v_now) / 30)::bigint;
  IF p_symbol_index <> roll_call_symbol_for_slot(v_seed, v_slot)
     AND p_symbol_index <> roll_call_symbol_for_slot(v_seed, v_slot - 1) THEN
    INSERT INTO gw_attendance_challenge_attempts (session_id, user_id, symbol_index, was_correct, tenant_id)
    VALUES (p_session_id, v_uid, p_symbol_index, false, COALESCE(v_tenant, public.current_tenant_id()));
    RETURN jsonb_build_object('success', false, 'error', 'WRONG_SYMBOL',
      'wrong_attempts', v_wrong_count + 1, 'locked', v_wrong_count + 1 >= 10,
      'message', 'That is not the symbol on the screen. Look up and try again.');
  END IF;

  -- Late handling per session settings.
  IF v_session.late_threshold_minutes IS NOT NULL
     AND v_now > v_session.opens_at + make_interval(mins => v_session.late_threshold_minutes) THEN
    IF v_session.allow_late_checkin THEN
      v_status := 'late';
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'LATE_WINDOW_CLOSED',
        'message', 'The check-in window has closed. See your instructor.');
    END IF;
  END IF;

  INSERT INTO gw_attendance_challenge_attempts (session_id, user_id, symbol_index, was_correct, tenant_id)
  VALUES (p_session_id, v_uid, p_symbol_index, true, COALESCE(v_tenant, public.current_tenant_id()));

  INSERT INTO gw_attendance_records (attendance_session_id, student_profile_id, status, check_in_method, marked_at)
  VALUES (p_session_id, v_profile_id, v_status, 'self', v_now)
  ON CONFLICT (attendance_session_id, student_profile_id) DO NOTHING;

  -- Concurrent double-tap raced us; report the row that won.
  SELECT * INTO v_existing FROM gw_attendance_records
  WHERE attendance_session_id = p_session_id AND student_profile_id = v_profile_id;
  RETURN jsonb_build_object('success', true, 'status', v_existing.status, 'marked_at', v_existing.marked_at);
END;
$$;

-- 7. Instructor schedule RPC: 480 slots (4h) from opens_at, rotate locally.
CREATE OR REPLACE FUNCTION public.get_roll_call_schedule(p_session_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_session RECORD;
  v_seed UUID;
  v_first_slot BIGINT;
  v_slots INTEGER[];
  v_tenant UUID;
BEGIN
  SELECT * INTO v_session FROM gw_attendance_sessions WHERE id = p_session_id;
  IF v_session IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'SESSION_NOT_FOUND');
  END IF;
  IF NOT (
    EXISTS (
      SELECT 1 FROM gw_course_enrollments e
      WHERE e.course_id = v_session.course_id AND e.user_id = v_uid
        AND e.role IN ('instructor', 'ta') AND e.enrollment_status = 'enrolled'
    )
    OR EXISTS (
      SELECT 1 FROM app_roles ar
      WHERE ar.user_id = v_uid
        AND ar.role IN ('superadmin', 'admin', 'super_admin', 'super-admin')
        AND ar.is_active = true
    )
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHORIZED');
  END IF;

  SELECT challenge_seed INTO v_seed FROM gw_attendance_session_secrets WHERE session_id = p_session_id;
  IF v_seed IS NULL THEN
    -- Session predates the trigger or was flipped to roll_call oddly; self-heal.
    v_tenant := (to_jsonb(v_session) ->> 'tenant_id')::uuid;
    INSERT INTO gw_attendance_session_secrets (session_id, tenant_id) VALUES (p_session_id, COALESCE(v_tenant, public.current_tenant_id()))
    ON CONFLICT (session_id) DO NOTHING;
    SELECT challenge_seed INTO v_seed FROM gw_attendance_session_secrets WHERE session_id = p_session_id;
  END IF;

  v_first_slot := floor(extract(epoch FROM v_session.opens_at) / 30)::bigint;
  SELECT array_agg(roll_call_symbol_for_slot(v_seed, s)) INTO v_slots
  FROM generate_series(v_first_slot, v_first_slot + 479) AS s;

  RETURN jsonb_build_object(
    'success', true,
    'first_slot', v_first_slot,
    'slots', to_jsonb(v_slots),
    'interval_seconds', 30,
    'server_now', now(),
    'closes_at', v_session.closes_at
  );
END;
$$;

-- 8. Student state RPC (records RLS keys on auth.uid but rows store profile id,
--    so students cannot reliably SELECT their own record — this is the sturdy path).
CREATE OR REPLACE FUNCTION public.get_my_roll_call_state(p_session_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_profile_id UUID;
  v_record RECORD;
  v_wrong INTEGER;
BEGIN
  SELECT id INTO v_profile_id FROM gw_profiles WHERE user_id = v_uid;
  SELECT count(*) INTO v_wrong FROM gw_attendance_challenge_attempts
  WHERE session_id = p_session_id AND user_id = v_uid AND was_correct = false;
  SELECT * INTO v_record FROM gw_attendance_records
  WHERE attendance_session_id = p_session_id AND student_profile_id = v_profile_id;
  RETURN jsonb_build_object(
    'checked_in', v_record.id IS NOT NULL,
    'status', v_record.status,
    'marked_at', v_record.marked_at,
    'wrong_attempts', v_wrong,
    'locked', v_wrong >= 10
  );
END;
$$;

-- 9. Instructor flags RPC for the live roster (amber indicators).
CREATE OR REPLACE FUNCTION public.get_roll_call_flags(p_session_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_session RECORD;
  v_result JSONB;
BEGIN
  SELECT * INTO v_session FROM gw_attendance_sessions WHERE id = p_session_id;
  IF v_session IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;
  IF NOT (
    EXISTS (
      SELECT 1 FROM gw_course_enrollments e
      WHERE e.course_id = v_session.course_id AND e.user_id = v_uid
        AND e.role IN ('instructor', 'ta') AND e.enrollment_status = 'enrolled'
    )
    OR EXISTS (
      SELECT 1 FROM app_roles ar
      WHERE ar.user_id = v_uid
        AND ar.role IN ('superadmin', 'admin', 'super_admin', 'super-admin')
        AND ar.is_active = true
    )
  ) THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'user_id', a.user_id,
    'student_profile_id', p.id,
    'wrong_attempts', a.wrong_attempts,
    'locked', a.wrong_attempts >= 10
  )), '[]'::jsonb) INTO v_result
  FROM (
    SELECT user_id, count(*) AS wrong_attempts
    FROM gw_attendance_challenge_attempts
    WHERE session_id = p_session_id AND was_correct = false
    GROUP BY user_id
  ) a
  LEFT JOIN gw_profiles p ON p.user_id = a.user_id;
  RETURN v_result;
END;
$$;

-- 10. Grants + realtime
GRANT EXECUTE ON FUNCTION public.roll_call_check_in(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_roll_call_schedule(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_roll_call_state(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_roll_call_flags(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.roll_call_symbol_for_slot(uuid, bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.roll_call_symbol_for_slot(uuid, bigint) FROM anon, authenticated;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                 WHERE pubname = 'supabase_realtime' AND tablename = 'gw_attendance_records') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.gw_attendance_records;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                 WHERE pubname = 'supabase_realtime' AND tablename = 'gw_attendance_sessions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.gw_attendance_sessions;
  END IF;
END $do$;
