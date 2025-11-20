-- Drop the old check constraint that limits scores to 17 points
ALTER TABLE mus240_journal_grades 
DROP CONSTRAINT IF EXISTS check_overall_score_valid;

-- Add new check constraint allowing up to 20 points for journal assignments
ALTER TABLE mus240_journal_grades 
ADD CONSTRAINT check_overall_score_valid 
CHECK (overall_score >= 0 AND overall_score <= 20);