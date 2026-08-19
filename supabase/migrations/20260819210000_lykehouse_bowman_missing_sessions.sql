-- Lyke House (tenant lykehouse / 0fe16ee8-10eb-44d8-9dfb-107bc662f568):
-- the Bowman Scholars course had 13 class sessions against 15 rehearsals on
-- the org calendar. The two absent ones are exactly the two the calendar
-- titles "Bowman Scholars Rehearsal" rather than "Newman & Bowman":
--
--   Thu 2026-10-01 19:00  Memorial of St. Therese of the Child Jesus
--   Thu 2027-01-21 19:00  Memorial of St Agnes
--
-- Without a session row neither rehearsal can take attendance, and Bowman
-- stipends are disbursed on attendance (Bowman Scholar Contract, "Scholarship
-- Disbursement" §1-2).
--
-- These two are linked to their gw_events rows via gw_event_id. The other 13
-- sessions are still unlinked (gw_event_id IS NULL) and are titled "Newman
-- Scholars — Rehearsal" even though the calendar calls them "Newman & Bowman";
-- both left alone here, deliberately, as separate decisions.

INSERT INTO public.gw_course_class_sessions
  (course_id, title, session_date, start_time, end_time, session_type,
   attendance_required, created_by, gw_event_id, tenant_id)
VALUES
  ('34953525-cedd-4a82-9cbd-b538c5d07be1',
   'Bowman Scholars — Rehearsal',
   '2026-10-01', '19:00:00', '21:00:00', 'class', true,
   '4e6c2ec0-1f83-449a-a984-8920f6056ab5',
   '3b85d599-aa89-41b6-8fca-8c5398305011',
   '0fe16ee8-10eb-44d8-9dfb-107bc662f568'),
  ('34953525-cedd-4a82-9cbd-b538c5d07be1',
   'Bowman Scholars — Rehearsal',
   '2027-01-21', '19:00:00', '21:00:00', 'class', true,
   '4e6c2ec0-1f83-449a-a984-8920f6056ab5',
   '918e2d1e-82e1-4929-bc7a-bd22ab9df3be',
   '0fe16ee8-10eb-44d8-9dfb-107bc662f568');

-- Verify: expect 15 rows, the two new ones carrying a gw_event_id.
-- SELECT session_date, start_time, title, gw_event_id
--   FROM public.gw_course_class_sessions
--  WHERE course_id = '34953525-cedd-4a82-9cbd-b538c5d07be1'
--  ORDER BY session_date;
