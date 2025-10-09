-- Enable RLS on mus240_journal_entries if not already enabled
ALTER TABLE public.mus240_journal_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to recreate them correctly)
DROP POLICY IF EXISTS "Students can view their own journal entries" ON public.mus240_journal_entries;
DROP POLICY IF EXISTS "Students can insert their own journal entries" ON public.mus240_journal_entries;
DROP POLICY IF EXISTS "Students can update their own unpublished entries" ON public.mus240_journal_entries;
DROP POLICY IF EXISTS "Students can view published entries" ON public.mus240_journal_entries;
DROP POLICY IF EXISTS "Admins can view all journal entries" ON public.mus240_journal_entries;
DROP POLICY IF EXISTS "Admins can manage all journal entries" ON public.mus240_journal_entries;

-- Students can view their own entries
CREATE POLICY "Students can view their own journal entries"
  ON public.mus240_journal_entries
  FOR SELECT
  USING (auth.uid() = student_id);

-- Students can insert their own entries
CREATE POLICY "Students can insert their own journal entries"
  ON public.mus240_journal_entries
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Students can update their own entries
CREATE POLICY "Students can update their own entries"
  ON public.mus240_journal_entries
  FOR UPDATE
  USING (auth.uid() = student_id);

-- Students can view published entries from others
CREATE POLICY "Students can view published entries"
  ON public.mus240_journal_entries
  FOR SELECT
  USING (is_published = true);

-- Admins can view all entries
CREATE POLICY "Admins can view all journal entries"
  ON public.mus240_journal_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE user_id = auth.uid()
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Admins can manage all entries
CREATE POLICY "Admins can manage all journal entries"
  ON public.mus240_journal_entries
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE user_id = auth.uid()
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Enable RLS on mus240_journal_comments
ALTER TABLE public.mus240_journal_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing comment policies
DROP POLICY IF EXISTS "Students can view comments on published journals" ON public.mus240_journal_comments;
DROP POLICY IF EXISTS "Students can insert comments on published journals" ON public.mus240_journal_comments;
DROP POLICY IF EXISTS "Admins can manage all comments" ON public.mus240_journal_comments;

-- Students can view comments on published journals
CREATE POLICY "Students can view comments on published journals"
  ON public.mus240_journal_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.mus240_journal_entries
      WHERE id = mus240_journal_comments.journal_id
      AND is_published = true
    )
  );

-- Students can insert comments on published journals
CREATE POLICY "Students can insert comments on published journals"
  ON public.mus240_journal_comments
  FOR INSERT
  WITH CHECK (
    auth.uid() = commenter_id
    AND EXISTS (
      SELECT 1 FROM public.mus240_journal_entries
      WHERE id = journal_id
      AND is_published = true
    )
  );

-- Admins can manage all comments
CREATE POLICY "Admins can manage all comments"
  ON public.mus240_journal_comments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE user_id = auth.uid()
      AND (is_admin = true OR is_super_admin = true)
    )
  );