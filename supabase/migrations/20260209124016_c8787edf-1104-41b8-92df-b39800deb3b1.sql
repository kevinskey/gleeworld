-- Recalculate passed status for existing Listening Quiz One submissions
-- The test has passing_score=70 (percentage) and actual total points from questions = 26
WITH question_totals AS (
  SELECT test_id, SUM(points) as actual_total
  FROM test_questions
  WHERE test_id = '760db1e7-c57d-44f9-a6dd-c955e300e601'
  GROUP BY test_id
)
UPDATE test_submissions ts
SET passed = ((ts.total_score::numeric / qt.actual_total) * 100) >= 70
FROM question_totals qt
WHERE ts.test_id = qt.test_id
  AND ts.test_id = '760db1e7-c57d-44f9-a6dd-c955e300e601';

-- Also fix the total_points on the test itself to match actual question points
UPDATE glee_academy_tests
SET total_points = (
  SELECT COALESCE(SUM(points), 0) FROM test_questions WHERE test_id = '760db1e7-c57d-44f9-a6dd-c955e300e601'
)
WHERE id = '760db1e7-c57d-44f9-a6dd-c955e300e601';