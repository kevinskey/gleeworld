-- Add course_id to events table to link events to courses
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES gw_courses(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_events_course_id ON public.events(course_id);

-- Enable realtime on gw_course_attendance_summary
ALTER TABLE public.gw_course_attendance_summary REPLICA IDENTITY FULL;

-- Add to realtime publication (if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'gw_course_attendance_summary'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE gw_course_attendance_summary;
  END IF;
END $$;

-- Function to update attendance summary when QR attendance is recorded
CREATE OR REPLACE FUNCTION public.sync_attendance_to_course_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event RECORD;
  v_student_profile_id uuid;
  v_student_name text;
  v_semester text;
  v_existing_id uuid;
BEGIN
  -- Get event details including course_id and attendance_type
  SELECT e.course_id, e.event_type, e.attendance_type, e.start_date
  INTO v_event
  FROM events e
  WHERE e.id = NEW.event_id;
  
  -- Only process if event is linked to a course
  IF v_event.course_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get student profile id from gw_student_profiles (user_id maps to auth user)
  SELECT id, full_name INTO v_student_profile_id, v_student_name
  FROM gw_student_profiles
  WHERE user_id = NEW.user_id;
  
  -- If no student profile, try gw_profiles
  IF v_student_profile_id IS NULL THEN
    SELECT user_id, full_name INTO v_student_profile_id, v_student_name
    FROM gw_profiles
    WHERE user_id = NEW.user_id;
  END IF;
  
  IF v_student_profile_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Determine semester from event date
  v_semester := CASE 
    WHEN EXTRACT(MONTH FROM v_event.start_date) >= 8 THEN 'FALL ' || EXTRACT(YEAR FROM v_event.start_date)::text
    WHEN EXTRACT(MONTH FROM v_event.start_date) <= 5 THEN 'SPRING ' || EXTRACT(YEAR FROM v_event.start_date)::text
    ELSE 'SUMMER ' || EXTRACT(YEAR FROM v_event.start_date)::text
  END;
  
  -- Check if summary record exists
  SELECT id INTO v_existing_id
  FROM gw_course_attendance_summary
  WHERE course_id = v_event.course_id
    AND student_id = v_student_profile_id
    AND semester = v_semester;
  
  IF v_existing_id IS NULL THEN
    -- Create new summary record
    INSERT INTO gw_course_attendance_summary (
      course_id, student_id, student_name, semester,
      excused_rehearsal_absences, unexcused_rehearsal_absences,
      tardies, excused_performance_absences, unexcused_performance_absences,
      is_dropped, notes
    ) VALUES (
      v_event.course_id, v_student_profile_id, v_student_name, v_semester,
      0, 0, 0, 0, 0, false, 'Auto-created from QR attendance'
    )
    RETURNING id INTO v_existing_id;
  END IF;
  
  -- Update based on attendance status and event type
  -- For 'present' status via QR, we don't increment absences
  -- For 'late' status, increment tardies
  IF NEW.status = 'late' THEN
    UPDATE gw_course_attendance_summary
    SET tardies = tardies + 1,
        updated_at = NOW()
    WHERE id = v_existing_id;
  END IF;
  
  -- Note: absences would be tracked differently (when someone doesn't check in)
  -- This trigger handles positive check-ins (present/late)
  
  RETURN NEW;
END;
$$;

-- Create trigger on attendance table
DROP TRIGGER IF EXISTS trigger_sync_attendance_to_summary ON attendance;
CREATE TRIGGER trigger_sync_attendance_to_summary
  AFTER INSERT ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION sync_attendance_to_course_summary();