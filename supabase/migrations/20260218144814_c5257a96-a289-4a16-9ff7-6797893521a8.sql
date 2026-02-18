-- Mark all 19 enrolled MUS 240 students as 'present' for all sessions before Feb 18, 2026
-- Uses gw_profiles.id (which the validation trigger expects)
INSERT INTO gw_attendance_records (attendance_session_id, student_profile_id, status, check_in_method, marked_at, note)
SELECT s.id, gp.id, 'present', 'manual', s.opens_at, 'Bulk marked present by instructor'
FROM gw_attendance_sessions s
CROSS JOIN (
  SELECT gp.id
  FROM gw_profiles gp
  JOIN gw_course_enrollments ce ON ce.user_id = gp.user_id
  WHERE ce.course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'
  AND ce.enrollment_status = 'enrolled'
) gp
WHERE s.course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'
AND s.opens_at < '2026-02-18T00:00:00Z'
ON CONFLICT (attendance_session_id, student_profile_id) DO UPDATE SET status = 'present', note = 'Bulk marked present by instructor';