-- Populate gw_attendance_sessions from gw_course_calendar for MUS 240
-- Course ID: 23c4ee3c-7bbb-4534-8c0a-eecd88298d37

INSERT INTO gw_attendance_sessions (
  id,
  course_id,
  title,
  description,
  opens_at,
  closes_at,
  status,
  mode,
  roster_scope,
  allow_late_checkin,
  late_threshold_minutes,
  requires_grading,
  created_by
)
SELECT 
  cc.id,
  cc.course_id,
  cc.title,
  cc.description,
  cc.start_time as opens_at,
  cc.end_time as closes_at,
  CASE 
    WHEN cc.start_time < NOW() AND cc.end_time < NOW() THEN 'closed'
    WHEN cc.start_time <= NOW() AND cc.end_time >= NOW() THEN 'open'
    ELSE 'scheduled'
  END as status,
  'hybrid',
  'enrolled_students',
  true,
  15,
  true,
  'aece359b-a80a-4726-ad75-49ed17fe20d2'
FROM gw_course_calendar cc
WHERE cc.course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'
  AND cc.event_type = 'class'
ON CONFLICT (id) DO NOTHING;