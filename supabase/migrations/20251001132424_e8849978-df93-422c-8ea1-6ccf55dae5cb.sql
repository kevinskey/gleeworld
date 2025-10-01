-- Function to recalculate missing overall grades for midterm submissions
-- This fixes submissions that have question-level AI grades but no overall grade

CREATE OR REPLACE FUNCTION recalculate_missing_midterm_grades()
RETURNS TABLE (
  submission_id uuid,
  calculated_grade numeric,
  question_count int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH question_scores AS (
    -- Get unique question scores (latest per question_id per submission)
    SELECT DISTINCT ON (sg.submission_id, sg.question_id)
      sg.submission_id,
      sg.question_id,
      COALESCE(sg.ai_score, 0) as score,
      sg.created_at
    FROM mus240_submission_grades sg
    INNER JOIN mus240_midterm_submissions ms ON ms.id = sg.submission_id
    WHERE ms.grade IS NULL  -- Only process submissions without overall grades
      AND ms.is_submitted = true
    ORDER BY sg.submission_id, sg.question_id, sg.created_at DESC
  ),
  submission_totals AS (
    SELECT 
      qs.submission_id,
      SUM(qs.score) as total_score,
      COUNT(DISTINCT qs.question_id) as num_questions
    FROM question_scores qs
    GROUP BY qs.submission_id
  )
  SELECT 
    st.submission_id,
    ROUND(st.total_score)::numeric as calculated_grade,
    st.num_questions::int
  FROM submission_totals st
  WHERE st.num_questions > 0;  -- Only return submissions with at least one graded question
END;
$$;

-- Now run the function and update the submissions
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT * FROM recalculate_missing_midterm_grades()
  LOOP
    UPDATE mus240_midterm_submissions
    SET 
      grade = rec.calculated_grade,
      graded_at = NOW(),
      updated_at = NOW()
    WHERE id = rec.submission_id;
    
    RAISE NOTICE 'Updated submission % with grade % (% questions)', 
      rec.submission_id, rec.calculated_grade, rec.question_count;
  END LOOP;
END;
$$;