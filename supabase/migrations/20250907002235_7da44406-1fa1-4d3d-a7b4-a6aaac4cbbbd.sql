-- Create Appointments calendar if it doesn't exist
INSERT INTO gw_calendars (
  name, 
  description, 
  color, 
  is_visible, 
  is_default, 
  created_at,
  updated_at
) 
SELECT 
  'Appointments',
  'Calendar for all appointments made through the appointment system',
  '#6366f1',
  true,
  false,
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM gw_calendars WHERE name = 'Appointments'
);