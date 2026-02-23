-- Enroll Raven's second account (ravenherring@spelman.edu) in MUS-240
-- She has two accounts due to email normalization (raven.herring vs ravenherring)
-- Her submission exists under this account but enrollment was only under the other
INSERT INTO gw_course_enrollments (course_id, user_id, enrollment_status, semester, role)
VALUES ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', '2049a012-8493-48a8-8cf7-da6509a47f6d', 'enrolled', 'Spring 2026', 'student')
ON CONFLICT DO NOTHING;