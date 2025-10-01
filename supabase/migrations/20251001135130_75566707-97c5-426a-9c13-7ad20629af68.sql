-- Recalculate all midterm grades to use raw scores instead of percentages
-- This fixes grades that were incorrectly stored as 0-100 percentages

-- First, update all existing submissions to use raw scores
UPDATE mus240_midterm_submissions ms
SET grade = (
  SELECT COALESCE(ROUND(SUM(DISTINCT sg.ai_score)), 0)
  FROM mus240_submission_grades sg
  WHERE sg.submission_id = ms.id
    AND sg.ai_score IS NOT NULL
)
WHERE ms.is_submitted = true
  AND ms.grade IS NOT NULL;