-- Sync MUS240 listening journal data from mus240_assignments to gw_assignments
-- Update descriptions and add legacy references

-- Journal 1
UPDATE gw_assignments 
SET description = 'Listen to the provided traditional Ewe music recordings and write a 250+ word journal entry analyzing the musical elements you hear. Focus on rhythm patterns, call-and-response structures, and cultural significance. Reflect on how this music connects to community and cultural identity.',
    legacy_source = 'mus240_assignments',
    legacy_id = 'lj1'
WHERE title = 'Listening Journal 1: Traditional Ewe Music'
  AND course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37';

-- Journal 2  
UPDATE gw_assignments 
SET description = 'Listen to the assigned spirituals and vocal traditions music. Analyze Fisk Jubilee Singers "Swing Low, Sweet Chariot", field hollers, Robert Johnson "Cross Road Blues", and Kevin Phillip Johnson''s "Children, Go Where I Send Thee". Write a 250-300 word analysis of the vocal techniques, spiritual themes, and cultural significance.',
    legacy_source = 'mus240_assignments',
    legacy_id = 'lj2'
WHERE title = 'Listening Journal 2'
  AND course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37';

-- Journal 3
UPDATE gw_assignments 
SET description = 'Listen to Scott Joplin''s "Maple Leaf Rag" and write a 250-300 word analysis focusing on syncopation, rhythmic complexity, and cultural significance. Discuss how ragtime represented African American musical innovation and cultural expression during the early 1900s.',
    legacy_source = 'mus240_assignments',
    legacy_id = 'lj3'
WHERE title = 'Listening Journal 3: Ragtime and Scott Joplin'
  AND course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37';

-- Add generic prompts for journals 4-12
UPDATE gw_assignments 
SET description = 'Write a 250-300 word listening journal entry analyzing the assigned music for this week. Focus on musical elements, cultural context, and historical significance.',
    legacy_source = 'mus240_assignments'
WHERE assignment_type = 'listening_journal'
  AND course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'
  AND description IS NULL;