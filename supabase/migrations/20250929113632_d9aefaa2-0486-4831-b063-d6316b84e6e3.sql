-- Fix letter_grade column by removing the generated expression and making it a regular column
ALTER TABLE public.mus240_journal_grades 
ALTER COLUMN letter_grade DROP EXPRESSION;

-- Make the column nullable to allow inserts
ALTER TABLE public.mus240_journal_grades 
ALTER COLUMN letter_grade DROP NOT NULL;

-- Set a default value for existing rows if needed
UPDATE public.mus240_journal_grades 
SET letter_grade = 'F' 
WHERE letter_grade IS NULL;