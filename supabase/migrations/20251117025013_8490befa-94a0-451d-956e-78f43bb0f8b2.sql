-- Update all listening journal assignments to 20 points with proper rubric
UPDATE mus240_assignments 
SET 
  points = 20,
  rubric = jsonb_build_object(
    'criteria', jsonb_build_array(
      jsonb_build_object(
        'name', 'Musical Analysis', 
        'maxPoints', 7, 
        'description', 'Identify genre, style traits, and musical features with clear analysis'
      ),
      jsonb_build_object(
        'name', 'Historical Context', 
        'maxPoints', 5, 
        'description', 'Connect musical features to historical and cultural context'
      ),
      jsonb_build_object(
        'name', 'Terminology Usage', 
        'maxPoints', 3, 
        'description', 'Use correct musical terminology appropriately'
      ),
      jsonb_build_object(
        'name', 'Writing Quality', 
        'maxPoints', 2, 
        'description', 'Clear, concise writing with proper grammar and structure'
      ),
      jsonb_build_object(
        'name', 'Peer Comments', 
        'maxPoints', 3, 
        'description', 'Two thoughtful responses to peers (minimum 50 words each)'
      )
    )
  ),
  description = 'Write a 250-300 word journal entry analyzing the musical elements, historical context, and cultural significance of the assigned listening. Include 2 thoughtful peer responses (50+ words each).',
  instructions = '1. Listen carefully to the assigned music
2. Write 250-300 words analyzing genre, style, and cultural significance
3. Use correct musical terminology
4. Connect to historical context
5. Post 2 thoughtful comments on peers'' journals (50+ words each)'
WHERE assignment_type = 'listening_journal';

-- Also update the grading scale to reflect 20-point assignments
COMMENT ON TABLE mus240_assignments IS 'MUS240 course assignments. Listening Journals are 20 points each with specific rubric: Musical Analysis (7), Historical Context (5), Terminology (3), Writing (2), Peer Comments (3).';