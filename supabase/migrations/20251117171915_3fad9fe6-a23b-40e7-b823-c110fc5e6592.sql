-- Update remaining journal titles with correct data from mus240Assignments.ts
UPDATE gw_assignments 
SET 
  title = 'Listening Journal 8: Hip-Hop Foundations',
  description = 'Analyze the emergence of hip-hop culture and early rap music.'
WHERE legacy_id = '550e8400-e29b-41d4-a716-446655440008';

UPDATE gw_assignments 
SET 
  title = 'Listening Journal 9: Contemporary R&B Evolution',
  description = 'Study the evolution of R&B from the 1990s to present day.'
WHERE legacy_id = '550e8400-e29b-41d4-a716-446655440009';

UPDATE gw_assignments 
SET 
  title = 'Listening Journal 10: Contemporary Gospel',
  description = 'Examine modern gospel music and its fusion with other genres.'
WHERE legacy_id = '550e8400-e29b-41d4-a716-446655440010';

UPDATE gw_assignments 
SET 
  title = 'Listening Journal 11: Jazz Evolution',
  description = 'Trace jazz development from bebop through fusion to contemporary jazz.'
WHERE legacy_id = '550e8400-e29b-41d4-a716-446655440011';

UPDATE gw_assignments 
SET 
  title = 'Listening Journal 12: Contemporary Hip-Hop',
  description = 'Examine trap, drill, and conscious rap in contemporary hip-hop.'
WHERE legacy_id = '550e8400-e29b-41d4-a716-446655440012';

UPDATE gw_assignments 
SET 
  title = 'AI Workshop Reflection',
  description = 'Workshop on AI-assisted music creation and exploration of authorship, ethics, and innovation.'
WHERE legacy_id IS NULL 
  AND legacy_source = 'mus240_syllabus' 
  AND title = 'Listening Journal 13';
