-- Copy all questions from the source Final Exam to MUS 240 Final Exam - Fall 2025
-- Source test: 5efe7df8-6eb6-4611-b2d6-61ddf0319c7e (has 28 questions)
-- Target test: 371c8668-8667-4c7f-af65-81ac006cfa3a (MUS 240 Final Exam - Fall 2025)

-- First, create a temporary mapping table to track old question IDs to new question IDs
CREATE TEMP TABLE question_id_mapping (
  old_id UUID,
  new_id UUID
);

-- Insert questions from source to target with new UUIDs
INSERT INTO test_questions (
  id,
  test_id,
  question_text,
  question_type,
  points,
  display_order,
  required,
  media_type,
  media_url,
  media_title,
  youtube_video_id,
  start_time,
  end_time,
  created_at
)
SELECT 
  gen_random_uuid() as id,
  '371c8668-8667-4c7f-af65-81ac006cfa3a' as test_id,
  question_text,
  question_type,
  points,
  display_order,
  required,
  media_type,
  media_url,
  media_title,
  youtube_video_id,
  start_time,
  end_time,
  NOW() as created_at
FROM test_questions 
WHERE test_id = '5efe7df8-6eb6-4611-b2d6-61ddf0319c7e'
ORDER BY display_order;

-- Create mapping between old and new question IDs (matching by question_text and display_order)
INSERT INTO question_id_mapping (old_id, new_id)
SELECT 
  old_q.id as old_id,
  new_q.id as new_id
FROM test_questions old_q
JOIN test_questions new_q 
  ON old_q.question_text = new_q.question_text 
  AND old_q.display_order = new_q.display_order
WHERE old_q.test_id = '5efe7df8-6eb6-4611-b2d6-61ddf0319c7e'
  AND new_q.test_id = '371c8668-8667-4c7f-af65-81ac006cfa3a';

-- Copy answer options using the mapping
INSERT INTO test_answer_options (
  id,
  question_id,
  option_text,
  is_correct,
  display_order,
  created_at
)
SELECT 
  gen_random_uuid() as id,
  m.new_id as question_id,
  tao.option_text,
  tao.is_correct,
  tao.display_order,
  NOW() as created_at
FROM test_answer_options tao
JOIN question_id_mapping m ON tao.question_id = m.old_id;

-- Update the total points on the target test to match the sum of question points
UPDATE glee_academy_tests 
SET total_points = (
  SELECT COALESCE(SUM(points), 0) 
  FROM test_questions 
  WHERE test_id = '371c8668-8667-4c7f-af65-81ac006cfa3a'
),
updated_at = NOW()
WHERE id = '371c8668-8667-4c7f-af65-81ac006cfa3a';

-- Drop temp table
DROP TABLE question_id_mapping;