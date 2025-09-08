-- Fix the student_id column type mismatch in mus240_poll_responses
ALTER TABLE mus240_poll_responses 
ALTER COLUMN student_id TYPE uuid USING student_id::uuid;