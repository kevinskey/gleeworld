
-- Delete orphaned attendance records (students not enrolled in the course)
DELETE FROM gw_attendance_records ar
USING gw_attendance_sessions s
WHERE ar.attendance_session_id = s.id
  AND s.course_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM gw_course_enrollments e
    WHERE e.user_id = ar.student_profile_id
      AND e.course_id = s.course_id
      AND e.semester = 'Spring 2026'
      AND e.enrollment_status = 'enrolled'
  );

-- Create a function to validate attendance enrollment
CREATE OR REPLACE FUNCTION validate_attendance_enrollment()
RETURNS TRIGGER AS $$
DECLARE
  v_course_id uuid;
  v_is_enrolled boolean;
BEGIN
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

-- Create trigger to enforce enrollment validation on attendance records
DROP TRIGGER IF EXISTS validate_attendance_enrollment_trigger ON gw_attendance_records;
CREATE TRIGGER validate_attendance_enrollment_trigger
  BEFORE INSERT OR UPDATE ON gw_attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION validate_attendance_enrollment();

-- Add comment documenting this constraint
COMMENT ON FUNCTION validate_attendance_enrollment() IS 
'Ensures attendance records can only be created for students enrolled in the course. Prevents roster mismatches between attendance and enrollment tables.';
