-- Enable RLS and create policies for mus240_journal_grades table
ALTER TABLE public.mus240_journal_grades ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Students can view their own journal grades" ON public.mus240_journal_grades;
DROP POLICY IF EXISTS "Instructors can view all journal grades" ON public.mus240_journal_grades;
DROP POLICY IF EXISTS "Instructors can insert journal grades" ON public.mus240_journal_grades;
DROP POLICY IF EXISTS "Instructors can update journal grades" ON public.mus240_journal_grades;

-- Instructors can view all grades
CREATE POLICY "Instructors can view all journal grades" 
  ON public.mus240_journal_grades 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Students can view their own grades
CREATE POLICY "Students can view their own journal grades" 
  ON public.mus240_journal_grades 
  FOR SELECT 
  USING (auth.uid() = student_id);

-- Only admins/instructors can insert grades
CREATE POLICY "Instructors can insert journal grades" 
  ON public.mus240_journal_grades 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Only admins/instructors can update grades
CREATE POLICY "Instructors can update journal grades" 
  ON public.mus240_journal_grades 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );