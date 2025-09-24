-- Add additional policies to allow students to save journal entries more flexibly
-- This ensures students can both INSERT and UPDATE their own entries

-- Add a more permissive policy for viewing own entries
DROP POLICY IF EXISTS "Students can view their own journal entries" ON public.mus240_journal_entries;
CREATE POLICY "Students can view their own journal entries" 
ON public.mus240_journal_entries 
FOR SELECT 
USING (auth.uid() = student_id OR is_published = true);

-- Ensure UPDATE policy exists for students to edit their drafts
DROP POLICY IF EXISTS "Students can update their own draft entries" ON public.mus240_journal_entries;
CREATE POLICY "Students can update their own draft entries" 
ON public.mus240_journal_entries 
FOR UPDATE 
USING (auth.uid() = student_id AND is_published = false)
WITH CHECK (auth.uid() = student_id);

-- Add an instructor/admin policy for viewing all entries
DROP POLICY IF EXISTS "Instructors can view all journal entries" ON public.mus240_journal_entries;
CREATE POLICY "Instructors can view all journal entries" 
ON public.mus240_journal_entries 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);