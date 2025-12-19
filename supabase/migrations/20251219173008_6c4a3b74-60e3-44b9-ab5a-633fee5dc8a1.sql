-- Enroll Allee Bogar in MUS240 for Fall 2025
INSERT INTO mus240_enrollments (student_id, semester, enrollment_status)
VALUES ('ae0fbced-4a8f-4453-86f4-e22d2ca43e6e', '2025_FALL', 'enrolled')
ON CONFLICT (student_id, semester) DO UPDATE SET enrollment_status = 'enrolled';