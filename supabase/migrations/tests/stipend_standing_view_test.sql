-- Behavioural test for v_stipend_standing. Wrapped in a transaction that
-- ALWAYS rolls back, so it is safe to run against a populated database.
-- Verified 2026-08-06 against postgres:16.
BEGIN;
-- Exercises v_stipend_standing against known scenarios and asserts the
-- numbers match src/features/stipends/calculate.ts.
SET session_replication_role = replica;  -- bypass RLS as table owner

DO $$
DECLARE
  tenant   UUID := '11111111-1111-1111-1111-111111111111';
  student  UUID := '22222222-2222-2222-2222-222222222222';
  ghost    UUID := '33333333-3333-3333-3333-333333333333';
  period   UUID;
  award    UUID;
  ghost_aw UUID;
  ev       UUID;
  i        INT;
  r        RECORD;
BEGIN
  INSERT INTO public.gw_stipend_periods
    (tenant_id, name, starts_on, ends_on, default_amount, required_services, status)
  VALUES (tenant, 'Fall 2026', '2026-08-01', '2026-12-15', 500, 20, 'active')
  RETURNING id INTO period;

  INSERT INTO public.gw_stipend_awards (tenant_id, period_id, user_id, base_amount)
  VALUES (tenant, period, student, 500) RETURNING id INTO award;

  INSERT INTO public.gw_stipend_awards (tenant_id, period_id, user_id, base_amount)
  VALUES (tenant, period, ghost, 500) RETURNING id INTO ghost_aw;

  -- 18 services attended, 2 missed.
  FOR i IN 1..20 LOOP
    INSERT INTO public.gw_events
      (tenant_id, title, start_date, event_type, status, attendance_required)
    VALUES (tenant, 'Service ' || i, ('2026-09-01'::date + i)::timestamptz,
            'service', 'scheduled', true)
    RETURNING id INTO ev;

    INSERT INTO public.gw_event_attendance
      (tenant_id, event_id, user_id, attendance_status)
    VALUES (tenant, ev, student, CASE WHEN i <= 18 THEN 'present' ELSE 'absent' END);
    -- `ghost` is never marked on any of these: roll WAS taken, so each is an
    -- unmarked absence for them.
  END LOOP;

  -- An event where roll was never taken at all. Must be excluded entirely.
  INSERT INTO public.gw_events
    (tenant_id, title, start_date, event_type, status, attendance_required)
  VALUES (tenant, 'Unrecorded rehearsal', '2026-10-01'::timestamptz,
          'service', 'scheduled', true);

  -- A cancelled event with attendance rows. Must also be excluded.
  INSERT INTO public.gw_events
    (tenant_id, title, start_date, event_type, status, attendance_required)
  VALUES (tenant, 'Cancelled concert', '2026-10-02'::timestamptz,
          'service', 'cancelled', true)
  RETURNING id INTO ev;
  INSERT INTO public.gw_event_attendance
    (tenant_id, event_id, user_id, attendance_status)
  VALUES (tenant, ev, student, 'absent');

  SELECT * INTO r FROM public.v_stipend_standing WHERE award_id = award;

  ASSERT r.countable_events = 20,
    format('expected 20 countable events, got %s', r.countable_events);
  ASSERT r.credited_services = 18,
    format('expected 18 credited, got %s', r.credited_services);
  ASSERT r.absences = 2, format('expected 2 absences, got %s', r.absences);
  ASSERT r.per_service_value = 25.00,
    format('expected 25.00 per service, got %s', r.per_service_value);
  ASSERT r.earned = 450.00, format('expected 450.00 earned, got %s', r.earned);
  ASSERT r.forfeited = 50.00,
    format('expected 50.00 forfeited, got %s', r.forfeited);
  ASSERT r.unmarked_count = 0,
    format('expected 0 unmarked, got %s', r.unmarked_count);

  -- The student who was never marked on any event.
  SELECT * INTO r FROM public.v_stipend_standing WHERE award_id = ghost_aw;
  ASSERT r.unmarked_count = 20,
    format('expected 20 unmarked, got %s', r.unmarked_count);
  ASSERT r.earned = 0.00,
    format('expected unmarked student to earn 0, got %s', r.earned);

  RAISE NOTICE 'scenario 1 (pro-rata, exclusions, unmarked) passed';
END $$;

-- Late = half credit, and an unmapped status earns nothing but is flagged.
DO $$
DECLARE
  tenant  UUID := '44444444-4444-4444-4444-444444444444';
  student UUID := '55555555-5555-5555-5555-555555555555';
  period  UUID;
  award   UUID;
  ev      UUID;
  i       INT;
  r       RECORD;
BEGIN
  INSERT INTO public.gw_stipend_periods
    (tenant_id, name, starts_on, ends_on, default_amount, required_services, status)
  VALUES (tenant, 'Spring 2027', '2027-01-01', '2027-05-01', 500, 20, 'active')
  RETURNING id INTO period;

  INSERT INTO public.gw_stipend_awards (tenant_id, period_id, user_id, base_amount)
  VALUES (tenant, period, student, 500) RETURNING id INTO award;

  FOR i IN 1..20 LOOP
    INSERT INTO public.gw_events
      (tenant_id, title, start_date, event_type, status, attendance_required)
    VALUES (tenant, 'Service ' || i, ('2027-02-01'::date + i)::timestamptz,
            'service', 'scheduled', true)
    RETURNING id INTO ev;

    INSERT INTO public.gw_event_attendance
      (tenant_id, event_id, user_id, attendance_status)
    VALUES (tenant, ev, student,
            CASE WHEN i = 20 THEN 'late'
                 WHEN i = 19 THEN 'sabbatical'
                 ELSE 'present' END);
  END LOOP;

  SELECT * INTO r FROM public.v_stipend_standing WHERE award_id = award;

  -- 18 present + 1 late(0.5) + 1 unmapped(no credit) = 18.5
  ASSERT r.credited_services = 18.5,
    format('expected 18.5 credited, got %s', r.credited_services);
  ASSERT r.unmapped_count = 1,
    format('expected 1 unmapped, got %s', r.unmapped_count);
  ASSERT r.absences = 0, format('expected 0 absences, got %s', r.absences);
  ASSERT r.earned = 462.50, format('expected 462.50 earned, got %s', r.earned);

  RAISE NOTICE 'scenario 2 (late half-credit, unmapped status) passed';
END $$;

-- Tenant isolation: the view must never mix tenants.
DO $$
DECLARE n INT;
BEGIN
  SELECT COUNT(DISTINCT tenant_id) INTO n FROM public.v_stipend_standing;
  ASSERT n = 2, format('expected 2 distinct tenants in fixture, got %s', n);

  SELECT COUNT(*) INTO n FROM public.v_stipend_standing s
  JOIN public.gw_stipend_periods p ON p.id = s.period_id
  WHERE p.tenant_id <> s.tenant_id;
  ASSERT n = 0, 'a standing row crossed tenants';

  RAISE NOTICE 'scenario 3 (no cross-tenant leakage in joins) passed';
END $$;
ROLLBACK;
