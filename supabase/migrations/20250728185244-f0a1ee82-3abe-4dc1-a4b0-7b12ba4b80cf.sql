-- First ensure we have a main calendar
INSERT INTO gw_calendars (id, name, description, color, is_public, created_by)
SELECT 
  gen_random_uuid(),
  'Main Calendar',
  'Main Spelman College Glee Club calendar for all public events',
  '#3B82F6',
  true,
  (SELECT id FROM auth.users LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM gw_calendars WHERE name = 'Main Calendar'
);

-- Create Glee Club audition events for August 2025
INSERT INTO gw_events (
  id,
  title,
  description,
  start_date,
  end_date,
  location,
  event_type,
  is_public,
  created_by,
  created_at,
  updated_at,
  calendar_id
) VALUES 
(
  gen_random_uuid(),
  'Glee Club Auditions - Day 1',
  'Spelman College Glee Club auditions. Individual appointment slots available for prospective members. Please schedule your audition appointment during this time block.',
  '2025-08-15 14:30:00-04:00'::timestamptz,
  '2025-08-15 17:30:00-04:00'::timestamptz,
  'Spelman College Music Department',
  'audition',
  true,
  (SELECT id FROM auth.users LIMIT 1),
  now(),
  now(),
  (SELECT id FROM gw_calendars WHERE name = 'Main Calendar' LIMIT 1)
),
(
  gen_random_uuid(),
  'Glee Club Auditions - Day 2', 
  'Spelman College Glee Club auditions. Individual appointment slots available for prospective members. Please schedule your audition appointment during this time block.',
  '2025-08-16 11:00:00-04:00'::timestamptz,
  '2025-08-16 13:00:00-04:00'::timestamptz,
  'Spelman College Music Department',
  'audition',
  true,
  (SELECT id FROM auth.users LIMIT 1),
  now(),
  now(),
  (SELECT id FROM gw_calendars WHERE name = 'Main Calendar' LIMIT 1)
);

-- Create audition appointment configuration table
CREATE TABLE IF NOT EXISTS audition_time_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  appointment_duration_minutes INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on audition_time_blocks
ALTER TABLE audition_time_blocks ENABLE ROW LEVEL SECURITY;

-- Create policies for audition_time_blocks
CREATE POLICY "Everyone can view active audition time blocks" 
ON audition_time_blocks 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage audition time blocks" 
ON audition_time_blocks 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

-- Insert the audition time blocks
INSERT INTO audition_time_blocks (start_date, end_date, appointment_duration_minutes) VALUES
('2025-08-15 14:30:00-04:00'::timestamptz, '2025-08-15 17:30:00-04:00'::timestamptz, 5),
('2025-08-16 11:00:00-04:00'::timestamptz, '2025-08-16 13:00:00-04:00'::timestamptz, 5);