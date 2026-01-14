-- MUS 210: Update weekly schedule to weekly modules and add assignment events to calendars

-- Update the weekly_schedule in gw_syllabus_templates with weekly modules
UPDATE gw_syllabus_templates
SET weekly_schedule = '[
  {"week": "Week 1: Jan 14–20", "topics": "Conducting Fundamentals: Posture, Window & Basic Meters", "readings": "Conducting Fundamentals – preparatory position, window, beat patterns.", "assignments": "Conducting Video #1: Basic Patterns (Due Jan 21)"},
  {"week": "Week 2: Jan 21–27", "topics": "The Conductor as Leader & Basic Patterns Review", "readings": "History of Conducting – Ancient & Medieval Origins.", "assignments": "Conducting Video #2: Subdivision (Due Jan 28), ReadMusic Warm-up #1 (Due Jan 28)"},
  {"week": "Week 3: Jan 28–Feb 3", "topics": "Score Notation & Warm-ups", "readings": "Choral Conventions – Notational.", "assignments": "Glossary Quiz 1: Italian Tempo & Dynamics Terms (Due Jan 30)"},
  {"week": "Week 4: Feb 4–10", "topics": "Renaissance Era: History & Repertoire", "readings": "History of Choral Music – Renaissance.", "assignments": "Technique Jury #1 (Feb 4), Mirror Drill Log (Feb 4), Genre Presentation: Renaissance SSAA (Feb 6)"},
  {"week": "Week 5: Feb 11–17", "topics": "Renaissance Conducting", "readings": "Renaissance conducting techniques.", "assignments": "Final Major Work Selection (Feb 11), ReadMusic Warm-up #2 (Feb 13)"},
  {"week": "Week 6: Feb 18–24", "topics": "Baroque Era: History & Warm-ups", "readings": "History of Choral Music – Baroque.", "assignments": "Score Marking (Feb 18), Score Memory Check #1 (Feb 18), Genre Presentation: Baroque (Feb 20), Glossary Quiz 2 (Feb 20), Marked Score (Feb 23), Rehearsal Plan (Feb 23)"},
  {"week": "Week 7: Feb 25–Mar 3", "topics": "Baroque Conducting & Practicum", "readings": "Baroque conducting techniques.", "assignments": "Practicum Video #1 (Feb 25), Practicum Video #2 (Feb 27)"},
  {"week": "Week 8: Mar 4–10", "topics": "Practicum Continuation & Reflection", "readings": "Rehearsal techniques.", "assignments": "Practicum Video #3 (Mar 2), Practicum Video #4 (Mar 4), Genre Presentation: Classical (Mar 6), Reflection Report (Mar 6)"},
  {"week": "Week 9: Mar 11–17", "topics": "SPRING BREAK – No Classes", "readings": "", "assignments": ""},
  {"week": "Week 10: Mar 18–24", "topics": "Classical Era: History & Advanced Patterns", "readings": "History of Choral Music – Classical.", "assignments": "ReadMusic Warm-up #3 (Mar 20), Conducting Video: Rubato & Fermata (Mar 20)"},
  {"week": "Week 11: Mar 25–31", "topics": "Romantic Era: History & Expression", "readings": "History of Choral Music – Romantic.", "assignments": "Genre Presentation: Romantic (Mar 27), Glossary Quiz 3 (Mar 27), Conducting Video: Mixed Meter (Mar 27), Melding Exercise (Mar 31), Technique Jury #2 (Mar 31)"},
  {"week": "Week 12: Apr 1–7", "topics": "HBCU Choral Traditions", "readings": "Spirituals, Gospel Roots, HBCU Legacy.", "assignments": "Genre Presentation: Negro Spirituals & HBCU Tradition (Apr 3)"},
  {"week": "Week 13: Apr 8–14", "topics": "Contemporary & 20th Century Works", "readings": "20th Century & Contemporary.", "assignments": "Score Memory Check #2 (Apr 10), Genre Presentation: 20th Century (Apr 10), Program Notes Draft (Apr 11)"},
  {"week": "Week 14: Apr 15–21", "topics": "Final Jury Preparation", "readings": "Review all techniques.", "assignments": "Conducting Video: Final Major Work (Apr 18), Final Program Notes (Apr 19)"},
  {"week": "Week 15: Apr 22–28", "topics": "Final Examinations", "readings": "", "assignments": "Final 30-Minute Jury (Apr 25)"}
]'::jsonb,
    updated_at = now()
WHERE course_id = '2026c613-bda7-487a-a5d9-91e57c26a741';

-- Add events using 'other' event type which is valid
DO $$
DECLARE
  system_user_id UUID;
BEGIN
  SELECT user_id INTO system_user_id FROM app_roles WHERE role IN ('superadmin', 'admin') LIMIT 1;
  IF system_user_id IS NULL THEN SELECT id INTO system_user_id FROM auth.users LIMIT 1; END IF;

  -- Insert into MUS 210 calendar
  INSERT INTO gw_events (title, description, event_type, start_date, end_date, calendar_id, course_id, is_public, status, created_by)
  SELECT a.title || ' Due', 'MUS 210 Assignment: ' || a.title || ' (' || COALESCE(a.points::text, '0') || ' pts)', 'other',
    a.due_at, a.due_at + interval '1 hour', '582d666c-a6b4-421c-a6d8-04d6e62e9786'::uuid, '2026c613-bda7-487a-a5d9-91e57c26a741'::uuid, false, 'confirmed', system_user_id
  FROM gw_assignments a WHERE a.course_id = '2026c613-bda7-487a-a5d9-91e57c26a741' AND a.is_active = true AND a.due_at IS NOT NULL;

  -- Insert into Main Calendar  
  INSERT INTO gw_events (title, description, event_type, start_date, end_date, calendar_id, course_id, is_public, status, created_by)
  SELECT 'MUS 210: ' || a.title || ' Due', 'MUS 210 Assignment: ' || a.title || ' (' || COALESCE(a.points::text, '0') || ' pts)', 'other',
    a.due_at, a.due_at + interval '1 hour', 'd0241f76-a1fa-4950-a696-d64920a350a8'::uuid, '2026c613-bda7-487a-a5d9-91e57c26a741'::uuid, false, 'confirmed', system_user_id
  FROM gw_assignments a WHERE a.course_id = '2026c613-bda7-487a-a5d9-91e57c26a741' AND a.is_active = true AND a.due_at IS NOT NULL;
END $$;