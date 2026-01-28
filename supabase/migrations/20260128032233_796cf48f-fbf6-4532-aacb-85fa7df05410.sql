-- Create calendar events for all attendance sessions and link them

-- First, delete old manual SCGC Rehearsal events for MUS 070 (Spring 2026 only)
DELETE FROM gw_events 
WHERE course_id = 'a0000000-0000-0000-0000-000000000070' 
AND start_date >= '2026-01-14'
AND title IN ('SCGC Rehearsal', 'Rehearsal');

-- Create events for MUS 070 sessions
INSERT INTO gw_events (
  calendar_id, title, description, start_date, end_date, 
  event_type, all_day, course_id, created_by, attendance_required, status
)
SELECT 
  '7053fa69-0d24-45c2-bd42-b191b5460e83'::uuid,
  s.title,
  'Glee Club class session - QR attendance enabled',
  s.opens_at,
  s.closes_at,
  'class',
  false,
  s.course_id,
  (SELECT id FROM auth.users WHERE email = 'kpj64110@gmail.com' LIMIT 1),
  true,
  CASE WHEN s.status = 'cancelled' THEN 'cancelled' ELSE 'confirmed' END
FROM gw_attendance_sessions s
WHERE s.course_id = 'a0000000-0000-0000-0000-000000000070'
ON CONFLICT DO NOTHING;

-- Create events for MUS 210 sessions  
INSERT INTO gw_events (
  calendar_id, title, description, start_date, end_date,
  event_type, all_day, course_id, created_by, attendance_required, status
)
SELECT 
  '582d666c-a6b4-421c-a6d8-04d6e62e9786'::uuid,
  s.title,
  'Choral Conducting class session - QR attendance enabled',
  s.opens_at,
  s.closes_at,
  'class',
  false,
  s.course_id,
  (SELECT id FROM auth.users WHERE email = 'kpj64110@gmail.com' LIMIT 1),
  true,
  CASE WHEN s.status = 'cancelled' THEN 'cancelled' ELSE 'confirmed' END
FROM gw_attendance_sessions s
WHERE s.course_id = '2026c613-bda7-487a-a5d9-91e57c26a741'
ON CONFLICT DO NOTHING;

-- Link attendance sessions to their calendar events
UPDATE gw_attendance_sessions s
SET event_id = e.id
FROM gw_events e
WHERE s.title = e.title
AND s.opens_at = e.start_date
AND s.course_id = e.course_id
AND s.event_id IS NULL;