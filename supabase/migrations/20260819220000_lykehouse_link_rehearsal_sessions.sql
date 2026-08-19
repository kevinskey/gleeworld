-- Lyke House / Bowman Scholars course 34953525-cedd-4a82-9cbd-b538c5d07be1.
--
-- The 13 original class sessions were created independently of the org
-- calendar: gw_event_id was NULL on all of them, so QR attendance taken at a
-- rehearsal never rolled up to the matching gw_events row. They were also all
-- titled "Newman Scholars — Rehearsal" while the calendar calls the same
-- rehearsals "Faith Formation — Newman & Bowman Scholars Rehearsal" — Bowman
-- scholars opening the course saw only Newman's name on every meeting.
--
-- Match is on tenant + event_type + local (America/New_York) date and start
-- time, which is 1:1 for this course: 13 unlinked sessions, 13 unlinked
-- rehearsal events, no duplicates on either side.

UPDATE public.gw_course_class_sessions s
SET gw_event_id = e.id,
    title       = 'Newman & Bowman Scholars — Rehearsal',
    updated_at  = now()
FROM public.gw_events e
WHERE s.course_id   = '34953525-cedd-4a82-9cbd-b538c5d07be1'
  AND s.gw_event_id IS NULL
  AND e.tenant_id   = s.tenant_id
  AND e.event_type  = 'rehearsal'
  AND (e.start_date AT TIME ZONE 'America/New_York')::date = s.session_date
  AND (e.start_date AT TIME ZONE 'America/New_York')::time = s.start_time;

-- Expect: 15 rows, 0 with a NULL gw_event_id, 0 duplicate event links.
DO $$
DECLARE
  v_total int; v_unlinked int; v_dupes int;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE gw_event_id IS NULL)
    INTO v_total, v_unlinked
    FROM public.gw_course_class_sessions
   WHERE course_id = '34953525-cedd-4a82-9cbd-b538c5d07be1';

  SELECT count(*) INTO v_dupes FROM (
    SELECT gw_event_id
      FROM public.gw_course_class_sessions
     WHERE course_id = '34953525-cedd-4a82-9cbd-b538c5d07be1'
       AND gw_event_id IS NOT NULL
     GROUP BY gw_event_id HAVING count(*) > 1
  ) d;

  RAISE NOTICE 'bowman sessions: % total, % unlinked, % duplicate event links',
    v_total, v_unlinked, v_dupes;

  IF v_unlinked > 0 OR v_dupes > 0 THEN
    RAISE EXCEPTION 'link failed: % unlinked, % duplicates', v_unlinked, v_dupes;
  END IF;
END;
$$;
