-- Clear existing audition time blocks first
DELETE FROM public.audition_time_blocks;

-- Add audition time block for January 15th (Friday) 2:30 PM - 4:30 PM EST
INSERT INTO public.audition_time_blocks (
  start_date,
  end_date,
  appointment_duration_minutes,
  is_active
) VALUES (
  '2025-01-15 19:30:00+00'::timestamptz,  -- 2:30 PM EST = 7:30 PM UTC
  '2025-01-15 21:30:00+00'::timestamptz,  -- 4:30 PM EST = 9:30 PM UTC
  5,
  true
);

-- Add audition time block for January 16th (Saturday) 11:00 AM - 1:00 PM EST  
INSERT INTO public.audition_time_blocks (
  start_date,
  end_date,
  appointment_duration_minutes,
  is_active
) VALUES (
  '2025-01-16 16:00:00+00'::timestamptz,  -- 11:00 AM EST = 4:00 PM UTC
  '2025-01-16 18:00:00+00'::timestamptz,  -- 1:00 PM EST = 6:00 PM UTC
  5,
  true
);