-- Complete the journal and poll fixes
-- Update journal update policy to include enrollment check
DROP POLICY IF EXISTS "Students can update their own journal entries" ON mus240_journal_entries;
CREATE POLICY "Students can update their own journal entries" 
ON mus240_journal_entries FOR UPDATE 
USING (
  auth.uid() = student_id AND 
  EXISTS (
    SELECT 1 FROM mus240_enrollments 
    WHERE student_id = auth.uid() 
    AND enrollment_status = 'enrolled' 
    AND semester = 'Fall 2025'
  )
);

-- Fix poll response INSERT policy to include proper enrollment check
DROP POLICY IF EXISTS "Students can submit poll responses" ON mus240_poll_responses;
CREATE POLICY "Students can submit poll responses" 
ON mus240_poll_responses FOR INSERT 
WITH CHECK (
  student_id = (auth.uid())::text AND 
  EXISTS (
    SELECT 1 FROM mus240_enrollments 
    WHERE student_id = auth.uid() 
    AND enrollment_status = 'enrolled' 
    AND semester = 'Fall 2025'
  )
);