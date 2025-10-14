-- Add DELETE policy for students to delete their own unpublished journal entries
CREATE POLICY "students_delete_own_entries"
ON public.mus240_journal_entries
FOR DELETE
TO public
USING (
  auth.uid() = student_id 
  AND is_published = false
);