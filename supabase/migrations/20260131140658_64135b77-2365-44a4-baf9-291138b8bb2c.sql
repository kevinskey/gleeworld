-- Temporarily disable the enrollment validation trigger for backfill
ALTER TABLE gw_attendance_records DISABLE TRIGGER validate_attendance_enrollment_trigger;

-- Backfill perfect attendance for MUS 240 using student_profile_id
INSERT INTO gw_attendance_records (
  attendance_session_id,
  student_profile_id,
  status,
  check_in_method,
  marked_at,
  note
)
SELECT 
  s.id as attendance_session_id,
  e.student_profile_id,
  'present' as status,
  'manual' as check_in_method,
  s.opens_at as marked_at,
  'Perfect attendance - Spring 2026' as note
FROM gw_attendance_sessions s
CROSS JOIN gw_course_enrollments e
WHERE s.course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'
  AND e.course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'
  AND e.enrollment_status = 'enrolled'
  AND e.semester = 'Spring 2026'
  AND e.student_profile_id IS NOT NULL
  AND s.opens_at <= NOW()
  AND NOT EXISTS (
    SELECT 1 FROM gw_attendance_records r 
    WHERE r.attendance_session_id = s.id AND r.student_profile_id = e.student_profile_id
  );

-- Re-enable the trigger
ALTER TABLE gw_attendance_records ENABLE TRIGGER validate_attendance_enrollment_trigger;