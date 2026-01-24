-- Insert attendance records for all enrolled Spring 2026 students
-- 4 sessions x 22 students = 88 records, all marked as 'present'

-- Get enrolled student user_ids and insert attendance for each event
INSERT INTO attendance (id, user_id, event_id, status, recorded_at)
SELECT 
  gen_random_uuid(),
  e.user_id,
  ev.id,
  'present',
  ev.start_date
FROM gw_course_enrollments e
CROSS JOIN (
  SELECT id, start_date FROM events 
  WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'
  AND start_date >= '2026-01-01'
) ev
WHERE e.course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'
AND e.enrollment_status = 'enrolled'
AND e.semester = 'Spring 2026'
AND e.user_id IS NOT NULL;