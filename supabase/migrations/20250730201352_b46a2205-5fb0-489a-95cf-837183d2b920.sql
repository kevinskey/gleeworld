-- Convert existing 24-hour format times to 12-hour format in gw_audition_logs
UPDATE public.gw_audition_logs 
SET audition_time = CASE 
  WHEN audition_time::text ~ '^[0-9]{2}:[0-9]{2}:[0-9]{2}$' THEN
    CASE 
      WHEN EXTRACT(HOUR FROM audition_time) = 0 THEN
        '12:' || LPAD(EXTRACT(MINUTE FROM audition_time)::text, 2, '0') || ' AM'
      WHEN EXTRACT(HOUR FROM audition_time) < 12 THEN
        EXTRACT(HOUR FROM audition_time)::text || ':' || LPAD(EXTRACT(MINUTE FROM audition_time)::text, 2, '0') || ' AM'
      WHEN EXTRACT(HOUR FROM audition_time) = 12 THEN
        '12:' || LPAD(EXTRACT(MINUTE FROM audition_time)::text, 2, '0') || ' PM'
      ELSE
        (EXTRACT(HOUR FROM audition_time) - 12)::text || ':' || LPAD(EXTRACT(MINUTE FROM audition_time)::text, 2, '0') || ' PM'
    END::time
  ELSE audition_time -- Keep if already in 12-hour format
END
WHERE audition_time IS NOT NULL;