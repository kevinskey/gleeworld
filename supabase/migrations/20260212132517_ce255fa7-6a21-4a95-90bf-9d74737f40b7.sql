
-- Create a SECURITY DEFINER function to check course enrollment
-- This bypasses nested RLS issues when checking enrollment from within other RLS policies
CREATE OR REPLACE FUNCTION public.is_enrolled_in_course(p_user_id uuid, p_course_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM gw_course_enrollments
    WHERE user_id = p_user_id
      AND course_id = p_course_id
      AND enrollment_status = 'enrolled'
  )
  OR EXISTS (
    SELECT 1 FROM mus240_enrollments
    WHERE student_id = p_user_id
      AND enrollment_status = 'enrolled'
      AND p_course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'::uuid
  );
$$;

-- Drop the old policy
DROP POLICY IF EXISTS "Enrolled students can view published assignments" ON public.gw_course_assignments;

-- Create updated policy using the SECURITY DEFINER function
CREATE POLICY "Enrolled students can view published assignments"
ON public.gw_course_assignments
FOR SELECT
USING (
  is_published = true
  AND (
    public.is_enrolled_in_course(auth.uid(), course_id)
    OR EXISTS (
      SELECT 1 FROM gw_profiles
      WHERE gw_profiles.user_id = auth.uid()
        AND (gw_profiles.role = 'instructor' OR gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
    )
  )
);
