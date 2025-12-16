-- Award full points on essay question (20 points) for all submissions
UPDATE test_answers
SET points_earned = 20,
    is_correct = true,
    feedback = 'Full credit awarded',
    graded_at = now()
WHERE question_id = '85a19259-e286-4027-b811-0f52d0d64bee';

-- Award full points on short answer question (5 points) for all submissions
UPDATE test_answers
SET points_earned = 5,
    is_correct = true,
    feedback = 'Full credit awarded',
    graded_at = now()
WHERE question_id = '8b6348b3-73a6-4244-b26d-3753ac7917fe';

-- Update total_score on test_submissions by adding 25 points
UPDATE test_submissions
SET total_score = total_score + 25,
    updated_at = now()
WHERE test_id = '5efe7df8-6eb6-4611-b2d6-61ddf0319c7e';