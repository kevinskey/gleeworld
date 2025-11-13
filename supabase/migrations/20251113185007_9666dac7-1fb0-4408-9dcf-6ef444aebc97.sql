-- Ensure RLS is enabled and policies allow instructors/admins to read submissions
-- while students can only read their own.

-- gw_submissions: enable RLS
ALTER TABLE public.gw_submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing SELECT policies if they exist to avoid duplicates
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'gw_submissions' 
      AND policyname = 'Students can view their own submissions'
  ) THEN
    DROP POLICY "Students can view their own submissions" ON public.gw_submissions;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'gw_submissions' 
      AND policyname = 'Instructors and admins can view all submissions'
  ) THEN
    DROP POLICY "Instructors and admins can view all submissions" ON public.gw_submissions;
  END IF;
END $$;

-- Students: can select their own rows
CREATE POLICY "Students can view their own submissions"
ON public.gw_submissions
FOR SELECT
USING (
  auth.uid() = student_id
);

-- Instructors/Admins: can select all rows
CREATE POLICY "Instructors and admins can view all submissions"
ON public.gw_submissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.gw_profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'instructor' OR p.is_admin OR p.is_super_admin)
  )
);
