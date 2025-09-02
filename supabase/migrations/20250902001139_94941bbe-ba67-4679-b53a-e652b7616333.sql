-- Add unique constraint to mus240_journal_grades table
-- This will allow the ON CONFLICT clause to work properly
ALTER TABLE public.mus240_journal_grades 
ADD CONSTRAINT mus240_journal_grades_assignment_student_unique 
UNIQUE (assignment_id, student_id);