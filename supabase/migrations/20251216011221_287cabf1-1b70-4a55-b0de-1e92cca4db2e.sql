-- Calculate and update MUS240 final grades using weights:
-- Journals: 33.33%, Final: 25%, Group: 16.67%, Midterm: 16.67%, Polls: 8.33%

-- First, let's create a temp calculation and update the grade_summaries table
WITH grade_calc AS (
  SELECT 
    p.user_id,
    p.full_name,
    -- Individual component percentages
    ROUND((LEAST(COALESCE(j.total_journal_points, 0), 200) / 200.0) * 33.33, 2) as journal_pct,
    ROUND((COALESCE(f.final_exam_score, 0) / 100.0) * 25.0, 2) as final_pct,
    ROUND((COALESCE(m.midterm_grade, 0) / 100.0) * 16.67, 2) as midterm_pct,
    ROUND((COALESCE(polls.polls_answered, 0)::numeric / 11.0) * 8.33, 2) as polls_pct,
    CASE WHEN grp.member_id IS NOT NULL THEN 16.67 ELSE 0 END as group_pct,
    -- Raw scores for reference
    COALESCE(j.total_journal_points, 0) as journal_points,
    COALESCE(f.final_exam_score, 0) as final_score,
    COALESCE(m.midterm_grade, 0) as midterm_score,
    COALESCE(polls.polls_answered, 0) as polls_answered,
    CASE WHEN grp.member_id IS NOT NULL THEN 1 ELSE 0 END as in_group
  FROM gw_profiles p
  INNER JOIN (
    SELECT DISTINCT student_id as user_id FROM mus240_journal_grades
    UNION SELECT DISTINCT user_id FROM mus240_midterm_submissions WHERE is_submitted = true
    UNION SELECT DISTINCT student_id FROM test_submissions WHERE test_id = '5efe7df8-6eb6-4611-b2d6-61ddf0319c7e'
  ) enrolled ON enrolled.user_id = p.user_id
  LEFT JOIN (
    SELECT student_id, SUM(COALESCE(instructor_score, overall_score, 0)) as total_journal_points
    FROM mus240_journal_grades GROUP BY student_id
  ) j ON j.student_id = p.user_id
  LEFT JOIN (
    SELECT user_id, grade as midterm_grade FROM mus240_midterm_submissions WHERE is_submitted = true
  ) m ON m.user_id = p.user_id
  LEFT JOIN (
    SELECT student_id, total_score as final_exam_score FROM test_submissions WHERE test_id = '5efe7df8-6eb6-4611-b2d6-61ddf0319c7e'
  ) f ON f.student_id = p.user_id
  LEFT JOIN (
    SELECT student_id::uuid, COUNT(DISTINCT poll_id) as polls_answered FROM mus240_poll_responses GROUP BY student_id
  ) polls ON polls.student_id = p.user_id
  LEFT JOIN (
    SELECT DISTINCT member_id FROM mus240_group_memberships
  ) grp ON grp.member_id = p.user_id
),
final_grades AS (
  SELECT 
    user_id,
    full_name,
    journal_pct,
    final_pct,
    midterm_pct,
    polls_pct,
    group_pct,
    journal_points,
    final_score,
    midterm_score,
    polls_answered,
    in_group,
    ROUND(journal_pct + final_pct + midterm_pct + polls_pct + group_pct, 2) as total_percentage,
    CASE 
      WHEN ROUND(journal_pct + final_pct + midterm_pct + polls_pct + group_pct, 2) >= 95 THEN 'A'
      WHEN ROUND(journal_pct + final_pct + midterm_pct + polls_pct + group_pct, 2) >= 90 THEN 'A-'
      WHEN ROUND(journal_pct + final_pct + midterm_pct + polls_pct + group_pct, 2) >= 87 THEN 'B+'
      WHEN ROUND(journal_pct + final_pct + midterm_pct + polls_pct + group_pct, 2) >= 83 THEN 'B'
      WHEN ROUND(journal_pct + final_pct + midterm_pct + polls_pct + group_pct, 2) >= 80 THEN 'B-'
      WHEN ROUND(journal_pct + final_pct + midterm_pct + polls_pct + group_pct, 2) >= 77 THEN 'C+'
      WHEN ROUND(journal_pct + final_pct + midterm_pct + polls_pct + group_pct, 2) >= 73 THEN 'C'
      WHEN ROUND(journal_pct + final_pct + midterm_pct + polls_pct + group_pct, 2) >= 70 THEN 'C-'
      WHEN ROUND(journal_pct + final_pct + midterm_pct + polls_pct + group_pct, 2) >= 65 THEN 'D+'
      WHEN ROUND(journal_pct + final_pct + midterm_pct + polls_pct + group_pct, 2) >= 60 THEN 'D'
      ELSE 'F'
    END as letter_grade
  FROM grade_calc
)
-- Update existing records or insert new ones
INSERT INTO mus240_grade_summaries (
  student_id, 
  semester,
  overall_percentage,
  letter_grade,
  assignment_points,
  participation_points,
  calculated_at,
  updated_at
)
SELECT 
  user_id,
  'Fall 2025',
  total_percentage,
  letter_grade,
  journal_points + final_score + midterm_score, -- combined points
  polls_answered * 4.545, -- polls as participation points (50 pts / 11 polls)
  NOW(),
  NOW()
FROM final_grades
ON CONFLICT (student_id, semester) 
DO UPDATE SET
  overall_percentage = EXCLUDED.overall_percentage,
  letter_grade = EXCLUDED.letter_grade,
  assignment_points = EXCLUDED.assignment_points,
  participation_points = EXCLUDED.participation_points,
  calculated_at = NOW(),
  updated_at = NOW();