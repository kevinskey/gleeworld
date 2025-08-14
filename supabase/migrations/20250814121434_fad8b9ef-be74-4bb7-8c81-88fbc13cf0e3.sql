-- Delete remaining auditions outside proper time windows
-- Friday 2:30-4:30 PM EST = 18:30-20:30 UTC (but stored as date + time separately)
-- Saturday 11:00 AM-1:00 PM EST = 15:00-17:00 UTC

-- Delete Friday auditions with times outside 2:30-4:30 PM EST
DELETE FROM gw_auditions 
WHERE audition_date::date = '2025-08-15' 
AND (
  audition_time NOT BETWEEN '2:30 PM' AND '4:30 PM' AND
  audition_time NOT BETWEEN '14:30' AND '16:30' AND
  audition_time NOT IN ('3:30 PM', '3:40 PM', '4:00 PM')
);

-- Delete Saturday auditions with times outside 11:00 AM-1:00 PM EST  
DELETE FROM gw_auditions 
WHERE audition_date::date = '2025-08-16' 
AND (
  audition_time NOT BETWEEN '11:00 AM' AND '1:00 PM' AND
  audition_time NOT BETWEEN '11:00' AND '13:00' AND
  audition_time NOT IN ('12:30 PM', '1:00 PM')
);