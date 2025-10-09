-- Drop ALL existing policies on mus240_journal_entries
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'mus240_journal_entries' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.mus240_journal_entries', r.policyname);
    END LOOP;
END$$;

-- Drop ALL existing policies on mus240_journal_comments
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'mus240_journal_comments' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.mus240_journal_comments', r.policyname);
    END LOOP;
END$$;

-- Enable RLS on both tables
ALTER TABLE public.mus240_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mus240_journal_comments ENABLE ROW LEVEL SECURITY;

-- Create fresh policies for mus240_journal_entries

-- Students can view their own entries
CREATE POLICY "students_view_own_entries"
  ON public.mus240_journal_entries
  FOR SELECT
  USING (auth.uid() = student_id);

-- Students can insert their own entries
CREATE POLICY "students_insert_own_entries"
  ON public.mus240_journal_entries
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Students can update their own entries
CREATE POLICY "students_update_own_entries"
  ON public.mus240_journal_entries
  FOR UPDATE
  USING (auth.uid() = student_id);

-- Students can view published entries from others
CREATE POLICY "students_view_published"
  ON public.mus240_journal_entries
  FOR SELECT
  USING (is_published = true);

-- Admins can do everything
CREATE POLICY "admins_all_access_entries"
  ON public.mus240_journal_entries
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE user_id = auth.uid()
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Create fresh policies for mus240_journal_comments

-- Students can view comments on published journals
CREATE POLICY "students_view_comments"
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
CREATE POLICY "students_insert_comments"
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

-- Admins can do everything with comments
CREATE POLICY "admins_all_access_comments"
  ON public.mus240_journal_comments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE user_id = auth.uid()
      AND (is_admin = true OR is_super_admin = true)
    )
  );