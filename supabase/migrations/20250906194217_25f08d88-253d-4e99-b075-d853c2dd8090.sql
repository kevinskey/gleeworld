-- Update semester to current term for auto-enrollment
UPDATE public.mus240_enrollments 
SET semester = 'Fall 2025' 
WHERE semester = 'Fall 2024';

-- Fix any missing RLS policies that might cause auth issues
DROP POLICY IF EXISTS "Students can view their own enrollment" ON public.mus240_enrollments;
CREATE POLICY "Students can view their own enrollment" 
ON public.mus240_enrollments 
FOR SELECT 
USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Allow enrollment creation for authenticated users" ON public.mus240_enrollments;
CREATE POLICY "Allow enrollment creation for authenticated users" 
ON public.mus240_enrollments 
FOR INSERT 
WITH CHECK (auth.uid() = student_id);

-- Ensure the auto-enrollment function uses current semester
CREATE OR REPLACE FUNCTION public.auto_enroll_mus240()
RETURNS trigger AS $$
BEGIN
  -- Auto-enroll new students in current semester (Fall 2025)
  INSERT INTO public.mus240_enrollments (student_id, semester, enrollment_status, enrolled_at)
  VALUES (
    new.user_id,
    'Fall 2025', -- Updated to current semester
    'enrolled',
    now()
  );
  RETURN new;
EXCEPTION WHEN unique_violation THEN
  -- Student already enrolled, ignore
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;