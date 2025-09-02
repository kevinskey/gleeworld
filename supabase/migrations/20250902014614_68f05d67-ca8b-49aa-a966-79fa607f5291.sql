-- Drop existing policies and recreate them properly
DROP POLICY IF EXISTS "Students can view their own journal grades" ON public.mus240_journal_grades;
DROP POLICY IF EXISTS "Instructors can view all journal grades" ON public.mus240_journal_grades;
DROP POLICY IF EXISTS "Instructors can create journal grades" ON public.mus240_journal_grades;
DROP POLICY IF EXISTS "Instructors can update journal grades" ON public.mus240_journal_grades;

-- Enable RLS (if not already enabled)
ALTER TABLE public.mus240_journal_grades ENABLE ROW LEVEL SECURITY;

-- Policy for instructors/admins to view all grades
CREATE POLICY "Instructors can view all journal grades" 
ON public.mus240_journal_grades 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

-- Policy for instructors/admins to insert grades (including service role for edge functions)
CREATE POLICY "System can create journal grades" 
ON public.mus240_journal_grades 
FOR INSERT 
WITH CHECK (true);

-- Policy for instructors/admins to update grades
CREATE POLICY "Instructors can update journal grades" 
ON public.mus240_journal_grades 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

-- Policy for students to view their own grades
CREATE POLICY "Students can view their own journal grades" 
ON public.mus240_journal_grades 
FOR SELECT 
USING (auth.uid() = student_id);