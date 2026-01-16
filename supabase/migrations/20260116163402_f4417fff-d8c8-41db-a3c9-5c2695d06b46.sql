-- Add RLS policy for course_discussions to restrict creation to instructors/admins

-- First ensure RLS is enabled
ALTER TABLE public.course_discussions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to recreate them properly
DROP POLICY IF EXISTS "Anyone can view discussions" ON public.course_discussions;
DROP POLICY IF EXISTS "Instructors can create discussions" ON public.course_discussions;
DROP POLICY IF EXISTS "Instructors can update their discussions" ON public.course_discussions;
DROP POLICY IF EXISTS "Instructors can delete their discussions" ON public.course_discussions;

-- Everyone can view discussions
CREATE POLICY "Anyone can view discussions"
ON public.course_discussions
FOR SELECT
TO authenticated
USING (true);

-- Only instructors/admins can create discussions
CREATE POLICY "Instructors can create discussions"
ON public.course_discussions
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_instructor_or_admin(auth.uid())
);

-- Instructors/admins can update discussions they created
CREATE POLICY "Instructors can update their discussions"
ON public.course_discussions
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid() AND public.is_instructor_or_admin(auth.uid())
);

-- Instructors/admins can delete discussions they created
CREATE POLICY "Instructors can delete their discussions"
ON public.course_discussions
FOR DELETE
TO authenticated
USING (
  created_by = auth.uid() AND public.is_instructor_or_admin(auth.uid())
);