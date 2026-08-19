-- gw_course_attendance (QR addon / dashboard attendance module) must earn
-- stipend credit, without double-counting a day that was also rolled through
-- an attendance session.
--
-- Always rolls back; safe against a populated database.
BEGIN;
SET session_replication_role = replica;

DO $$
DECLARE
  tenant  UUID := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
  student UUID := 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  other   UUID := '12121212-1212-1212-1212-121212121212';
  prof    UUID;
  oprof   UUID;
  course  UUID := gen_random_uuid();
  period  UUID;
  award   UUID;
  sess    UUID;
  i       INT;
  r       RECORD;
BEGIN
  INSERT INTO public.gw_profiles (user_id) VALUES (student) RETURNING id INTO prof;
  INSERT INTO public.gw_profiles (user_id) VALUES (other)   RETURNING id INTO oprof;
  INSERT INTO public.gw_courses (id, tenant_id, title) VALUES (course, tenant, 'QR Course');

  INSERT INTO public.gw_stipend_periods
    (tenant_id, name, starts_on, ends_on, default_amount, required_services,
     status, course_ids)
  VALUES (tenant, 'GCA test', '2026-09-01', '2026-12-01', 200, 10,
          'active', ARRAY[course])
  RETURNING id INTO period;

  INSERT INTO public.gw_stipend_awards (tenant_id, period_id, user_id, base_amount)
  VALUES (tenant, period, student, 200) RETURNING id INTO award;

  -- 8 days recorded ONLY through the date-based table: 7 present, 1 absent.
  FOR i IN 1..8 LOOP
    INSERT INTO public.gw_course_attendance
      (tenant_id, course_id, student_id, attendance_date, status)
    VALUES (tenant, course, student, DATE '2026-09-01' + i,
            CASE WHEN i = 8 THEN 'absent' ELSE 'present' END);
    -- another student on the same days, to prove units are per-day not per-row
    INSERT INTO public.gw_course_attendance
      (tenant_id, course_id, student_id, attendance_date, status)
    VALUES (tenant, course, other, DATE '2026-09-01' + i, 'present');
  END LOOP;

  SELECT * INTO r FROM public.v_stipend_standing WHERE award_id = award;

  ASSERT r.countable_events = 8,
    format('expected 8 course-date units (one per day), got %s', r.countable_events);
  ASSERT r.credited_services = 7,
    format('expected 7 credited, got %s', r.credited_services);
  ASSERT r.absences = 1, format('expected 1 absence, got %s', r.absences);
  -- 200 * 7 / 10 = 140.00
  ASSERT r.earned = 140.00, format('expected 140.00, got %s', r.earned);

  RAISE NOTICE 'date-based course attendance earns credit, one unit per day';

  -- Now roll ONE of those same days through an attendance session too.
  -- It must NOT count twice.
  INSERT INTO public.gw_attendance_sessions
    (tenant_id, course_id, title, opens_at, status)
  VALUES (tenant, course, 'Also rolled',
          (DATE '2026-09-02')::timestamptz + TIME '10:00', 'closed')
  RETURNING id INTO sess;
  INSERT INTO public.gw_attendance_records
    (tenant_id, attendance_session_id, student_profile_id, status)
  VALUES (tenant, sess, prof, 'present');

  SELECT * INTO r FROM public.v_stipend_standing WHERE award_id = award;

  ASSERT r.countable_events = 8,
    format('double-counted a day rolled both ways: %s units', r.countable_events);
  ASSERT r.credited_services = 7,
    format('expected 7 credited after dedupe, got %s', r.credited_services);
  ASSERT r.earned = 140.00,
    format('expected 140.00 after dedupe, got %s', r.earned);

  RAISE NOTICE 'a day rolled both ways counts once, not twice';
END $$;

-- A student with no row on a day others were marked is unmarked, not paid.
DO $$
DECLARE
  tenant  UUID := '13131313-1313-1313-1313-131313131313';
  ghost   UUID := '14141414-1414-1414-1414-141414141414';
  present UUID := '15151515-1515-1515-1515-151515151515';
  course  UUID := gen_random_uuid();
  period  UUID; award UUID; i INT; r RECORD;
BEGIN
  INSERT INTO public.gw_profiles (user_id) VALUES (ghost);
  INSERT INTO public.gw_profiles (user_id) VALUES (present);
  INSERT INTO public.gw_courses (id, tenant_id, title) VALUES (course, tenant, 'Ghost Course');

  INSERT INTO public.gw_stipend_periods
    (tenant_id, name, starts_on, ends_on, default_amount, required_services,
     status, course_ids)
  VALUES (tenant, 'GCA ghost', '2026-09-01', '2026-12-01', 100, 5, 'active',
          ARRAY[course])
  RETURNING id INTO period;

  INSERT INTO public.gw_stipend_awards (tenant_id, period_id, user_id, base_amount)
  VALUES (tenant, period, ghost, 100) RETURNING id INTO award;

  FOR i IN 1..5 LOOP
    INSERT INTO public.gw_course_attendance
      (tenant_id, course_id, student_id, attendance_date, status)
    VALUES (tenant, course, present, DATE '2026-09-01' + i, 'present');
  END LOOP;

  SELECT * INTO r FROM public.v_stipend_standing WHERE award_id = award;
  ASSERT r.unmarked_count = 5,
    format('expected 5 unmarked, got %s', r.unmarked_count);
  ASSERT r.earned = 0.00, format('expected 0 earned, got %s', r.earned);

  RAISE NOTICE 'unmarked students on course-date rolls surface, earning nothing';
END $$;

ROLLBACK;
