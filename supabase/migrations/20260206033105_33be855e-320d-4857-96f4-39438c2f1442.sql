
-- Delete all incorrectly scheduled "MUS 210 Choral Conducting" events
-- These are on wrong days (Tue/Thu) and wrong times (3 PM instead of 2 PM)
-- The correct MW 2:00-2:50 PM sessions already exist as "MUS 210 - Week X" events
DELETE FROM events 
WHERE title = 'MUS 210 Choral Conducting';
