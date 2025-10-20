-- Allow students to edit journals after submission
DROP POLICY IF EXISTS "students_update_own_entries" ON mus240_journal_entries;

CREATE POLICY "students_update_own_entries" 
ON mus240_journal_entries 
FOR UPDATE 
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);

-- Note: Removed the is_published = false restriction so students can edit after publishing