-- Add start_date and end_date columns to gw_course_modules for date-based module lookups
ALTER TABLE gw_course_modules ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE gw_course_modules ADD COLUMN IF NOT EXISTS end_date DATE;

-- Update gw_course_modules with correct MUS-240 titles
UPDATE gw_course_modules SET title = 'Week 1: Introduction to African American Music', updated_at = now() WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND week_number = 1;
UPDATE gw_course_modules SET title = 'Week 2: Spirituals and the Enslaved Experience', updated_at = now() WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND week_number = 2;
UPDATE gw_course_modules SET title = 'Week 3: Blues: From Delta to Urban', updated_at = now() WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND week_number = 3;
UPDATE gw_course_modules SET title = 'Week 4: Ragtime and Birth of Jazz', updated_at = now() WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND week_number = 4;
UPDATE gw_course_modules SET title = 'Week 5: Jubilee Quartet, Swing and WWII', updated_at = now() WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND week_number = 5;
UPDATE gw_course_modules SET title = 'Week 6: Jazz Continued and the Birth of Gospel', updated_at = now() WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND week_number = 6;
UPDATE gw_course_modules SET title = 'Week 7: Civil Rights Music, Funk and Midterm Exam', updated_at = now() WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND week_number = 7;
UPDATE gw_course_modules SET title = 'Week 8: Gospel Music Project: The State of Gospel (Part 1)', updated_at = now() WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND week_number = 8;
UPDATE gw_course_modules SET title = 'Week 9: Gospel Music Project: The State of Gospel (Part 2)', updated_at = now() WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND week_number = 9;
UPDATE gw_course_modules SET title = 'Week 10: Disco and Detroit Techno', updated_at = now() WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND week_number = 10;
UPDATE gw_course_modules SET title = 'Week 11: R&B and Soul', updated_at = now() WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND week_number = 11;
UPDATE gw_course_modules SET title = 'Week 12: Hip-Hop (Part 1)', updated_at = now() WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND week_number = 12;
UPDATE gw_course_modules SET title = 'Week 13: Hip-Hop (Part 2)', updated_at = now() WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND week_number = 13;
UPDATE gw_course_modules SET title = 'Week 14: Fourth Turning Music', updated_at = now() WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND week_number = 14;
UPDATE gw_course_modules SET title = 'Week 15: Finals Review', updated_at = now() WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND week_number = 15;
UPDATE gw_course_modules SET title = 'Week 16: Final Exam (Monday 8am)', updated_at = now() WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND week_number = 16;

-- Set dates for MUS-240 modules
UPDATE gw_course_modules SET start_date = '2026-01-14', end_date = '2026-01-23' WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND week_number = 1;
UPDATE gw_course_modules SET start_date = '2026-01-26', end_date = '2026-01-30' WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND week_number = 2;
UPDATE gw_course_modules SET start_date = '2026-02-02', end_date = '2026-02-06' WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND week_number = 3;
UPDATE gw_course_modules SET start_date = '2026-02-09', end_date = '2026-02-14' WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND week_number = 4;
UPDATE gw_course_modules SET start_date = '2026-02-16', end_date = '2026-02-20' WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND week_number = 5;
UPDATE gw_course_modules SET start_date = '2026-02-23', end_date = '2026-02-27' WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND week_number = 6;
UPDATE gw_course_modules SET start_date = '2026-03-02', end_date = '2026-03-06' WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND week_number = 7;
UPDATE gw_course_modules SET start_date = '2026-03-16', end_date = '2026-03-20' WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND week_number = 8;
UPDATE gw_course_modules SET start_date = '2026-03-23', end_date = '2026-03-27' WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND week_number = 9;
UPDATE gw_course_modules SET start_date = '2026-03-30', end_date = '2026-04-03' WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND week_number = 10;
UPDATE gw_course_modules SET start_date = '2026-04-06', end_date = '2026-04-10' WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND week_number = 11;
UPDATE gw_course_modules SET start_date = '2026-04-13', end_date = '2026-04-17' WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND week_number = 12;
UPDATE gw_course_modules SET start_date = '2026-04-20', end_date = '2026-04-24' WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND week_number = 13;
UPDATE gw_course_modules SET start_date = '2026-04-27', end_date = '2026-05-01' WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND week_number = 14;
UPDATE gw_course_modules SET start_date = '2026-05-04', end_date = '2026-05-08' WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND week_number = 15;
UPDATE gw_course_modules SET start_date = '2026-05-11', end_date = '2026-05-11' WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND week_number = 16;