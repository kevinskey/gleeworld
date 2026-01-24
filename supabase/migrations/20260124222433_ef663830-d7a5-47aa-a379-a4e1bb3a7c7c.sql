-- Create Spring 2026 MUS-240 class sessions (MWF starting Jan 15)
-- Jan 15 (Wed), Jan 17 (Fri), Jan 22 (Wed), Jan 24 (Fri) - skipping Jan 20 MLK Day

INSERT INTO events (id, title, event_type, start_date, end_date, course_id, description, attendance_required, created_by)
VALUES 
  (gen_random_uuid(), 'MUS-240 Survey of African American Music', 'class', '2026-01-15 12:00:00+00', '2026-01-15 12:50:00+00', '23c4ee3c-7bbb-4534-8c0a-eecd88298d37', 'Spring 2026 Class Session', true, 'ae0fbced-4a8f-4453-86f4-e22d2ca43e6e'),
  (gen_random_uuid(), 'MUS-240 Survey of African American Music', 'class', '2026-01-17 12:00:00+00', '2026-01-17 12:50:00+00', '23c4ee3c-7bbb-4534-8c0a-eecd88298d37', 'Spring 2026 Class Session', true, 'ae0fbced-4a8f-4453-86f4-e22d2ca43e6e'),
  (gen_random_uuid(), 'MUS-240 Survey of African American Music', 'class', '2026-01-22 12:00:00+00', '2026-01-22 12:50:00+00', '23c4ee3c-7bbb-4534-8c0a-eecd88298d37', 'Spring 2026 Class Session', true, 'ae0fbced-4a8f-4453-86f4-e22d2ca43e6e'),
  (gen_random_uuid(), 'MUS-240 Survey of African American Music', 'class', '2026-01-24 12:00:00+00', '2026-01-24 12:50:00+00', '23c4ee3c-7bbb-4534-8c0a-eecd88298d37', 'Spring 2026 Class Session', true, 'ae0fbced-4a8f-4453-86f4-e22d2ca43e6e');