-- First, alter the column type to text to support 12-hour format with AM/PM
ALTER TABLE public.gw_audition_logs 
ALTER COLUMN audition_time TYPE text;

-- Now update existing times to 12-hour format
UPDATE public.gw_audition_logs 
SET audition_time = CASE 
  WHEN audition_time ~ '^[0-9]{2}:[0-9]{2}:[0-9]{2}$' THEN
    CASE 
      WHEN CAST(SPLIT_PART(audition_time, ':', 1) AS INTEGER) = 0 THEN
        '12:' || SPLIT_PART(audition_time, ':', 2) || ' AM'
      WHEN CAST(SPLIT_PART(audition_time, ':', 1) AS INTEGER) < 12 THEN
        CAST(SPLIT_PART(audition_time, ':', 1) AS INTEGER)::text || ':' || SPLIT_PART(audition_time, ':', 2) || ' AM'
      WHEN CAST(SPLIT_PART(audition_time, ':', 1) AS INTEGER) = 12 THEN
        '12:' || SPLIT_PART(audition_time, ':', 2) || ' PM'
      ELSE
        CAST(CAST(SPLIT_PART(audition_time, ':', 1) AS INTEGER) - 12 AS TEXT) || ':' || SPLIT_PART(audition_time, ':', 2) || ' PM'
    END
  ELSE audition_time -- Keep if already in correct format
END
WHERE audition_time IS NOT NULL;