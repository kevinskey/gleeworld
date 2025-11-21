-- Add only the missing RLS policies for MUS240 student dashboard

-- Journal entries policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'mus240_journal_entries' 
    AND policyname = 'Students can view their own journal entries'
  ) THEN
    CREATE POLICY "Students can view their own journal entries"
    ON mus240_journal_entries
    FOR SELECT
    TO authenticated
    USING (student_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'mus240_journal_entries' 
    AND policyname = 'Students can create their own journal entries'
  ) THEN
    CREATE POLICY "Students can create their own journal entries"
    ON mus240_journal_entries
    FOR INSERT
    TO authenticated
    WITH CHECK (student_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'mus240_journal_entries' 
    AND policyname = 'Students can update their own journal entries'
  ) THEN
    CREATE POLICY "Students can update their own journal entries"
    ON mus240_journal_entries
    FOR UPDATE
    TO authenticated
    USING (student_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'mus240_journal_entries' 
    AND policyname = 'Admins and TAs can view all journal entries'
  ) THEN
    CREATE POLICY "Admins and TAs can view all journal entries"
    ON mus240_journal_entries
    FOR SELECT
    TO authenticated
    USING (is_admin_user(auth.uid()) OR is_course_ta(auth.uid(), 'mus240'));
  END IF;

  -- Journal comments policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'mus240_journal_comments' 
    AND policyname = 'Students can view comments on their journal entries'
  ) THEN
    CREATE POLICY "Students can view comments on their journal entries"
    ON mus240_journal_comments
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM mus240_journal_entries
        WHERE mus240_journal_entries.id = mus240_journal_comments.journal_id
        AND mus240_journal_entries.student_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'mus240_journal_comments' 
    AND policyname = 'Admins and TAs can manage all journal comments'
  ) THEN
    CREATE POLICY "Admins and TAs can manage all journal comments"
    ON mus240_journal_comments
    FOR ALL
    TO authenticated
    USING (is_admin_user(auth.uid()) OR is_course_ta(auth.uid(), 'mus240'));
  END IF;

  -- Participation grades policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'mus240_participation_grades' 
    AND policyname = 'Students can view their own participation grades'
  ) THEN
    CREATE POLICY "Students can view their own participation grades"
    ON mus240_participation_grades
    FOR SELECT
    TO authenticated
    USING (student_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'mus240_participation_grades' 
    AND policyname = 'Admins and TAs can manage all participation grades'
  ) THEN
    CREATE POLICY "Admins and TAs can manage all participation grades"
    ON mus240_participation_grades
    FOR ALL
    TO authenticated
    USING (is_admin_user(auth.uid()) OR is_course_ta(auth.uid(), 'mus240'));
  END IF;
END $$;