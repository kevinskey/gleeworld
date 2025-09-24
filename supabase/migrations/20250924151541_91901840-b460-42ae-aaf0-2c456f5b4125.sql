-- Simple fix: Update journal entry RLS policy for creation
DROP POLICY IF EXISTS "Students can create their own journal entries" ON mus240_journal_entries;
CREATE POLICY "Students can create their own journal entries" 
ON mus240_journal_entries FOR INSERT 
WITH CHECK (
  auth.uid() = student_id AND 
  EXISTS (
    SELECT 1 FROM mus240_enrollments 
    WHERE student_id = auth.uid() 
    AND enrollment_status = 'enrolled' 
    AND semester = 'Fall 2025'
  )
);