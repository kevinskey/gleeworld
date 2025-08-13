-- Update audition time blocks to August 15th and 16th, 2025
DELETE FROM public.audition_time_blocks;

-- Add audition time block for August 15th (Friday) 2:30 PM - 4:30 PM EST
INSERT INTO public.audition_time_blocks (
  start_date,
  end_date,
  appointment_duration_minutes,
  is_active
) VALUES (
  '2025-08-15 18:30:00+00'::timestamptz,  -- 2:30 PM EST = 6:30 PM UTC
  '2025-08-15 20:30:00+00'::timestamptz,  -- 4:30 PM EST = 8:30 PM UTC
  5,
  true
);

-- Add audition time block for August 16th (Saturday) 11:00 AM - 1:00 PM EST  
INSERT INTO public.audition_time_blocks (
  start_date,
  end_date,
  appointment_duration_minutes,
  is_active
) VALUES (
  '2025-08-16 15:00:00+00'::timestamptz,  -- 11:00 AM EST = 3:00 PM UTC
  '2025-08-16 17:00:00+00'::timestamptz,  -- 1:00 PM EST = 5:00 PM UTC
  5,
  true
);