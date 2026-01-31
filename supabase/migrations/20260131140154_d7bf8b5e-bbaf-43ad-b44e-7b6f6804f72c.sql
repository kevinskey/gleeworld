
-- Fix the attendance enrollment validation trigger to properly look up user_id from profile
-- The bug is that student_profile_id is the profile.id, not the user_id
CREATE OR REPLACE FUNCTION public.validate_attendance_enrollment()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_course_id uuid;
  v_user_id uuid;
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
  
  -- Get the user_id from the profile (student_profile_id is profile.id, not user_id)
  SELECT user_id INTO v_user_id
  FROM gw_profiles
  WHERE id = NEW.student_profile_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Profile % not found', NEW.student_profile_id;
  END IF;
  
  -- Check if the student is enrolled in the course
  SELECT EXISTS (
    SELECT 1 FROM gw_course_enrollments
    WHERE user_id = v_user_id
      AND course_id = v_course_id
      AND enrollment_status = 'enrolled'
  ) INTO v_is_enrolled;
  
  -- If not enrolled, reject the record
  IF NOT v_is_enrolled THEN
    RAISE EXCEPTION 'Student % (user: %) is not enrolled in course %', NEW.student_profile_id, v_user_id, v_course_id;
  END IF;
  
  RETURN NEW;
END;
$function$;
