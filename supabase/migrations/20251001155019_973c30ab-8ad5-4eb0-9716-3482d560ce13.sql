-- Fix listening analysis rubric by removing the 0-point clarity_accuracy criterion
UPDATE public.mus240_grading_rubrics
SET criteria = jsonb_build_object(
  'musical_features', jsonb_build_object(
    'description', 'Identifies specific musical elements and techniques',
    'points', 4
  ),
  'historical_context', jsonb_build_object(
    'description', 'Explains historical and cultural context',
    'points', 3
  ),
  'genre_identification', jsonb_build_object(
    'description', 'Correctly identifies musical genre/style',
    'points', 3
  )
)
WHERE question_type = 'listening_analysis' 
AND question_id = 'excerpt_analysis';