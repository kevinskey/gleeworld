-- Behavioural test for course-session support in v_stipend_standing.
-- Wrapped in a transaction that ALWAYS rolls back, so it is safe to run
-- against a populated database. Verified 2026-08-06 against postgres:16.
BEGIN;
SET session_replication_role = replica;  -- bypass RLS/triggers as owner

DO $$
DECLARE
  tenant   UUID := '77777777-7777-7777-7777-777777777777';
  student  UUID := '88888888-8888-8888-8888-888888888888';
  prof     UUID;
  bowman   UUID := gen_random_uuid();
  other    UUID := gen_random_uuid();
  period   UUID;
  award    UUID;
  sess     UUID;
  ev       UUID;
  i        INT;
  r        RECORD;
BEGIN
  INSERT INTO public.gw_profiles (user_id) VALUES (student) RETURNING id INTO prof;
  INSERT INTO public.gw_courses (id, tenant_id, title, course_code)
  VALUES (bowman, tenant, 'Bowman Scholars', 'MUS-240'),
         (other,  tenant, 'Unrelated Course', 'MUS-101');

  -- 20 required services, $500, counting ONLY the Bowman course.
  INSERT INTO public.gw_stipend_periods
    (tenant_id, name, starts_on, ends_on, default_amount, required_services,
     status, course_ids)
  VALUES (tenant, 'Fall 2026', '2026-08-01', '2026-12-15', 500, 20,
          'active', ARRAY[bowman])
  RETURNING id INTO period;

  INSERT INTO public.gw_stipend_awards (tenant_id, period_id, user_id, base_amount)
  VALUES (tenant, period, student, 500) RETURNING id INTO award;

  -- 18 Bowman class meetings: 17 present, 1 checked-in-never-scanned-out.
  FOR i IN 1..18 LOOP
    INSERT INTO public.gw_attendance_sessions
      (tenant_id, course_id, title, opens_at, status)
    VALUES (tenant, bowman, 'Class ' || i,
            ('2026-09-01'::date + i)::timestamptz, 'closed')
    RETURNING id INTO sess;

    INSERT INTO public.gw_attendance_records
      (tenant_id, attendance_session_id, student_profile_id, status)
    VALUES (tenant, sess, prof,
            CASE WHEN i = 18 THEN 'in_rehearsal' ELSE 'present' END);
  END LOOP;

  -- A class in a course this period does NOT count. Must be ignored.
  INSERT INTO public.gw_attendance_sessions
    (tenant_id, course_id, title, opens_at, status)
  VALUES (tenant, other, 'Unrelated class', '2026-09-20'::timestamptz, 'closed')
  RETURNING id INTO sess;
  INSERT INTO public.gw_attendance_records
    (tenant_id, attendance_session_id, student_profile_id, status)
  VALUES (tenant, sess, prof, 'present');

  -- A Bowman class where roll was never taken. Must be excluded entirely.
  INSERT INTO public.gw_attendance_sessions
    (tenant_id, course_id, title, opens_at, status)
  VALUES (tenant, bowman, 'No roll taken', '2026-09-25'::timestamptz, 'closed');

  -- A cancelled Bowman class, with records. Must be excluded.
  INSERT INTO public.gw_attendance_sessions
    (tenant_id, course_id, title, opens_at, status)
  VALUES (tenant, bowman, 'Cancelled class', '2026-09-26'::timestamptz, 'cancelled')
  RETURNING id INTO sess;
  INSERT INTO public.gw_attendance_records
    (tenant_id, attendance_session_id, student_profile_id, status)
  VALUES (tenant, sess, prof, 'absent');

  -- One calendar event, attended. Events still count alongside classes.
  INSERT INTO public.gw_events
    (tenant_id, title, start_date, event_type, status, attendance_required)
  VALUES (tenant, 'Sunday Mass', '2026-10-04'::timestamptz, 'service',
          'scheduled', true)
  RETURNING id INTO ev;
  INSERT INTO public.gw_event_attendance
    (tenant_id, event_id, user_id, attendance_status)
  VALUES (tenant, ev, student, 'present');

  SELECT * INTO r FROM public.v_stipend_standing WHERE award_id = award;

  -- 18 class meetings + 1 event = 19 countable units.
  ASSERT r.countable_events = 19,
    format('expected 19 countable units, got %s', r.countable_events);

  -- 17 present classes + 0.5 in_rehearsal + 1 event = 18.5
  ASSERT r.credited_services = 18.5,
    format('expected 18.5 credited, got %s', r.credited_services);
  ASSERT r.absences = 0, format('expected 0 absences, got %s', r.absences);
  ASSERT r.unmapped_count = 0,
    format('in_rehearsal must be mapped, got %s unmapped', r.unmapped_count);
  ASSERT r.unmarked_count = 0,
    format('expected 0 unmarked, got %s', r.unmarked_count);

  -- 500 * 18.5 / 20 = 462.50
  ASSERT r.earned = 462.50, format('expected 462.50 earned, got %s', r.earned);

  RAISE NOTICE 'course sessions: counted, filtered by course, in_rehearsal=0.5, events still count';
END $$;

-- A student never marked in any class is unmarked, not silently paid.
DO $$
DECLARE
  tenant  UUID := '99999999-9999-9999-9999-999999999999';
  ghost   UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  present UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  gprof   UUID; pprof UUID;
  course  UUID := gen_random_uuid();
  period  UUID; ghost_aw UUID; sess UUID; i INT; r RECORD;
BEGIN
  INSERT INTO public.gw_profiles (user_id) VALUES (ghost)   RETURNING id INTO gprof;
  INSERT INTO public.gw_profiles (user_id) VALUES (present) RETURNING id INTO pprof;
  INSERT INTO public.gw_courses (id, tenant_id, title) VALUES (course, tenant, 'Newman Scholars');

  INSERT INTO public.gw_stipend_periods
    (tenant_id, name, starts_on, ends_on, default_amount, required_services,
     status, course_ids)
  VALUES (tenant, 'Spring 2027', '2027-01-01', '2027-05-01', 400, 10,
          'active', ARRAY[course])
  RETURNING id INTO period;

  INSERT INTO public.gw_stipend_awards (tenant_id, period_id, user_id, base_amount)
  VALUES (tenant, period, ghost, 400) RETURNING id INTO ghost_aw;

  FOR i IN 1..10 LOOP
    INSERT INTO public.gw_attendance_sessions
      (tenant_id, course_id, title, opens_at, status)
    VALUES (tenant, course, 'Class ' || i,
            ('2027-02-01'::date + i)::timestamptz, 'closed')
    RETURNING id INTO sess;
    -- Roll IS taken, but only for the other student.
    INSERT INTO public.gw_attendance_records
      (tenant_id, attendance_session_id, student_profile_id, status)
    VALUES (tenant, sess, pprof, 'present');
  END LOOP;

  SELECT * INTO r FROM public.v_stipend_standing WHERE award_id = ghost_aw;
  ASSERT r.unmarked_count = 10,
    format('expected 10 unmarked, got %s', r.unmarked_count);
  ASSERT r.earned = 0.00, format('expected 0 earned, got %s', r.earned);

  RAISE NOTICE 'unmarked-in-class students surface as unmarked, earning nothing';
END $$;

ROLLBACK;
