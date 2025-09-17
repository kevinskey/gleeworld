-- Fix the student_id column to accept text instead of UUID for poll responses
-- This will allow both student names and UUIDs to be stored

ALTER TABLE mus240_poll_responses ALTER COLUMN student_id TYPE text;

-- Add a comment to explain the column can store UUIDs for authenticated users or text for anonymous users
COMMENT ON COLUMN mus240_poll_responses.student_id IS 'Can store UUID for authenticated users or text identifier for anonymous users';