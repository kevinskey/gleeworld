-- Fix: assignment_points should be journal points capped at 200
UPDATE mus240_grade_summaries 
SET assignment_points = LEAST(assignment_points - participation_points * 0.22, 200),
    updated_at = NOW()
WHERE semester = 'Fall 2025';

-- Actually, let's recalculate properly from source data
WITH journal_calc AS (
  SELECT 
    student_id,
    LEAST(SUM(COALESCE(instructor_score, overall_score, 0)), 200) as capped_journal_points
  FROM mus240_journal_grades 
  GROUP BY student_id
)
UPDATE mus240_grade_summaries gs
SET assignment_points = COALESCE(jc.capped_journal_points, 0),
    updated_at = NOW()
FROM journal_calc jc
WHERE gs.student_id = jc.student_id
AND gs.semester = 'Fall 2025';