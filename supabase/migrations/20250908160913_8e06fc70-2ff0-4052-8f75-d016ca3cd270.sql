-- Enable RLS and add admin policies for mus240_journal_entries and mus240_journal_comments

-- Add admin/instructor policy for mus240_journal_entries
CREATE POLICY "Instructors can view all journal entries" ON public.mus240_journal_entries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Add admin/instructor policy for mus240_journal_comments
CREATE POLICY "Instructors can view all journal comments" ON public.mus240_journal_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Add student policies
CREATE POLICY "Students can view their own journal entries" ON public.mus240_journal_entries
FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

CREATE POLICY "Students can view journal comments on their entries" ON public.mus240_journal_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.mus240_journal_entries 
    WHERE id = mus240_journal_comments.journal_id 
    AND student_id = auth.uid()
  )
);

CREATE POLICY "Students can view their own comments" ON public.mus240_journal_comments
FOR SELECT
TO authenticated
USING (auth.uid() = commenter_id);