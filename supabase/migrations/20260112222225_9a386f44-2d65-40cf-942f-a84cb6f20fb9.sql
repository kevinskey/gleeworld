-- Move all SCGC events to MUS 070 calendar
UPDATE gw_events 
SET calendar_id = '7053fa69-0d24-45c2-bd42-b191b5460e83'
WHERE calendar_id = 'b1e077a0-85f3-4665-b006-4767b310a521';

-- Rename MUS 070 calendar to just "MUS 070"
UPDATE gw_calendars 
SET name = 'MUS 070', description = 'Spelman College Glee Club calendar'
WHERE id = '7053fa69-0d24-45c2-bd42-b191b5460e83';

-- Delete the SCGC calendar
DELETE FROM gw_calendars 
WHERE id = 'b1e077a0-85f3-4665-b006-4767b310a521';