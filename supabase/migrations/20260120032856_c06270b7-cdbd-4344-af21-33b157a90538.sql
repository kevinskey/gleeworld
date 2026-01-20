-- Delete answer options for the two MUS 240 tests
DELETE FROM test_answer_options 
WHERE question_id IN (
  SELECT id FROM test_questions 
  WHERE test_id IN ('5efe7df8-6eb6-4611-b2d6-61ddf0319c7e', '49ef07f7-0bdf-4a42-80ee-06006e2f5107')
);

-- Delete questions for the two MUS 240 tests
DELETE FROM test_questions 
WHERE test_id IN ('5efe7df8-6eb6-4611-b2d6-61ddf0319c7e', '49ef07f7-0bdf-4a42-80ee-06006e2f5107');

-- Delete the two MUS 240 tests
DELETE FROM glee_academy_tests 
WHERE id IN ('5efe7df8-6eb6-4611-b2d6-61ddf0319c7e', '49ef07f7-0bdf-4a42-80ee-06006e2f5107');