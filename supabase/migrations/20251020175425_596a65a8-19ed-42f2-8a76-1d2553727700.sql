-- Fix RLS policy: Students can only view published journals if they're enrolled in MUS240
DROP POLICY IF EXISTS "students_view_published" ON mus240_journal_entries;

CREATE POLICY "students_view_published" 
ON mus240_journal_entries 
FOR SELECT 
USING (
  is_published = true 
  AND EXISTS (
    SELECT 1 FROM mus240_enrollments 
    WHERE student_id = auth.uid() 
    AND enrollment_status = 'enrolled'
  )
);