-- Insert Week 1 module for MUS 210
INSERT INTO course_modules (id, course_id, title, description, display_order, is_published)
VALUES (
  'a1000000-0000-0000-0000-000000000001',
  '2026c613-bda7-487a-a5d9-91e57c26a741',
  'Week 1 – Conducting Fundamentals: Posture, Window & Basic Meters',
  'Introduction to proper conducting stance, preparatory position, conducting window, basic beat patterns, and musical terminology.',
  1,
  true
);

-- Insert Reading/Resources items
INSERT INTO module_items (id, module_id, title, item_type, content_text, content_url, display_order) VALUES
(
  gen_random_uuid(),
  'a1000000-0000-0000-0000-000000000001',
  'Conducting Fundamentals',
  'link',
  'Preparatory position, window, conducting floor and rebound; beat pattern diagrams for 2‑, 3‑ and 4‑beat meters.',
  'https://conducting.gleeworld.org',
  1
),
(
  gen_random_uuid(),
  'a1000000-0000-0000-0000-000000000001',
  'Score Terminology',
  'link',
  'Overview of Italian musical terms such as largo and andante.',
  'https://conducting.gleeworld.org',
  2
);

-- Insert In-class Topics as a document/content item
INSERT INTO module_items (id, module_id, title, item_type, content_text, display_order) VALUES
(
  gen_random_uuid(),
  'a1000000-0000-0000-0000-000000000001',
  'In-Class Topics',
  'document',
  'Proper conducting stance and preparatory position; establishing the conducting window; basic beat patterns and rebound; reading common tempo/dynamic terms; class discussion on why Italian became the dominant language for musical notation.',
  3
);

-- Insert Assignments
INSERT INTO module_items (id, module_id, title, item_type, content_text, points, display_order) VALUES
(
  gen_random_uuid(),
  'a1000000-0000-0000-0000-000000000001',
  'Conducting Fundamentals Exercise',
  'assignment',
  'Demonstrate 2‑, 3‑ and 4‑beat patterns focusing on posture, conducting window and rebound. Record a short video for feedback.',
  20,
  4
),
(
  gen_random_uuid(),
  'a1000000-0000-0000-0000-000000000001',
  'Glossary Quiz',
  'quiz',
  'Compile and study a glossary of 10 Italian terms (tempo, dynamics and articulation) from the Score Terminology page. Quiz next week.',
  15,
  5
),
(
  gen_random_uuid(),
  'a1000000-0000-0000-0000-000000000001',
  'Self-Reflection Journal',
  'assignment',
  'Write a one‑page reflection on personal strengths/weaknesses in physical gesture and communication.',
  10,
  6
);