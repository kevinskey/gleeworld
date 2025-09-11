-- Check if mus240_journal_grades table exists and create it if needed
CREATE TABLE IF NOT EXISTS public.mus240_journal_grades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  assignment_id TEXT NOT NULL,
  journal_id UUID,
  overall_score INTEGER NOT NULL,
  feedback TEXT,
  rubric JSONB,
  ai_model TEXT,
  graded_by TEXT,
  graded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mus240_journal_grades ENABLE ROW LEVEL SECURITY;

-- Create policies for instructors and admins
CREATE POLICY "Instructors and admins can view all grades" 
ON public.mus240_journal_grades 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Instructors and admins can insert grades" 
ON public.mus240_journal_grades 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Students can view their own grades" 
ON public.mus240_journal_grades 
FOR SELECT 
USING (auth.uid() = student_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_mus240_journal_grades_student_assignment 
ON public.mus240_journal_grades (student_id, assignment_id);