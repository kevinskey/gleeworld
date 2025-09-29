-- Create rubric for journal assignments (lj1, lj2, etc.)
INSERT INTO mus240_grading_rubrics (question_type, question_id, criteria, total_points, created_by)
VALUES (
  'journal', 
  'journal_assignment',
  '{
    "content_understanding": {
      "description": "Demonstrates clear understanding of musical concepts and context",
      "points": 4
    },
    "critical_analysis": {
      "description": "Provides thoughtful analysis and personal reflection on the material",
      "points": 3
    },
    "writing_quality": {
      "description": "Clear, well-organized writing with proper grammar and structure",
      "points": 2
    },
    "requirements_met": {
      "description": "Meets word count (250-300 words) and assignment requirements",
      "points": 1
    }
  }'::jsonb,
  10,
  (SELECT id FROM auth.users LIMIT 1)
);