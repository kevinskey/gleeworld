
-- Add Genesis Harris to MUS 240 Spring 2026
INSERT INTO mus240_enrollments (student_id, semester, enrollment_status)
VALUES ('44a30d6c-eefd-4144-a0b0-b3618ec1b7a5', 'Spring 2026', 'enrolled')
ON CONFLICT (student_id, semester) DO NOTHING;
