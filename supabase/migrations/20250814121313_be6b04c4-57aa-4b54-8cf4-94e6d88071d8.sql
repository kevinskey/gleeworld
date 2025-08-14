-- Delete auditions outside the proper time windows
-- Friday should be 2:30 PM - 4:30 PM EST (18:30 - 20:30 UTC)
-- Saturday should be 11:00 AM - 1:00 PM EST (15:00 - 17:00 UTC)

-- Delete Friday auditions with times outside 2:30-4:30 PM EST
DELETE FROM gw_auditions 
WHERE audition_date = '2025-08-15' 
AND (
  -- Times before 2:30 PM EST (times like 06:30:00)
  audition_time < '14:30:00' OR 
  -- Times after 4:30 PM EST (times like 21:35:00, 5:35 PM, 5:50 PM, 6:30 PM)
  audition_time > '16:30:00' OR
  audition_time IN ('5:35 PM', '5:50 PM', '6:30 PM', '19:30:00', '21:35:00')
);

-- Delete Saturday auditions with times outside 11:00 AM - 1:00 PM EST  
DELETE FROM gw_auditions 
WHERE audition_date = '2025-08-16' 
AND (
  -- Times before 11:00 AM EST (times like 16:00:00 UTC)
  audition_time < '11:00:00' OR 
  -- Times after 1:00 PM EST (times like 4:30 PM)
  audition_time > '13:00:00' OR
  audition_time IN ('16:00:00', '16:10:00', '16:30:00', '4:30 PM')
);