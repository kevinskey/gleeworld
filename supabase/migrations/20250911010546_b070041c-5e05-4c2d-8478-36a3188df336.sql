-- Enable RLS for the mus240_journal_grades table
ALTER TABLE public.mus240_journal_grades ENABLE ROW LEVEL SECURITY;

-- Allow instructors to view all grades
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

-- Allow students to view their own grades
CREATE POLICY "Students can view their own journal grades" 
  ON public.mus240_journal_grades 
  FOR SELECT 
  USING (auth.uid() = student_id);

-- Allow system to insert grades (for the edge function)
CREATE POLICY "System can insert journal grades" 
  ON public.mus240_journal_grades 
  FOR INSERT 
  WITH CHECK (true);

-- Allow instructors to update grades
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