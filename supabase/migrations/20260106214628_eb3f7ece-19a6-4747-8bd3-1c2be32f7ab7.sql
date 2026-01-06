-- Insert missing courses into gw_courses
INSERT INTO gw_courses (id, course_code, title, description, is_active) VALUES
  (gen_random_uuid(), 'MUS 210', 'Choral Conducting and Literature', 'Master the art of choral conducting with comprehensive training in technique, score analysis, and repertoire selection.', true),
  (gen_random_uuid(), 'GLEE 101', 'Leadership Development', 'Develop essential leadership skills for musical ensemble management, team collaboration, and performance excellence.', true),
  (gen_random_uuid(), 'MUS 001', 'Private Lessons', 'One-on-one vocal instruction tailored to your individual voice, technique, and musical goals.', true),
  (gen_random_uuid(), 'GLEE 000', 'Sight Reading', 'Build essential sight-reading skills through progressive exercises and practical application in choral repertoire.', true)
ON CONFLICT DO NOTHING;

-- Update existing MUS 240 course with proper course code and description
UPDATE gw_courses 
SET course_code = 'MUS 240',
    description = 'Explore the rich tapestry of African American musical traditions, from spirituals and blues to jazz, gospel, R&B, and hip-hop.'
WHERE title = 'MUS 240' OR course_code IS NULL AND title ILIKE '%240%';