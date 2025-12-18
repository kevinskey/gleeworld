-- Delete the duplicate "MUS 240 Final Exam - Fall 2025" test and its associated questions/options
-- First delete answer options for questions belonging to this test
DELETE FROM test_answer_options 
WHERE question_id IN (
  SELECT id FROM test_questions 
  WHERE test_id = '371c8668-8667-4c7f-af65-81ac006cfa3a'
);

-- Then delete the questions
DELETE FROM test_questions 
WHERE test_id = '371c8668-8667-4c7f-af65-81ac006cfa3a';

-- Finally delete the test itself
DELETE FROM glee_academy_tests 
WHERE id = '371c8668-8667-4c7f-af65-81ac006cfa3a';