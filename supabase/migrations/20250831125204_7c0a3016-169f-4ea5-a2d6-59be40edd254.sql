-- Create a secure function to update student roles for MUS 240
CREATE OR REPLACE FUNCTION update_mus240_student_roles()
RETURNS TABLE(user_id uuid, old_role text, new_role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function bypasses the trigger because it's SECURITY DEFINER
  RETURN QUERY
  UPDATE gw_profiles 
  SET role = 'student', updated_at = now()
  WHERE user_id IN (
    SELECT student_id 
    FROM mus240_grade_summaries 
    WHERE semester = 'Fall 2024'
  )
  AND role != 'student'
  RETURNING gw_profiles.user_id, 'student'::text AS old_role, gw_profiles.role AS new_role;
END;
$$;