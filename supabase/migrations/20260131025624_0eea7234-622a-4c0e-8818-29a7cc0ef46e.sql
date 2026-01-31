
-- Fix the validation function to handle NULL student_profile_id
CREATE OR REPLACE FUNCTION validate_attendance_enrollment()
RETURNS TRIGGER AS $$
DECLARE
  v_course_id uuid;
  v_is_enrolled boolean;
BEGIN
  -- Reject NULL student_profile_id
  IF NEW.student_profile_id IS NULL THEN
    RAISE EXCEPTION 'Student profile ID cannot be NULL';
  END IF;

  -- Get the course_id from the attendance session
  SELECT course_id INTO v_course_id
  FROM gw_attendance_sessions
  WHERE id = NEW.attendance_session_id;
  
  -- If no course_id (event-based attendance), allow the record
  IF v_course_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check if the student is enrolled in the course
  SELECT EXISTS (
    SELECT 1 FROM gw_course_enrollments
    WHERE user_id = NEW.student_profile_id
      AND course_id = v_course_id
      AND semester = 'Spring 2026'
      AND enrollment_status = 'enrolled'
  ) INTO v_is_enrolled;
  
  -- If not enrolled, reject the record
  IF NOT v_is_enrolled THEN
    RAISE EXCEPTION 'Student % is not enrolled in course %', NEW.student_profile_id, v_course_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Now insert retroactive attendance, filtering out null user_ids
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
  e.user_id as student_profile_id,
  'present' as status,
  'manual' as check_in_method,
  s.opens_at as marked_at,
  'Retroactive attendance - marked present for sessions before Jan 28, 2026' as note
FROM gw_attendance_sessions s
JOIN gw_courses c ON c.id = s.course_id
JOIN gw_course_enrollments e ON e.course_id = c.id 
  AND e.semester = 'Spring 2026' 
  AND e.enrollment_status = 'enrolled'
  AND e.user_id IS NOT NULL
WHERE s.opens_at < '2026-01-28'
  AND c.course_code IN ('MUS 070', 'MUS 240', 'MUS 210')
ON CONFLICT (attendance_session_id, student_profile_id) DO NOTHING;
