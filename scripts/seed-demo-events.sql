-- Harmony Hall Choir season events for the demo tenant. Idempotent
-- (keyed on title + demo tenant). Run on the droplet:
--   docker exec -i supabase-db psql -U postgres -d postgres < seed-demo-events.sql
--
-- BEFORE first run, sanity-check column names against the live schema:
--   docker exec supabase-db psql -U postgres -d postgres -c '\d public.gw_events'
-- gw_events.calendar_id is NOT NULL, so the calendar comes first.

DO $$
DECLARE
  v_tenant uuid;
  v_calendar uuid;
BEGIN
  SELECT id INTO v_tenant FROM public.gw_tenants WHERE slug = 'demo';
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'demo tenant not found'; END IF;

  SELECT id INTO v_calendar FROM public.gw_calendars
   WHERE name = 'Harmony Hall Season' LIMIT 1;
  IF v_calendar IS NULL THEN
    INSERT INTO public.gw_calendars (name, description, color, is_default, is_visible)
    VALUES ('Harmony Hall Season', 'Concert season for the Harmony Hall Choir', '#2563eb', true, true)
    RETURNING id INTO v_calendar;
  END IF;

  INSERT INTO public.gw_events
    (tenant_id, calendar_id, title, description, location, start_date, end_date,
     event_type, category, is_public, status)
  SELECT v_tenant, v_calendar, e.title, e.descr, e.loc, e.starts, e.ends,
         e.etype, e.cat, true, 'confirmed'
  FROM (VALUES
    ('Fall Kickoff Rehearsal', 'First full-choir rehearsal of the season. Bring your folders.', 'Harmony Hall, Room 204', timestamptz '2026-08-24 18:00-04', timestamptz '2026-08-24 20:00-04', 'rehearsal', 'rehearsal'),
    ('Sectionals: Sopranos & Altos', 'Upper-voice sectional on the Fall program.', 'Harmony Hall, Room 108', timestamptz '2026-08-31 18:00-04', timestamptz '2026-08-31 19:30-04', 'rehearsal', 'rehearsal'),
    ('Sectionals: Tenors & Basses', 'Lower-voice sectional on the Fall program.', 'Harmony Hall, Room 110', timestamptz '2026-09-02 18:00-04', timestamptz '2026-09-02 19:30-04', 'rehearsal', 'rehearsal'),
    ('Fall Preview Concert', 'A first look at the season repertoire. Free for students, tickets for guests.', 'Harmony Hall Auditorium', timestamptz '2026-09-26 19:30-04', timestamptz '2026-09-26 21:00-04', 'concert', 'performance'),
    ('Community Sing-Along', 'Open community event — the choir leads, everyone sings.', 'Riverside Park Bandshell', timestamptz '2026-10-10 15:00-04', timestamptz '2026-10-10 16:30-04', 'concert', 'community'),
    ('Retreat Weekend', 'Intensive rehearsal retreat: musicianship workshops and full runs.', 'Camp Crescendo', timestamptz '2026-10-23 17:00-04', timestamptz '2026-10-25 12:00-04', 'retreat', 'rehearsal'),
    ('Winter Gala', 'The season centerpiece — full program with guest instrumentalists.', 'Harmony Hall Auditorium', timestamptz '2026-12-12 19:30-05', timestamptz '2026-12-12 21:30-05', 'concert', 'performance'),
    ('Holiday Pops & Reception', 'Lighter holiday set followed by a donor reception.', 'Grand Atrium', timestamptz '2026-12-19 18:00-05', timestamptz '2026-12-19 20:30-05', 'concert', 'performance')
  ) AS e(title, descr, loc, starts, ends, etype, cat)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.gw_events x
    WHERE x.tenant_id = v_tenant AND x.title = e.title
  );
END $$;
