-- RLS policies for journal entries
CREATE POLICY "Students can create their own journal entries" 
ON public.mus240_journal_entries 
FOR INSERT 
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own journal entries" 
ON public.mus240_journal_entries 
FOR UPDATE 
USING (auth.uid() = student_id);

CREATE POLICY "Students can view published journal entries" 
ON public.mus240_journal_entries 
FOR SELECT 
USING (is_published = true OR auth.uid() = student_id);

CREATE POLICY "Admins can manage all journal entries" 
ON public.mus240_journal_entries 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

-- RLS policies for journal comments
CREATE POLICY "Students can create comments on published journals" 
ON public.mus240_journal_comments 
FOR INSERT 
WITH CHECK (
  auth.uid() = commenter_id AND
  EXISTS (
    SELECT 1 FROM public.mus240_journal_entries 
    WHERE id = journal_id AND is_published = true
  )
);

CREATE POLICY "Students can update their own comments" 
ON public.mus240_journal_comments 
FOR UPDATE 
USING (auth.uid() = commenter_id);

CREATE POLICY "Students can view comments on published journals" 
ON public.mus240_journal_comments 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.mus240_journal_entries 
  WHERE id = journal_id AND is_published = true
));

CREATE POLICY "Admins can manage all comments" 
ON public.mus240_journal_comments 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

-- RLS policies for reading requirements
CREATE POLICY "Students can view their own reading requirements" 
ON public.mus240_reading_requirements 
FOR SELECT 
USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own reading requirements" 
ON public.mus240_reading_requirements 
FOR INSERT 
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own reading requirements" 
ON public.mus240_reading_requirements 
FOR UPDATE 
USING (auth.uid() = student_id);

CREATE POLICY "Admins can manage all reading requirements" 
ON public.mus240_reading_requirements 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

-- RLS policies for journal reads
CREATE POLICY "Students can track their own reads" 
ON public.mus240_journal_reads 
FOR INSERT 
WITH CHECK (auth.uid() = reader_id);

CREATE POLICY "Students can view their own reads" 
ON public.mus240_journal_reads 
FOR SELECT 
USING (auth.uid() = reader_id);

CREATE POLICY "Admins can manage all reads" 
ON public.mus240_journal_reads 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));