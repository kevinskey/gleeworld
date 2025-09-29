-- Fix existing invalid grades (scores higher than 17 points max for journal assignments)
UPDATE mus240_journal_grades 
SET overall_score = 10.0 
WHERE overall_score > 17;

-- Add a check constraint to prevent future invalid grades
ALTER TABLE mus240_journal_grades 
ADD CONSTRAINT check_overall_score_valid 
CHECK (overall_score >= 0 AND overall_score <= 17);