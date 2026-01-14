-- Update MUS 210 grading breakdown to total 100%
-- Non-Touring Choir Practicum: 30% → 15%
-- Add History & Literature: 15%

UPDATE gw_syllabus_templates
SET grading_breakdown = '[
  {"item": "Technique Juries", "percentage": 20},
  {"item": "Non-Touring Choir Practicum", "percentage": 15},
  {"item": "Weekly Videos & Score Uploads", "percentage": 20},
  {"item": "Final 30-minute Jury", "percentage": 30},
  {"item": "History & Literature", "percentage": 15}
]'::jsonb,
    updated_at = now()
WHERE course_id = '2026c613-bda7-487a-a5d9-91e57c26a741';