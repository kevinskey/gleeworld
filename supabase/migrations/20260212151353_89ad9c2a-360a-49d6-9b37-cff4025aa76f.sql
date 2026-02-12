
-- Insert rubric for "The Singing Slave" assignment
INSERT INTO gw_universal_rubrics (id, name, description, criteria, total_points)
VALUES (
  'b2000000-0000-0000-0000-000000000010',
  'The Singing Slave Rubric',
  'Rubric for evaluating reflective essays on how enslaved people used singing for survival, freedom, and cultural expression.',
  '[
    {"id": "historical_accuracy", "name": "Historical Accuracy & Factual Evidence", "description": "Accurate use of factual elements learned in class about slavery, music history, and the role of singing in enslaved communities. References specific genres, styles, and cultural developments.", "max_points": 25, "display_order": 1},
    {"id": "thesis_argument", "name": "Thesis & Argument Development", "description": "Clear thesis addressing how the slave sang his way to freedom. Well-developed argument with logical progression and persuasive reasoning.", "max_points": 25, "display_order": 2},
    {"id": "cultural_connection", "name": "Cultural & Genre References", "description": "Meaningful references to known genres (spirituals, work songs, field hollers, blues, gospel, etc.), musical styles, cultural context, and their development over time.", "max_points": 20, "display_order": 3},
    {"id": "contemporary_analysis", "name": "Contemporary Analysis", "description": "Thoughtful engagement with the question of whether we can still sing our way to freedom in 2026. Connects historical patterns to present-day realities.", "max_points": 15, "display_order": 4},
    {"id": "writing_quality", "name": "Writing Quality & Clarity", "description": "Clear, coherent writing with proper grammar, logical structure, and academic tone. Demonstrates genuine personal voice and reflection.", "max_points": 15, "display_order": 5}
  ]'::jsonb,
  100
);

-- Link rubric to "The Singing Slave" assignment
UPDATE gw_course_assignments 
SET rubric_id = 'b2000000-0000-0000-0000-000000000010'
WHERE id = '18601d26-4600-4b5d-8023-b51fdf862157';
