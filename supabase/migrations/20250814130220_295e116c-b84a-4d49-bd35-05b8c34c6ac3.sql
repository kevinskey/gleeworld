-- Insert a test appointment to demonstrate the booking system
INSERT INTO public.gw_appointments (
  title,
  client_name,
  client_email,
  client_phone,
  appointment_date,
  description,
  status,
  appointment_type,
  duration_minutes
) VALUES (
  'Audition - Test Student',
  'Test Student',
  'test@example.com',
  '555-0123',
  '2025-08-15 18:35:00+00:00', -- 2:35 PM Eastern Time in UTC
  'Spelman College Glee Club Audition (5 minutes) - 2:35 PM EST',
  'scheduled',
  'audition',
  5
);