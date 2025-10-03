-- Add unique constraint on journal_id for mus240_journal_grades table
-- This is needed for the upsert operation in the grade-journal-ai edge function
ALTER TABLE mus240_journal_grades 
ADD CONSTRAINT mus240_journal_grades_journal_id_key UNIQUE (journal_id);