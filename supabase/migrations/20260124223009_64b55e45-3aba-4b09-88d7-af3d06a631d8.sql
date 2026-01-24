-- Add Spring 2026 MUS-240 class sessions to gw_events table
-- Using the MUS 240 calendar: 9b0267e7-5b30-4288-b33f-99a056279011

INSERT INTO gw_events (id, title, description, event_type, start_date, end_date, location, course_id, attendance_required, is_public, status, created_by, calendar_id)
VALUES 
  ('60d8143d-db26-4669-8011-bfb21f061b08', 'MUS-240 Survey of African American Music', 'Spring 2026 Class Session', 'class', '2026-01-15 12:00:00+00', '2026-01-15 12:50:00+00', 'TBD', '23c4ee3c-7bbb-4534-8c0a-eecd88298d37', true, false, 'confirmed', 'ae0fbced-4a8f-4453-86f4-e22d2ca43e6e', '9b0267e7-5b30-4288-b33f-99a056279011'),
  ('408c0fee-431a-4ae0-bc5e-be1e7e355f56', 'MUS-240 Survey of African American Music', 'Spring 2026 Class Session', 'class', '2026-01-17 12:00:00+00', '2026-01-17 12:50:00+00', 'TBD', '23c4ee3c-7bbb-4534-8c0a-eecd88298d37', true, false, 'confirmed', 'ae0fbced-4a8f-4453-86f4-e22d2ca43e6e', '9b0267e7-5b30-4288-b33f-99a056279011'),
  ('c39486db-8308-4ec5-be29-227d8bf8ecf2', 'MUS-240 Survey of African American Music', 'Spring 2026 Class Session', 'class', '2026-01-22 12:00:00+00', '2026-01-22 12:50:00+00', 'TBD', '23c4ee3c-7bbb-4534-8c0a-eecd88298d37', true, false, 'confirmed', 'ae0fbced-4a8f-4453-86f4-e22d2ca43e6e', '9b0267e7-5b30-4288-b33f-99a056279011'),
  ('a6af4a9f-9a43-4782-a5fa-5b47fa3ef777', 'MUS-240 Survey of African American Music', 'Spring 2026 Class Session', 'class', '2026-01-24 12:00:00+00', '2026-01-24 12:50:00+00', 'TBD', '23c4ee3c-7bbb-4534-8c0a-eecd88298d37', true, false, 'confirmed', 'ae0fbced-4a8f-4453-86f4-e22d2ca43e6e', '9b0267e7-5b30-4288-b33f-99a056279011'),
  (gen_random_uuid(), 'MUS-240 Survey of African American Music', 'Spring 2026 Class Session', 'class', '2026-01-27 12:00:00+00', '2026-01-27 12:50:00+00', 'TBD', '23c4ee3c-7bbb-4534-8c0a-eecd88298d37', true, false, 'confirmed', 'ae0fbced-4a8f-4453-86f4-e22d2ca43e6e', '9b0267e7-5b30-4288-b33f-99a056279011')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  course_id = EXCLUDED.course_id,
  attendance_required = EXCLUDED.attendance_required;