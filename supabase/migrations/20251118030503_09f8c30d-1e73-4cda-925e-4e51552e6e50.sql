-- Add assignment_code to map syllabus codes (e.g., lj7) to DB assignments
ALTER TABLE public.mus240_assignments
ADD COLUMN IF NOT EXISTS assignment_code TEXT UNIQUE;

-- Ensure quick lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_mus240_assignments_assignment_code
  ON public.mus240_assignments(assignment_code);

-- Upsert Listening Journals LJ1–LJ12 from syllabus
-- Note: using 23:59:00Z as due time for clarity
INSERT INTO public.mus240_assignments (assignment_code, title, description, prompt, points, due_date, assignment_type, is_active)
VALUES
  ('lj1', 'Listening Journal 1: African Roots', 'Reflect on African traditional music influences. No late penalty for first assignment.', 'Listen and reflect on rhythmic patterns, call-and-response, and vocal techniques. Connect to later forms.', 20, '2025-09-03T23:59:00+00:00', 'listening_journal', true),
  ('lj2', 'Week 2 Listening Guide – Spirituals and Vocal Traditions', 'Fisk Jubilee Singers, Field Holler, Robert Johnson, and "Children, Go Where I Send Thee".', 'Discuss spirituals, call-and-response, blues lineage, and vocal traditions.', 20, '2025-09-10T23:59:00+00:00', 'listening_journal', true),
  ('lj3', 'Listening Journal 3: Delta Blues', 'Compare rural Delta blues with urban Chicago blues styles.', 'Analyze stylistic differences, instrumentation, lyrical themes.', 20, '2025-09-17T23:59:00+00:00', 'listening_journal', true),
  ('lj4', 'Listening Journal 4: Ragtime', 'Examine Scott Joplin and the evolution of ragtime piano music.', 'Discuss form, syncopation, and historical impact.', 20, '2025-09-24T23:59:00+00:00', 'listening_journal', true),
  ('lj5', 'Listening Journal 5: Jazz Origins', 'Emergence of jazz from New Orleans to Harlem.', 'Identify early jazz traits, migration patterns, and cultural contexts.', 20, '2025-10-01T23:59:00+00:00', 'listening_journal', true),
  ('lj6', 'Listening Journal 6: Jubilee Quartets', 'From Fisk to the Golden Gate Quartet.', 'Trace quartet traditions, performance practice, and repertoire.', 20, '2025-10-08T23:59:00+00:00', 'listening_journal', true),
  ('lj7', 'Listening Journal 7: Spirituals to Swing to King', '1939 Spirituals to Swing to 1969 Summer of Soul.', 'Discuss evolution from concert hall to public performance and cultural significance.', 20, '2025-10-15T23:59:00+00:00', 'listening_journal', true),
  ('lj8', 'Listening Journal 8: Hip-Hop Foundations', 'Emergence of hip-hop culture and early rap music.', 'Analyze elements of DJing, MCing, breakdance, graffiti, and early tracks.', 20, '2025-10-29T23:59:00+00:00', 'listening_journal', true),
  ('lj9', 'Listening Journal 9: Contemporary R&B Evolution', 'Evolution of R&B from the 1990s to present.', 'Discuss production techniques, vocal styles, and genre fusion.', 20, '2025-11-05T23:59:00+00:00', 'listening_journal', true), 
  ('lj10', 'Listening Journal 10: Contemporary Gospel', 'Examine modern gospel and its fusion with other genres.', 'Identify stylistic markers and cross-genre influences.', 20, '2025-11-12T23:59:00+00:00', 'listening_journal', true),
  ('lj11', 'Listening Journal 11: Jazz Evolution', 'From bebop through fusion to contemporary jazz.', 'Trace stylistic development, key artists, and innovations.', 20, '2025-11-19T23:59:00+00:00', 'listening_journal', true),
  ('lj12', 'Listening Journal 12: Contemporary Hip-Hop', 'Examine trap, drill, and conscious rap.', 'Contrast subgenres, lyrical themes, and production choices.', 20, '2025-11-26T23:59:00+00:00', 'listening_journal', true)
ON CONFLICT (assignment_code) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  prompt = EXCLUDED.prompt,
  points = EXCLUDED.points,
  due_date = EXCLUDED.due_date,
  assignment_type = EXCLUDED.assignment_type,
  is_active = true;