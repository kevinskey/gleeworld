-- Add missing rubrics for midterm term definitions
INSERT INTO mus240_grading_rubrics (question_type, question_id, criteria, total_points) VALUES 
('term_definition', 'blues', '{
  "clarity_accuracy": {"points": 1, "description": "Clear writing and factual accuracy"},
  "musical_elements": {"points": 3, "description": "Identifies key musical characteristics (12-bar structure, blue notes, call-response)"},
  "historical_context": {"points": 3, "description": "Correctly identifies time period and cultural context"},
  "cultural_significance": {"points": 3, "description": "Explains role in African American expression and influence on other genres"}
}', 10),

('term_definition', 'ragtime', '{
  "clarity_accuracy": {"points": 1, "description": "Clear writing and factual accuracy"},
  "musical_elements": {"points": 3, "description": "Identifies key musical characteristics (syncopation, piano style, march influences)"},
  "historical_context": {"points": 3, "description": "Correctly identifies time period and cultural context"},
  "cultural_significance": {"points": 3, "description": "Explains significance as early popular African American music form"}
}', 10),

('term_definition', 'swing', '{
  "clarity_accuracy": {"points": 1, "description": "Clear writing and factual accuracy"},
  "musical_elements": {"points": 3, "description": "Identifies key musical characteristics (swing rhythm, big band instrumentation, improvisation)"},
  "historical_context": {"points": 3, "description": "Correctly identifies time period and cultural context"},
  "cultural_significance": {"points": 3, "description": "Explains role in jazz development and cultural impact"}
}', 10),

('term_definition', 'negro_spiritual', '{
  "clarity_accuracy": {"points": 1, "description": "Clear writing and factual accuracy"},
  "musical_elements": {"points": 3, "description": "Identifies key musical characteristics (call-response, African elements, coded messages)"},
  "historical_context": {"points": 3, "description": "Correctly identifies time period and slavery context"},
  "cultural_significance": {"points": 3, "description": "Explains spiritual significance and resistance functions"}
}', 10);