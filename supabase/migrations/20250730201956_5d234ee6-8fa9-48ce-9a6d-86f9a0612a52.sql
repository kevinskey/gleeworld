-- Add a time block for August 14, 2025 to match the existing audition logs
INSERT INTO public.audition_time_blocks (
  start_date,
  end_date,
  appointment_duration_minutes,
  is_active,
  created_at,
  updated_at
) VALUES (
  '2025-08-14 19:30:00+00'::timestamptz,  -- 3:30 PM Eastern
  '2025-08-14 22:00:00+00'::timestamptz,  -- 6:00 PM Eastern  
  5,
  true,
  now(),
  now()
);