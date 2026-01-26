-- Create a helper function to backfill attendance (runs as security definer)
CREATE OR REPLACE FUNCTION public.backfill_session_attendance(
  p_session_id UUID,
  p_course_id UUID,
  p_semester TEXT DEFAULT 'Spring 2026',
  p_note TEXT DEFAULT 'Retroactive attendance'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  INSERT INTO gw_attendance_records (attendance_session_id, student_profile_id, status, check_in_method, marked_at, note)
  SELECT 
    p_session_id,
    p.id,
    'present',
    'manual',
    NOW(),
    p_note
  FROM gw_profiles p
  JOIN gw_course_enrollments e ON p.user_id = e.user_id
  WHERE e.course_id = p_course_id
    AND e.semester = p_semester
  ON CONFLICT (attendance_session_id, student_profile_id) DO NOTHING;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Mark all students present for Week 2 Wednesday (Jan 21)
SELECT backfill_session_attendance(
  '37b5fadc-2c3b-4d0d-8fab-1b9ce72049a4',
  '23c4ee3c-7bbb-4534-8c0a-eecd88298d37',
  'Spring 2026',
  'Retroactive - QR system not yet connected'
);

-- Mark all students present for Week 2 Friday (Jan 23)  
SELECT backfill_session_attendance(
  '9a9b8b45-df98-4e5f-978c-a52f7e2ec67e',
  '23c4ee3c-7bbb-4534-8c0a-eecd88298d37',
  'Spring 2026',
  'Retroactive - QR system failure'
);