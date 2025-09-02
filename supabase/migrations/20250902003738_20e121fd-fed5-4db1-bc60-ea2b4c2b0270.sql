-- Create MUS 240 enrollments table with correct schema matching the existing code
CREATE TABLE IF NOT EXISTS public.mus240_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  semester TEXT NOT NULL DEFAULT 'Fall 2024',
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  enrollment_status TEXT NOT NULL DEFAULT 'enrolled' CHECK (enrollment_status IN ('enrolled', 'withdrawn', 'completed', 'dropped')),
  final_grade TEXT,
  instructor_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure unique enrollment per student per semester
  UNIQUE(student_id, semester)
);

-- Enable RLS
ALTER TABLE public.mus240_enrollments ENABLE ROW LEVEL SECURITY;

-- Create policies for mus240_enrollments
CREATE POLICY "Students can view their own enrollment" 
ON public.mus240_enrollments 
FOR SELECT 
USING (auth.uid() = student_id);

CREATE POLICY "Admins can view all enrollments" 
ON public.mus240_enrollments 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE gw_profiles.user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

CREATE POLICY "Admins can manage all enrollments" 
ON public.mus240_enrollments 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE gw_profiles.user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE gw_profiles.user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

-- Insert sample enrollments for existing journal entries (students who have already submitted journals)
INSERT INTO public.mus240_enrollments (student_id, semester, enrolled_at, enrollment_status)
SELECT DISTINCT 
  student_id,
  'Fall 2024',
  '2024-08-15 00:00:00+00'::timestamp with time zone,
  'enrolled'
FROM public.mus240_journal_entries 
WHERE student_id IS NOT NULL
ON CONFLICT (student_id, semester) DO NOTHING;