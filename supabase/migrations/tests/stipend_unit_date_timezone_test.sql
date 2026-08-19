-- Regression test for the UTC date-cast bug.
--
-- A 7pm Eastern event during EST is 00:00 UTC the next day. Casting with the
-- session timezone (UTC) pushed it a day forward, so a period ending on its
-- own last rehearsal date silently dropped that rehearsal.
--
-- Always rolls back; safe against a populated database.
BEGIN;
SET session_replication_role = replica;

DO $$
DECLARE
  tenant  UUID := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  student UUID := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  period  UUID;
  award   UUID;
  ev      UUID;
  r       RECORD;
BEGIN
  INSERT INTO public.gw_tenants (id, slug, name)
  VALUES (tenant, 'tz-test', 'TZ Test') ON CONFLICT DO NOTHING;
  INSERT INTO public.gw_branding_settings (tenant_id, timezone)
  VALUES (tenant, 'America/New_York') ON CONFLICT DO NOTHING;

  -- Period ends ON the last rehearsal date.
  INSERT INTO public.gw_stipend_periods
    (tenant_id, name, starts_on, ends_on, default_amount, required_services, status)
  VALUES (tenant, 'EST edge', '2027-01-01', '2027-03-04', 100, 1, 'active')
  RETURNING id INTO period;

  INSERT INTO public.gw_stipend_awards (tenant_id, period_id, user_id, base_amount)
  VALUES (tenant, period, student, 100) RETURNING id INTO award;

  -- 7pm Eastern on the period's final day = 2027-03-05 00:00 UTC.
  INSERT INTO public.gw_events
    (tenant_id, title, start_date, event_type, status, attendance_required)
  VALUES (tenant, 'Final rehearsal',
          TIMESTAMPTZ '2027-03-04 19:00 America/New_York',
          'rehearsal', 'scheduled', true)
  RETURNING id INTO ev;

  INSERT INTO public.gw_event_attendance
    (tenant_id, event_id, user_id, attendance_status)
  VALUES (tenant, ev, student, 'present');

  SELECT * INTO r FROM public.v_stipend_standing WHERE award_id = award;

  ASSERT r.countable_events = 1,
    format('the last-day 7pm rehearsal was dropped: countable=%s', r.countable_events);
  ASSERT r.credited_services = 1,
    format('expected 1 credited, got %s', r.credited_services);
  ASSERT r.earned = 100.00,
    format('expected full 100.00 earned, got %s', r.earned);

  RAISE NOTICE 'EST evening event on the period end date is counted';
END $$;

-- And the unit_date reported is the Eastern date, not the UTC one.
DO $$
DECLARE d DATE;
BEGIN
  SELECT u.unit_date INTO d
  FROM public.v_stipend_countable_units u
  JOIN public.gw_stipend_periods p ON p.id = u.period_id
  WHERE p.name = 'EST edge';

  ASSERT d = DATE '2027-03-04',
    format('unit_date should be the Eastern date 2027-03-04, got %s', d);

  RAISE NOTICE 'unit_date is reported in the tenant timezone';
END $$;

ROLLBACK;
