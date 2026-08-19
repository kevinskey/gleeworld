-- All-State → calendar sync + deadline reminders.
--
-- CALENDAR. gw_events is the canonical events table (86 call sites; the
-- legacy `events` table is dead). There is no shared createEvent() helper in
-- the codebase — every caller inserts directly — so this does the insert in
-- ONE SQL function rather than adding a 30th duplicated client-side insert.
--
-- Idempotency is by (tenant_id, external_source='all_state', external_id =
-- the Layer 1/2 date row's id). The existing gw_events_google_origin_uniq
-- index does NOT enforce this for us (origin_user_id is NULL for our rows and
-- NULLs never collide), so the function upserts by explicit lookup. Re-running
-- sync after a state moves a deadline UPDATES the event instead of duplicating
-- it — which is the entire point: the calendar follows the canon.
--
-- Events land on a per-tenant "All-State" calendar (found or created), so
-- directors can toggle the whole layer's visibility like any other calendar.
--
-- REMINDERS. Modelled directly on schedule-fee-reminders (the house pattern):
-- a daily job scans open All-State tasks due in the +7-day / +1-day windows
-- and just-overdue, and writes gw_notifications. Idempotent per the same
-- trick — skip anyone already reminded for that task within 20 hours.
-- Students with logins get per-task reminders; each cohort's creator gets a
-- digest count. Students without logins can't be notified — their director's
-- digest is the reminder path, which is honest rather than silent.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Calendar sync, one cohort at a time.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.gw_all_state_sync_cohort_calendar(p_cohort uuid)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cohort   record;
  v_cal      uuid;
  v_count    int := 0;
  r          record;
  v_title    text;
  v_existing uuid;
BEGIN
  SELECT c.id, c.tenant_id, c.program_id, c.name,
         p.name AS program_name, st.name AS state_name
    INTO v_cohort
    FROM gw_all_state_cohorts c
    JOIN gw_all_state_programs p ON p.id = c.program_id
    JOIN gw_all_state_states st ON st.id = p.state_id
   WHERE c.id = p_cohort;
  IF NOT FOUND THEN RAISE EXCEPTION 'cohort % not found', p_cohort; END IF;

  -- The caller must be staff OF THAT TENANT. SECURITY DEFINER bypasses RLS,
  -- so re-assert the fence explicitly instead of inheriting it.
  IF v_cohort.tenant_id IS DISTINCT FROM public.current_tenant_id()
     OR NOT public.gw_all_state_is_staff() THEN
    RAISE EXCEPTION 'not authorised for this cohort';
  END IF;

  -- Find or create the tenant's All-State calendar.
  SELECT id INTO v_cal FROM gw_calendars
   WHERE tenant_id = v_cohort.tenant_id AND name = 'All-State' LIMIT 1;
  IF v_cal IS NULL THEN
    INSERT INTO gw_calendars (name, description, color, tenant_id)
    VALUES ('All-State', 'State audition deadlines and events, synced from the All-State module.',
            '#6366f1', v_cohort.tenant_id)
    RETURNING id INTO v_cal;
  END IF;

  -- State dates + the cohort's own dates, one pass. Cohort dates use
  -- lead_days maths when pegged to a state date.
  -- event_type must satisfy BOTH gw_events and the legacy `events` table:
  -- sync_gw_event_to_events_trigger mirrors every write into `events`, whose
  -- CHECK constraint has a fixed vocabulary that predates this module. So we
  -- map to its words ('deadline' / 'audition' / 'event') rather than
  -- introducing 'all_state' and breaking the mirror. The all-state identity
  -- lives in external_source and category instead.
  FOR r IN
    SELECT d.id AS ext_id, d.title, d.start_at, d.end_at, d.all_day, d.description,
           CASE WHEN d.date_type = 'audition_round' THEN 'audition'
                WHEN d.date_type IN ('registration_deadline','acceptance_deadline') THEN 'deadline'
                ELSE 'event' END AS etype
      FROM gw_all_state_dates d
     WHERE d.program_id = v_cohort.program_id AND d.start_at IS NOT NULL
    UNION ALL
    SELECT cd.id, cd.title,
           CASE WHEN cd.lead_days IS NOT NULL AND cd.source_date_id IS NOT NULL
                THEN (SELECT sd.start_at - make_interval(days => cd.lead_days)
                        FROM gw_all_state_dates sd WHERE sd.id = cd.source_date_id)
                ELSE cd.due_at END,
           NULL, true, COALESCE(cd.notes, 'Set by your director.'), 'deadline'
      FROM gw_all_state_cohort_dates cd
     WHERE cd.cohort_id = p_cohort
  LOOP
    CONTINUE WHEN r.start_at IS NULL;
    v_title := v_cohort.state_name || ' All-State: ' || r.title;

    SELECT id INTO v_existing FROM gw_events
     WHERE tenant_id = v_cohort.tenant_id
       AND external_source = 'all_state'
       AND external_id = r.ext_id::text;

    IF v_existing IS NULL THEN
      -- is_public = true is deliberate and load-bearing twice over. Every
      -- permissive SELECT policy on gw_events is public/self/flag-admin, so a
      -- private event with no creator would be invisible to the membership
      -- admins and students who need it. And these dates ARE public — they
      -- come off the state association's own website; the restrictive tenant
      -- policy still confines them to this tenant's calendar.
      INSERT INTO gw_events
        (title, description, start_date, end_date, all_day, calendar_id,
         tenant_id, event_type, category, is_public, created_by,
         external_source, external_id)
      VALUES
        (v_title, r.description, r.start_at, r.end_at, COALESCE(r.all_day, true), v_cal,
         v_cohort.tenant_id, r.etype, 'all-state', true, auth.uid(),
         'all_state', r.ext_id::text);
    ELSE
      UPDATE gw_events
         SET title = v_title, description = r.description,
             start_date = r.start_at, end_date = r.end_at,
             all_day = COALESCE(r.all_day, true), updated_at = now()
       WHERE id = v_existing;
    END IF;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.gw_all_state_sync_cohort_calendar(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.gw_all_state_sync_cohort_calendar(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Daily reminders. Runs with no request context (pg_cron), so everything
--    is derived from the rows, never from current_tenant_id().
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.gw_all_state_send_reminders()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sent int := 0;
  r record;
BEGIN
  -- Per-student reminders: open tasks due in ~7 days, ~1 day, or overdue by
  -- less than 2 days. Only students with a login can receive one.
  FOR r IN
    SELECT t.id AS task_id, t.title, t.due_at, prof.user_id,
           CASE WHEN t.due_at < now() THEN 'overdue'
                WHEN t.due_at < now() + interval '2 days' THEN 'due tomorrow'
                ELSE 'due in a week' END AS urgency
      FROM gw_all_state_tasks t
      JOIN gw_all_state_participations pa ON pa.id = t.participation_id
      JOIN gw_profiles prof ON prof.id = pa.student_id
     WHERE t.completed_at IS NULL
       AND prof.user_id IS NOT NULL
       AND pa.status NOT IN ('withdrawn','not_selected')
       AND (   t.due_at BETWEEN now() + interval '6 days' AND now() + interval '7 days'
            OR t.due_at BETWEEN now()                     AND now() + interval '1 day'
            OR t.due_at BETWEEN now() - interval '2 days' AND now())
       -- Idempotency: one reminder per task per 20 hours (fee-reminders trick).
       AND NOT EXISTS (
         SELECT 1 FROM gw_notifications n
          WHERE n.user_id = prof.user_id
            AND n.type = 'all_state_reminder'
            AND n.related_id = t.id
            AND n.created_at > now() - interval '20 hours')
  LOOP
    INSERT INTO gw_notifications
      (user_id, title, message, type, category, priority, action_url, related_id)
    VALUES
      (r.user_id,
       CASE r.urgency WHEN 'overdue' THEN 'All-State: overdue item'
                      WHEN 'due tomorrow' THEN 'All-State: due tomorrow'
                      ELSE 'All-State: due in a week' END,
       r.title || ' — ' || to_char(r.due_at, 'FMMonth FMDD'),
       'all_state_reminder', 'all_state',
       CASE WHEN r.urgency = 'overdue' THEN 2 ELSE 1 END,
       '/dashboard/my-all-state', r.task_id);
    v_sent := v_sent + 1;
  END LOOP;

  -- Director digest: one notification per cohort creator with the count of
  -- open items due across their cohort in the next 7 days. This is also the
  -- ONLY reminder path for students without logins.
  FOR r IN
    SELECT c.id AS cohort_id, c.name, c.created_by, count(*) AS due_count
      FROM gw_all_state_tasks t
      JOIN gw_all_state_cohorts c ON c.id = t.cohort_id
     WHERE t.completed_at IS NULL
       AND c.created_by IS NOT NULL
       AND c.archived_at IS NULL
       AND t.due_at BETWEEN now() AND now() + interval '7 days'
     GROUP BY c.id, c.name, c.created_by
    HAVING NOT EXISTS (
      SELECT 1 FROM gw_notifications n
       WHERE n.user_id = c.created_by
         AND n.type = 'all_state_digest'
         AND n.related_id = c.id
         AND n.created_at > now() - interval '20 hours')
  LOOP
    INSERT INTO gw_notifications
      (user_id, title, message, type, category, priority, action_url, related_id)
    VALUES
      (r.created_by, 'All-State: ' || r.name,
       r.due_count || ' checklist item' || CASE WHEN r.due_count = 1 THEN '' ELSE 's' END
         || ' due across your cohort in the next 7 days.',
       'all_state_digest', 'all_state', 1, '/dashboard/all-state', r.cohort_id);
    v_sent := v_sent + 1;
  END LOOP;

  RETURN v_sent;
END;
$$;
REVOKE ALL ON FUNCTION public.gw_all_state_send_reminders() FROM public;
GRANT EXECUTE ON FUNCTION public.gw_all_state_send_reminders() TO service_role;

COMMIT;

-- Cron registration, guarded for environments without pg_cron (the house
-- pattern from 20260706000100_store_reconcile_cron). 11:00 UTC = 7am ET.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('all-state-reminders-daily')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'all-state-reminders-daily');
    PERFORM cron.schedule('all-state-reminders-daily', '0 11 * * *',
                          'SELECT public.gw_all_state_send_reminders()');
  END IF;
END $$;

\echo '=== cron job registered ==='
SELECT jobname, schedule FROM cron.job WHERE jobname='all-state-reminders-daily';

NOTIFY pgrst, 'reload schema';
