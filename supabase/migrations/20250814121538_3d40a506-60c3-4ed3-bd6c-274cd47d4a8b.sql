-- Delete ALL remaining auditions that are clearly outside the time windows
DELETE FROM gw_auditions 
WHERE audition_date IS NOT NULL 
AND (
  -- Delete any with times that are clearly outside 2:30-4:30 PM on Friday or 11 AM-1 PM on Saturday
  (audition_date::date = '2025-08-15' AND audition_time NOT IN ('2:30 PM', '2:35 PM', '2:40 PM', '2:45 PM', '2:50 PM', '2:55 PM', '3:00 PM', '3:05 PM', '3:10 PM', '3:15 PM', '3:20 PM', '3:25 PM', '3:30 PM', '3:35 PM', '3:40 PM', '3:45 PM', '3:50 PM', '3:55 PM', '4:00 PM', '4:05 PM', '4:10 PM', '4:15 PM', '4:20 PM', '4:25 PM', '4:30 PM')) OR
  (audition_date::date = '2025-08-16' AND audition_time NOT IN ('11:00 AM', '11:05 AM', '11:10 AM', '11:15 AM', '11:20 AM', '11:25 AM', '11:30 AM', '11:35 AM', '11:40 AM', '11:45 AM', '11:50 AM', '11:55 AM', '12:00 PM', '12:05 PM', '12:10 PM', '12:15 PM', '12:20 PM', '12:25 PM', '12:30 PM', '12:35 PM', '12:40 PM', '12:45 PM', '12:50 PM', '12:55 PM', '1:00 PM'))
);