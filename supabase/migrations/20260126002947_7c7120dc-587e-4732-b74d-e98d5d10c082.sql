-- Update all MUS-240 module settings with new titles and dates

-- Week 1: Introduction to African American Music (Jan 14-23)
UPDATE mus240_module_settings 
SET title = 'Introduction to African American Music', 
    start_date = '2026-01-14', 
    end_date = '2026-01-23',
    updated_at = now()
WHERE module_id = 'week-1';

-- Week 2: Spirituals and the Enslaved Experience (Jan 26-30)
UPDATE mus240_module_settings 
SET title = 'Spirituals and the Enslaved Experience', 
    start_date = '2026-01-26', 
    end_date = '2026-01-30',
    updated_at = now()
WHERE module_id = 'week-2';

-- Week 3: Blues: From Delta to Urban (Feb 2-6)
UPDATE mus240_module_settings 
SET title = 'Blues: From Delta to Urban', 
    start_date = '2026-02-02', 
    end_date = '2026-02-06',
    updated_at = now()
WHERE module_id = 'week-3';

-- Week 4: Ragtime and Birth of Jazz (Feb 9-14)
UPDATE mus240_module_settings 
SET title = 'Ragtime and Birth of Jazz', 
    start_date = '2026-02-09', 
    end_date = '2026-02-14',
    updated_at = now()
WHERE module_id = 'week-4';

-- Week 5: Jubilee Quartet, Swing and WWII (Feb 16-20)
UPDATE mus240_module_settings 
SET title = 'Jubilee Quartet, Swing and WWII', 
    start_date = '2026-02-16', 
    end_date = '2026-02-20',
    updated_at = now()
WHERE module_id = 'week-5';

-- Week 6: Jazz Continued and the Birth of Gospel (Feb 23-27)
UPDATE mus240_module_settings 
SET title = 'Jazz Continued and the Birth of Gospel', 
    start_date = '2026-02-23', 
    end_date = '2026-02-27',
    updated_at = now()
WHERE module_id = 'week-6';

-- Week 7: Civil Rights Music, Funk and Midterm Exam (Mar 2-6)
UPDATE mus240_module_settings 
SET title = 'Civil Rights Music, Funk and Midterm Exam', 
    start_date = '2026-03-02', 
    end_date = '2026-03-06',
    updated_at = now()
WHERE module_id = 'week-7';

-- SPRING BREAK: Mar 7-15

-- Week 8: Gospel Music Project Part 1 (Mar 16-20)
UPDATE mus240_module_settings 
SET title = 'Gospel Music Project: The State of Gospel (Part 1)', 
    start_date = '2026-03-16', 
    end_date = '2026-03-20',
    updated_at = now()
WHERE module_id = 'week-8';

-- Week 9: Gospel Music Project Part 2 (Mar 23-27)
UPDATE mus240_module_settings 
SET title = 'Gospel Music Project: The State of Gospel (Part 2)', 
    start_date = '2026-03-23', 
    end_date = '2026-03-27',
    updated_at = now()
WHERE module_id = 'week-9';

-- Week 10: Disco and Detroit Techno (Mar 30 - Apr 3)
UPDATE mus240_module_settings 
SET title = 'Disco and Detroit Techno', 
    start_date = '2026-03-30', 
    end_date = '2026-04-03',
    updated_at = now()
WHERE module_id = 'week-10';

-- Week 11: R&B and Soul (Apr 6-10)
UPDATE mus240_module_settings 
SET title = 'R&B and Soul', 
    start_date = '2026-04-06', 
    end_date = '2026-04-10',
    updated_at = now()
WHERE module_id = 'week-11';

-- Week 12: Hip-Hop Part 1 (Apr 13-17)
UPDATE mus240_module_settings 
SET title = 'Hip-Hop (Part 1)', 
    start_date = '2026-04-13', 
    end_date = '2026-04-17',
    updated_at = now()
WHERE module_id = 'week-12';

-- Week 13: Hip-Hop Part 2 (Apr 20-24)
UPDATE mus240_module_settings 
SET title = 'Hip-Hop (Part 2)', 
    start_date = '2026-04-20', 
    end_date = '2026-04-24',
    updated_at = now()
WHERE module_id = 'week-13';

-- Week 14: Fourth Turning Music (Apr 27 - May 1)
UPDATE mus240_module_settings 
SET title = 'Fourth Turning Music', 
    start_date = '2026-04-27', 
    end_date = '2026-05-01',
    updated_at = now()
WHERE module_id = 'week-14';

-- Week 15: Finals Review (May 4-8)
UPDATE mus240_module_settings 
SET title = 'Finals Review', 
    start_date = '2026-05-04', 
    end_date = '2026-05-08',
    updated_at = now()
WHERE module_id = 'week-15';

-- Week 16: Final Exam (May 11)
UPDATE mus240_module_settings 
SET title = 'Final Exam (Monday 8am)', 
    start_date = '2026-05-11', 
    end_date = '2026-05-11',
    updated_at = now()
WHERE module_id = 'week-16';