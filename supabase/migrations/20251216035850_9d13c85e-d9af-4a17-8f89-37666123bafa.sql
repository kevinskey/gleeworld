-- Drop existing policies
DROP POLICY IF EXISTS "Enrolled users can view lounge posts" ON gw_course_lounge_posts;
DROP POLICY IF EXISTS "Enrolled users can create posts" ON gw_course_lounge_posts;

-- Create helper function to check MUS 070 member access
CREATE OR REPLACE FUNCTION public.has_course_lounge_access(course_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Standard enrollment check
    SELECT 1 FROM gw_course_enrollments
    WHERE course_id = course_uuid AND user_id = auth.uid()
  ) OR EXISTS (
    -- MUS 070 member auto-access: check if this is MUS 070 course and user is a member
    SELECT 1 FROM gw_courses c
    JOIN gw_profiles p ON p.user_id = auth.uid()
    WHERE c.id = course_uuid 
      AND c.course_code = 'MUS 070'
      AND p.role = 'member'
  )
$$;

-- Recreate policies using the helper function
CREATE POLICY "Users with course access can view lounge posts"
ON gw_course_lounge_posts FOR SELECT
USING (public.has_course_lounge_access(course_id));

CREATE POLICY "Users with course access can create posts"
ON gw_course_lounge_posts FOR INSERT
WITH CHECK (author_id = auth.uid() AND public.has_course_lounge_access(course_id));