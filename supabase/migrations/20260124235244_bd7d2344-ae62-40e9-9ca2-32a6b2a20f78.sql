-- First, delete the incorrect MUS-240 events (the ones on Thu/Sat at wrong times)
DELETE FROM gw_events 
WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' 
AND title = 'MUS-240 Survey of African American Music';

-- Add Monday classes for MUS 240 (MWF 12:00-12:50 PM ET = 17:00-17:50 UTC)
-- Using existing created_by user: aece359b-a80a-4726-ad75-49ed17fe20d2
INSERT INTO gw_events (title, description, start_date, end_date, event_type, course_id, calendar_id, is_public, attendance_required, created_by)
VALUES
-- Week 1 - Jan 12
('MUS 240 Class', 'Survey of African American Music', '2026-01-12 17:00:00+00', '2026-01-12 17:50:00+00', 'class', '23c4ee3c-7bbb-4534-8c0a-eecd88298d37', '9b0267e7-5b30-4288-b33f-99a056279011', false, true, 'aece359b-a80a-4726-ad75-49ed17fe20d2'),
-- Week 3 - Jan 26
('MUS 240 Class', 'Survey of African American Music', '2026-01-26 17:00:00+00', '2026-01-26 17:50:00+00', 'class', '23c4ee3c-7bbb-4534-8c0a-eecd88298d37', '9b0267e7-5b30-4288-b33f-99a056279011', false, true, 'aece359b-a80a-4726-ad75-49ed17fe20d2'),
-- Week 4
('MUS 240 Class', 'Survey of African American Music', '2026-02-02 17:00:00+00', '2026-02-02 17:50:00+00', 'class', '23c4ee3c-7bbb-4534-8c0a-eecd88298d37', '9b0267e7-5b30-4288-b33f-99a056279011', false, true, 'aece359b-a80a-4726-ad75-49ed17fe20d2'),
-- Week 5
('MUS 240 Class', 'Survey of African American Music', '2026-02-09 17:00:00+00', '2026-02-09 17:50:00+00', 'class', '23c4ee3c-7bbb-4534-8c0a-eecd88298d37', '9b0267e7-5b30-4288-b33f-99a056279011', false, true, 'aece359b-a80a-4726-ad75-49ed17fe20d2'),
-- Week 6
('MUS 240 Class', 'Survey of African American Music', '2026-02-16 17:00:00+00', '2026-02-16 17:50:00+00', 'class', '23c4ee3c-7bbb-4534-8c0a-eecd88298d37', '9b0267e7-5b30-4288-b33f-99a056279011', false, true, 'aece359b-a80a-4726-ad75-49ed17fe20d2'),
-- Week 7
('MUS 240 Class', 'Survey of African American Music', '2026-02-23 17:00:00+00', '2026-02-23 17:50:00+00', 'class', '23c4ee3c-7bbb-4534-8c0a-eecd88298d37', '9b0267e7-5b30-4288-b33f-99a056279011', false, true, 'aece359b-a80a-4726-ad75-49ed17fe20d2'),
-- Week 8
('MUS 240 Class', 'Survey of African American Music', '2026-03-02 17:00:00+00', '2026-03-02 17:50:00+00', 'class', '23c4ee3c-7bbb-4534-8c0a-eecd88298d37', '9b0267e7-5b30-4288-b33f-99a056279011', false, true, 'aece359b-a80a-4726-ad75-49ed17fe20d2'),
-- Week 10 (after spring break, DST starts Mar 8 - so 12pm ET = 16:00 UTC)
('MUS 240 Class', 'Survey of African American Music', '2026-03-16 16:00:00+00', '2026-03-16 16:50:00+00', 'class', '23c4ee3c-7bbb-4534-8c0a-eecd88298d37', '9b0267e7-5b30-4288-b33f-99a056279011', false, true, 'aece359b-a80a-4726-ad75-49ed17fe20d2'),
-- Week 11
('MUS 240 Class', 'Survey of African American Music', '2026-03-23 16:00:00+00', '2026-03-23 16:50:00+00', 'class', '23c4ee3c-7bbb-4534-8c0a-eecd88298d37', '9b0267e7-5b30-4288-b33f-99a056279011', false, true, 'aece359b-a80a-4726-ad75-49ed17fe20d2'),
-- Week 12
('MUS 240 Class', 'Survey of African American Music', '2026-03-30 16:00:00+00', '2026-03-30 16:50:00+00', 'class', '23c4ee3c-7bbb-4534-8c0a-eecd88298d37', '9b0267e7-5b30-4288-b33f-99a056279011', false, true, 'aece359b-a80a-4726-ad75-49ed17fe20d2'),
-- Week 13
('MUS 240 Class', 'Survey of African American Music', '2026-04-06 16:00:00+00', '2026-04-06 16:50:00+00', 'class', '23c4ee3c-7bbb-4534-8c0a-eecd88298d37', '9b0267e7-5b30-4288-b33f-99a056279011', false, true, 'aece359b-a80a-4726-ad75-49ed17fe20d2'),
-- Week 14
('MUS 240 Class', 'Survey of African American Music', '2026-04-13 16:00:00+00', '2026-04-13 16:50:00+00', 'class', '23c4ee3c-7bbb-4534-8c0a-eecd88298d37', '9b0267e7-5b30-4288-b33f-99a056279011', false, true, 'aece359b-a80a-4726-ad75-49ed17fe20d2'),
-- Week 15
('MUS 240 Class', 'Survey of African American Music', '2026-04-20 16:00:00+00', '2026-04-20 16:50:00+00', 'class', '23c4ee3c-7bbb-4534-8c0a-eecd88298d37', '9b0267e7-5b30-4288-b33f-99a056279011', false, true, 'aece359b-a80a-4726-ad75-49ed17fe20d2'),
-- Week 16
('MUS 240 Class', 'Survey of African American Music', '2026-04-27 16:00:00+00', '2026-04-27 16:50:00+00', 'class', '23c4ee3c-7bbb-4534-8c0a-eecd88298d37', '9b0267e7-5b30-4288-b33f-99a056279011', false, true, 'aece359b-a80a-4726-ad75-49ed17fe20d2');

-- Normalize existing Wed/Fri events to consistent naming
UPDATE gw_events 
SET title = 'MUS 240 Class', 
    description = 'Survey of African American Music'
WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' 
AND title LIKE 'MUS 240 Class%';