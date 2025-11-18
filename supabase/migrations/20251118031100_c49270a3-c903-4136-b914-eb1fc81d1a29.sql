-- Deactivate old assignments without assignment_code to avoid confusion
UPDATE public.mus240_assignments
SET is_active = false
WHERE assignment_code IS NULL
  AND assignment_type = 'listening_journal'
  AND title NOT IN (
    'Listening Journal 1: African Roots',
    'Week 2 Listening Guide – Spirituals and Vocal Traditions',
    'Listening Journal 3: Delta Blues',
    'Listening Journal 4: Ragtime',
    'Listening Journal 5: Jazz Origins',
    'Listening Journal 6: Jubilee Quartets',
    'Listening Journal 7: Spirituals to Swing to King',
    'Listening Journal 8: Hip-Hop Foundations',
    'Listening Journal 9: Contemporary R&B Evolution',
    'Listening Journal 10: Contemporary Gospel',
    'Listening Journal 11: Jazz Evolution',
    'Listening Journal 12: Contemporary Hip-Hop'
  );

-- Add reflection papers and other assignments from the syllabus
INSERT INTO public.mus240_assignments (assignment_code, title, description, prompt, points, due_date, assignment_type, is_active)
VALUES
  ('rp1', 'Reflection Paper 1: Cultural Context in Blues', 'Demonstrate critical thinking about blues music in its cultural context.', 'Write a structured essay exploring blues in historical and social context.', 50, '2025-09-19T23:59:00+00:00', 'reflection_paper', true),
  ('gpp', 'Group Project Proposal: AI and Music', 'One-paragraph topic description for your group project exploring AI''s impact on African American music.', 'Propose research topic connecting AI to African American music traditions.', 20, '2025-10-06T23:59:00+00:00', 'research_proposal', true),
  ('rp2', 'Reflection Paper 2: Music and the Civil Rights Movement', 'Reflect on Willie T. Johnson and the Golden Gate Quartet.', 'Analyze career trajectory from fame to Navy choir director during Civil Rights era.', 50, '2025-10-13T23:59:00+00:00', 'reflection_paper', true),
  ('gpab', 'Group Project Annotated Bibliography: AI and Music', 'Compile and annotate at least 5 credible sources for your group project.', 'Research and annotate scholarly sources on AI and African American music.', 30, '2025-11-03T23:59:00+00:00', 'annotated_bibliography', true),
  ('rp3', 'Reflection Paper 3: Jazz and Social Change', 'Examine jazz music''s relationship to social and political movements.', 'Explore how jazz reflected and influenced social change movements.', 50, '2025-11-17T23:59:00+00:00', 'reflection_paper', true),
  ('aiwr', 'AI Workshop Reflection', 'Workshop on AI-assisted music creation and exploration of authorship, ethics, and innovation.', 'Reflect on AI tools, creative process, and ethical considerations.', 20, '2025-12-03T23:59:00+00:00', 'listening_journal', true),
  ('gpfp', 'Group AI Presentations: From Spirituals to Swing to King to Code', 'Present your group''s research connecting African American music history to the digital present through AI.', 'Final presentation connecting historical music traditions to AI.', 100, '2025-12-08T23:59:00+00:00', 'project', true),
  ('final', 'Final Exam & Reflection', 'Comprehensive review and reflection on the enduring soul of African American music in a technological age.', 'Comprehensive essay exam with historical and contemporary analysis.', 50, '2025-12-14T23:59:00+00:00', 'essay', true)
ON CONFLICT (assignment_code) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  prompt = EXCLUDED.prompt,
  points = EXCLUDED.points,
  due_date = EXCLUDED.due_date,
  assignment_type = EXCLUDED.assignment_type,
  is_active = true;