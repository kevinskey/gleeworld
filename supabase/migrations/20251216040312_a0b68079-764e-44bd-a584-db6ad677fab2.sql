-- Drop policies first
DROP POLICY IF EXISTS "Users with course access can view lounge posts" ON gw_course_lounge_posts;
DROP POLICY IF EXISTS "Users with course access can create posts" ON gw_course_lounge_posts;

-- Now drop the function
DROP FUNCTION IF EXISTS public.has_course_lounge_access(uuid);

-- Add MUS 070 to gw_courses
INSERT INTO gw_courses (id, course_code, title, description, is_active)
VALUES (
  'a0000000-0000-0000-0000-000000000070',
  'MUS 070',
  'Glee Club',
  'The premier choral ensemble of Spelman College with over 100 years of musical excellence.',
  true
) ON CONFLICT DO NOTHING;

-- Helper function for course access
CREATE FUNCTION public.has_course_lounge_access(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM gw_course_enrollments
    WHERE course_id = p_course_id AND user_id = auth.uid()
  ) OR (
    p_course_id = 'a0000000-0000-0000-0000-000000000070'::uuid AND EXISTS (
      SELECT 1 FROM gw_profiles
      WHERE user_id = auth.uid() AND role = 'member'
    )
  ) OR EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
$$;

-- Recreate policies
CREATE POLICY "Users with course access can view lounge posts"
ON gw_course_lounge_posts FOR SELECT
USING (public.has_course_lounge_access(course_id));

CREATE POLICY "Users with course access can create posts"
ON gw_course_lounge_posts FOR INSERT
WITH CHECK (author_id = auth.uid() AND public.has_course_lounge_access(course_id));