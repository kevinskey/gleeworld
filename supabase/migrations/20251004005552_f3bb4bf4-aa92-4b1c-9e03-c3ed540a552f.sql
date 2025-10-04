-- Make submitted_at nullable to allow exam retakes
ALTER TABLE mus240_midterm_submissions 
ALTER COLUMN submitted_at DROP NOT NULL;