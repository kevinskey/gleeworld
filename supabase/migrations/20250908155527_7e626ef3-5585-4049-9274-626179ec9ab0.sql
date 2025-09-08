-- Enable RLS and create policies for mus240_journal_grades table
ALTER TABLE public.mus240_journal_grades ENABLE ROW LEVEL SECURITY;

-- RLS policies for mus240_journal_grades
CREATE POLICY "Students can view their own journal grades"
ON public.mus240_journal_grades
FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Instructors can manage all journal grades"
ON public.mus240_journal_grades
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Enable RLS and create policies for mus240_journal_comments table
ALTER TABLE public.mus240_journal_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for mus240_journal_comments
CREATE POLICY "Users can view comments on published journals"
ON public.mus240_journal_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.mus240_journal_entries 
    WHERE id = journal_entry_id 
    AND is_published = true
  )
);

CREATE POLICY "Users can create comments on published journals"
ON public.mus240_journal_comments
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.mus240_journal_entries 
    WHERE id = journal_entry_id 
    AND is_published = true
  )
);

CREATE POLICY "Users can update their own comments"
ON public.mus240_journal_comments
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all journal comments"
ON public.mus240_journal_comments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);