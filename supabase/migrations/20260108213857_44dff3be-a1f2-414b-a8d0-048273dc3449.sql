-- Insert learning objectives for MUS 070 Glee Club
INSERT INTO gw_learning_objectives (syllabus_id, course_id, objective_text, category, bloom_level, position, is_measurable) VALUES
('9f8b646b-4a44-4952-b222-d69c9f8e9ade', 'a0000000-0000-0000-0000-000000000070', 'Demonstrate proper vocal technique including breath support, posture, and resonance.', 'skills', 'apply', 0, true),
('9f8b646b-4a44-4952-b222-d69c9f8e9ade', 'a0000000-0000-0000-0000-000000000070', 'Perform choral literature at a high artistic level in various styles and languages.', 'skills', 'apply', 1, true),
('9f8b646b-4a44-4952-b222-d69c9f8e9ade', 'a0000000-0000-0000-0000-000000000070', 'Develop sight-reading skills through regular practice and quizzes.', 'skills', 'apply', 2, true),
('9f8b646b-4a44-4952-b222-d69c9f8e9ade', 'a0000000-0000-0000-0000-000000000070', 'Understand and apply musical terminology, dynamics, and articulation markings.', 'knowledge', 'understand', 3, true),
('9f8b646b-4a44-4952-b222-d69c9f8e9ade', 'a0000000-0000-0000-0000-000000000070', 'Blend effectively within voice sections and the full ensemble.', 'skills', 'apply', 4, true),
('9f8b646b-4a44-4952-b222-d69c9f8e9ade', 'a0000000-0000-0000-0000-000000000070', 'Demonstrate professional stage presence and concert etiquette.', 'skills', 'apply', 5, true),
('9f8b646b-4a44-4952-b222-d69c9f8e9ade', 'a0000000-0000-0000-0000-000000000070', 'Represent Spelman College with excellence in public performances and tours.', 'attitude', 'apply', 6, true),
('9f8b646b-4a44-4952-b222-d69c9f8e9ade', 'a0000000-0000-0000-0000-000000000070', 'Appreciate and interpret music from diverse cultural backgrounds including the African American choral tradition.', 'knowledge', 'understand', 7, true),
('9f8b646b-4a44-4952-b222-d69c9f8e9ade', 'a0000000-0000-0000-0000-000000000070', 'Memorize concert repertoire accurately and expressively.', 'skills', 'apply', 8, true),
('9f8b646b-4a44-4952-b222-d69c9f8e9ade', 'a0000000-0000-0000-0000-000000000070', 'Develop teamwork and collaborative skills through ensemble participation.', 'attitude', 'apply', 9, true);

-- Insert course requirements for MUS 070 Glee Club
INSERT INTO gw_course_requirements (syllabus_id, requirement_text, weight_percentage, position) VALUES
('9f8b646b-4a44-4952-b222-d69c9f8e9ade', 'Attend all scheduled rehearsals and arrive on time with prepared materials.', 0, 0),
('9f8b646b-4a44-4952-b222-d69c9f8e9ade', 'Participate actively in all rehearsals with proper focus and engagement.', 15, 1),
('9f8b646b-4a44-4952-b222-d69c9f8e9ade', 'Complete weekly sight-singing quizzes (minimum 2 per week).', 15, 2),
('9f8b646b-4a44-4952-b222-d69c9f8e9ade', 'Memorize all concert repertoire by designated deadlines.', 10, 3),
('9f8b646b-4a44-4952-b222-d69c9f8e9ade', 'Perform in all scheduled concerts with proper concert attire.', 50, 4),
('9f8b646b-4a44-4952-b222-d69c9f8e9ade', 'Maintain appropriate concert attire in good condition.', 5, 5),
('9f8b646b-4a44-4952-b222-d69c9f8e9ade', 'Participate in tour activities and community performances as scheduled.', 5, 6);