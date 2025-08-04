-- First, let's create an active audition session if none exists
INSERT INTO public.audition_sessions (
  name,
  description,
  start_date,
  end_date,
  application_deadline,
  requirements,
  max_applicants,
  is_active
) 
SELECT 
  'Spring 2025 Auditions',
  'Spring semester auditions for the Spelman College Glee Club. Open to all students interested in joining our musical family.',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '30 days',
  CURRENT_DATE + INTERVAL '25 days',
  'Prepare a 1-2 minute song of your choice. Sight-reading materials will be provided.',
  50,
  true
WHERE NOT EXISTS (SELECT 1 FROM public.audition_sessions WHERE is_active = true);

-- Add audition time blocks for the next few weeks if none exist
INSERT INTO public.audition_time_blocks (
  start_date,
  end_date,
  appointment_duration_minutes,
  is_active
) 
SELECT * FROM (VALUES
  -- This week: Monday-Friday, 2-6 PM
  ((CURRENT_DATE + INTERVAL '1 day')::date + TIME '14:00', (CURRENT_DATE + INTERVAL '1 day')::date + TIME '18:00', 15, true),
  ((CURRENT_DATE + INTERVAL '2 days')::date + TIME '14:00', (CURRENT_DATE + INTERVAL '2 days')::date + TIME '18:00', 15, true),
  ((CURRENT_DATE + INTERVAL '3 days')::date + TIME '14:00', (CURRENT_DATE + INTERVAL '3 days')::date + TIME '18:00', 15, true),
  ((CURRENT_DATE + INTERVAL '4 days')::date + TIME '14:00', (CURRENT_DATE + INTERVAL '4 days')::date + TIME '18:00', 15, true),
  ((CURRENT_DATE + INTERVAL '5 days')::date + TIME '14:00', (CURRENT_DATE + INTERVAL '5 days')::date + TIME '18:00', 15, true),
  -- Next week: Monday-Friday, 2-6 PM
  ((CURRENT_DATE + INTERVAL '8 days')::date + TIME '14:00', (CURRENT_DATE + INTERVAL '8 days')::date + TIME '18:00', 15, true),
  ((CURRENT_DATE + INTERVAL '9 days')::date + TIME '14:00', (CURRENT_DATE + INTERVAL '9 days')::date + TIME '18:00', 15, true),
  ((CURRENT_DATE + INTERVAL '10 days')::date + TIME '14:00', (CURRENT_DATE + INTERVAL '10 days')::date + TIME '18:00', 15, true),
  ((CURRENT_DATE + INTERVAL '11 days')::date + TIME '14:00', (CURRENT_DATE + INTERVAL '11 days')::date + TIME '18:00', 15, true),
  ((CURRENT_DATE + INTERVAL '12 days')::date + TIME '14:00', (CURRENT_DATE + INTERVAL '12 days')::date + TIME '18:00', 15, true)
) AS t(start_date, end_date, appointment_duration_minutes, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM public.audition_time_blocks 
  WHERE start_date >= CURRENT_DATE AND is_active = true
);