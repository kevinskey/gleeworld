-- Add Genesis Harris as TA for MUS240 grading system
INSERT INTO course_teaching_assistants (user_id, course_code, is_active, notes)
VALUES ('44a30d6c-eefd-4144-a0b0-b3618ec1b7a5', 'MUS240', true, 'Teaching Assistant for MUS240 grading system')
ON CONFLICT (user_id, course_code) DO UPDATE SET is_active = true, notes = 'Teaching Assistant for MUS240 grading system';