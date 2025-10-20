-- Fix RLS: Students see only their own journals, TAs see all journals
DROP POLICY IF EXISTS "students_view_published" ON mus240_journal_entries;

-- TAs and course staff can view all journals
CREATE POLICY "tas_view_all_journals" 
ON mus240_journal_entries 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM course_teaching_assistants 
    WHERE user_id = auth.uid() 
    AND course_code = 'MUS240'
    AND is_active = true
  )
);