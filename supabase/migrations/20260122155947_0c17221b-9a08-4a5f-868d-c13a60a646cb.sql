-- Add RLS policy for academy_course_badges to allow authenticated users to read
CREATE POLICY "Anyone can view active course badges"
ON public.academy_course_badges
FOR SELECT
USING (is_active = true);

-- Allow admins to manage course badges
CREATE POLICY "Admins can manage course badges"
ON public.academy_course_badges
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true)
  )
);