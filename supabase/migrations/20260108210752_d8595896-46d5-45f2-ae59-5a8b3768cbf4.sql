-- Create table for external grades from Sight Singing Studio
CREATE TABLE public.external_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_email TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'sight-singing-studio',
  exercise_title TEXT NOT NULL,
  pitch_score NUMERIC,
  rhythm_score NUMERIC,
  completed_at TIMESTAMPTZ,
  external_attempt_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.external_grades ENABLE ROW LEVEL SECURITY;

-- Allow public insert (webhook will validate via secret header)
CREATE POLICY "Allow webhook inserts"
ON public.external_grades
FOR INSERT
WITH CHECK (true);

-- Allow admins to view all grades
CREATE POLICY "Admins can view all grades"
ON public.external_grades
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Allow students to view their own grades
CREATE POLICY "Students can view own grades"
ON public.external_grades
FOR SELECT
USING (
  student_email = (
    SELECT email FROM auth.users WHERE id = auth.uid()
  )
);

-- Create index for faster lookups
CREATE INDEX idx_external_grades_student_email ON public.external_grades(student_email);
CREATE INDEX idx_external_grades_external_attempt_id ON public.external_grades(external_attempt_id);