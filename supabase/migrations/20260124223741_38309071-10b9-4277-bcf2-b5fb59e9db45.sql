-- Link all course events to their proper course_id for QR attendance system

-- MUS 070 - Glee Club (calendar: 7053fa69-0d24-45c2-bd42-b191b5460e83)
UPDATE gw_events 
SET course_id = 'a0000000-0000-0000-0000-000000000070',
    attendance_required = true
WHERE calendar_id = '7053fa69-0d24-45c2-bd42-b191b5460e83'
  AND course_id IS NULL;

-- GLEE 000 - Sight Reading (calendar: 5b7ca37c-f5bd-4635-a6d0-357634ee81e6)
UPDATE gw_events 
SET course_id = '025f229b-e8e9-4e13-8e76-c6504cca0a30',
    attendance_required = true
WHERE calendar_id = '5b7ca37c-f5bd-4635-a6d0-357634ee81e6'
  AND course_id IS NULL;

-- GLEE 101 - Leadership Development (calendar: 1d8e2b25-c191-4a4b-addd-a0be37a9e50f)
UPDATE gw_events 
SET course_id = 'b9c43732-b3c7-4292-b43c-104a80c0b4dd',
    attendance_required = true
WHERE calendar_id = '1d8e2b25-c191-4a4b-addd-a0be37a9e50f'
  AND course_id IS NULL;

-- MUS 001 - Private Lessons (calendar: 2004a012-cce6-4fae-89eb-d95669992456)
UPDATE gw_events 
SET course_id = 'eb10a88e-7d5b-4a69-b508-d724b2d8d502',
    attendance_required = true
WHERE calendar_id = '2004a012-cce6-4fae-89eb-d95669992456'
  AND course_id IS NULL;

-- LH 100 - Bowman Scholars (calendars: 123555cc-62df-48b8-8021-7c49349177ef and a0000000-0000-0000-0000-000000000100)
UPDATE gw_events 
SET course_id = 'a0000000-0000-0000-0000-000000000100',
    attendance_required = true
WHERE calendar_id IN ('123555cc-62df-48b8-8021-7c49349177ef', 'a0000000-0000-0000-0000-000000000100')
  AND course_id IS NULL;

-- MUS 210 - Choral Conducting (calendar: 582d666c-a6b4-421c-a6d8-04d6e62e9786) - already has course_id but ensure attendance_required
UPDATE gw_events 
SET attendance_required = true
WHERE calendar_id = '582d666c-a6b4-421c-a6d8-04d6e62e9786'
  AND attendance_required IS NOT true;