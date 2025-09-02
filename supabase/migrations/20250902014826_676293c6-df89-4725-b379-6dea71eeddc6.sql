-- Simple RLS setup for mus240_journal_grades
ALTER TABLE public.mus240_journal_grades ENABLE ROW LEVEL SECURITY;

-- Allow service role (edge functions) to insert grades
CREATE POLICY "Allow service role to insert grades" 
ON public.mus240_journal_grades 
FOR ALL 
TO service_role
USING (true) 
WITH CHECK (true);

-- Allow authenticated users to view grades they're authorized to see
CREATE POLICY "Users can view authorized journal grades" 
ON public.mus240_journal_grades 
FOR SELECT 
TO authenticated
USING (
  -- Students can see their own grades
  auth.uid() = student_id 
  OR 
  -- Admins can see all grades
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);