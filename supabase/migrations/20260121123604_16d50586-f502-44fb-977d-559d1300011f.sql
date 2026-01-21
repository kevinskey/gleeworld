-- Create comprehensive quantitative rubrics for all assignment types
-- Using a NULL course_id means these are global/template rubrics available to all courses

-- Writing Assignment Rubric (100 points total)
INSERT INTO gw_universal_rubrics (id, course_id, name, description, total_points, criteria, is_visible_before_submission, is_visible_after_grading)
VALUES (
  'a1000000-0000-0000-0000-000000000001',
  NULL,
  'Writing Assignment Rubric',
  'Comprehensive quantitative rubric for evaluating written assignments including essays, papers, and written responses',
  100,
  '[
    {"id": "thesis", "name": "Thesis & Central Argument", "description": "Clear, focused thesis statement with well-developed central argument that addresses the prompt directly", "max_points": 25, "display_order": 1},
    {"id": "evidence", "name": "Evidence & Support", "description": "Strong use of relevant evidence, examples, and sources to support arguments with proper citations", "max_points": 25, "display_order": 2},
    {"id": "organization", "name": "Organization & Structure", "description": "Logical flow of ideas with clear introduction, body paragraphs, and conclusion; effective transitions", "max_points": 20, "display_order": 3},
    {"id": "analysis", "name": "Critical Analysis", "description": "Demonstrates deep thinking, insightful interpretation, and original analysis beyond summary", "max_points": 15, "display_order": 4},
    {"id": "mechanics", "name": "Grammar & Mechanics", "description": "Proper grammar, spelling, punctuation, and adherence to academic writing conventions", "max_points": 15, "display_order": 5}
  ]'::jsonb,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  total_points = EXCLUDED.total_points,
  criteria = EXCLUDED.criteria,
  updated_at = now();

-- Listening Journal Rubric (100 points total)
INSERT INTO gw_universal_rubrics (id, course_id, name, description, total_points, criteria, is_visible_before_submission, is_visible_after_grading)
VALUES (
  'a1000000-0000-0000-0000-000000000002',
  NULL,
  'Listening Journal Rubric',
  'Quantitative rubric for evaluating music listening journal entries and responses',
  100,
  '[
    {"id": "musical_elements", "name": "Musical Elements Identification", "description": "Accurate identification and description of musical elements (melody, rhythm, harmony, texture, form, timbre)", "max_points": 30, "display_order": 1},
    {"id": "cultural_context", "name": "Cultural & Historical Context", "description": "Demonstrates understanding of the music cultural, historical, and social significance", "max_points": 25, "display_order": 2},
    {"id": "personal_response", "name": "Personal Response & Reflection", "description": "Thoughtful personal engagement with the music, including emotional and intellectual responses", "max_points": 20, "display_order": 3},
    {"id": "connections", "name": "Connections & Comparisons", "description": "Makes meaningful connections to course material, other music, or personal experiences", "max_points": 15, "display_order": 4},
    {"id": "writing_quality", "name": "Writing Quality", "description": "Clear, coherent writing with proper grammar and sufficient depth of response", "max_points": 10, "display_order": 5}
  ]'::jsonb,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  total_points = EXCLUDED.total_points,
  criteria = EXCLUDED.criteria,
  updated_at = now();

-- Reflection Paper Rubric (100 points total)
INSERT INTO gw_universal_rubrics (id, course_id, name, description, total_points, criteria, is_visible_before_submission, is_visible_after_grading)
VALUES (
  'a1000000-0000-0000-0000-000000000003',
  NULL,
  'Reflection Paper Rubric',
  'Quantitative rubric for evaluating student reflection papers and personal responses',
  100,
  '[
    {"id": "depth", "name": "Depth of Reflection", "description": "Demonstrates deep, genuine reflection with meaningful insights about personal growth or learning", "max_points": 30, "display_order": 1},
    {"id": "connection", "name": "Connection to Course Content", "description": "Effectively connects personal experiences and reflections to course concepts, readings, or discussions", "max_points": 25, "display_order": 2},
    {"id": "self_awareness", "name": "Self-Awareness & Growth", "description": "Shows honest self-assessment and identifies areas of personal growth or areas for improvement", "max_points": 20, "display_order": 3},
    {"id": "specificity", "name": "Specificity & Examples", "description": "Uses specific examples and concrete details to illustrate points rather than vague generalizations", "max_points": 15, "display_order": 4},
    {"id": "presentation", "name": "Presentation & Clarity", "description": "Well-organized, clearly written, and free of grammatical errors", "max_points": 10, "display_order": 5}
  ]'::jsonb,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  total_points = EXCLUDED.total_points,
  criteria = EXCLUDED.criteria,
  updated_at = now();

-- Video Submission Rubric (100 points total)
INSERT INTO gw_universal_rubrics (id, course_id, name, description, total_points, criteria, is_visible_before_submission, is_visible_after_grading)
VALUES (
  'a1000000-0000-0000-0000-000000000004',
  NULL,
  'Video Submission Rubric',
  'Quantitative rubric for evaluating video presentations, performances, and multimedia submissions',
  100,
  '[
    {"id": "content", "name": "Content Quality", "description": "Demonstrates mastery of subject matter with accurate, relevant, and substantive content", "max_points": 30, "display_order": 1},
    {"id": "presentation", "name": "Presentation Skills", "description": "Clear delivery, appropriate pacing, eye contact, and professional demeanor", "max_points": 25, "display_order": 2},
    {"id": "preparation", "name": "Preparation & Organization", "description": "Evidence of thorough preparation with logical structure and well-organized material", "max_points": 20, "display_order": 3},
    {"id": "production", "name": "Technical Quality", "description": "Good audio/video quality, appropriate lighting, and professional production values", "max_points": 15, "display_order": 4},
    {"id": "creativity", "name": "Creativity & Engagement", "description": "Creative approach that engages the audience and demonstrates original thinking", "max_points": 10, "display_order": 5}
  ]'::jsonb,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  total_points = EXCLUDED.total_points,
  criteria = EXCLUDED.criteria,
  updated_at = now();

-- Essay Rubric (100 points total)
INSERT INTO gw_universal_rubrics (id, course_id, name, description, total_points, criteria, is_visible_before_submission, is_visible_after_grading)
VALUES (
  'a1000000-0000-0000-0000-000000000005',
  NULL,
  'Essay Rubric',
  'Comprehensive quantitative rubric for formal academic essays',
  100,
  '[
    {"id": "thesis", "name": "Thesis Statement", "description": "Clear, arguable thesis that takes a specific position and provides a roadmap for the essay", "max_points": 20, "display_order": 1},
    {"id": "argument", "name": "Argument Development", "description": "Well-developed arguments with logical reasoning and persuasive analysis", "max_points": 25, "display_order": 2},
    {"id": "sources", "name": "Use of Sources", "description": "Effective integration of credible sources with proper citations and bibliography", "max_points": 20, "display_order": 3},
    {"id": "structure", "name": "Essay Structure", "description": "Clear introduction, coherent body paragraphs with topic sentences, and strong conclusion", "max_points": 20, "display_order": 4},
    {"id": "style", "name": "Style & Conventions", "description": "Academic tone, varied sentence structure, proper grammar, and adherence to formatting requirements", "max_points": 15, "display_order": 5}
  ]'::jsonb,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  total_points = EXCLUDED.total_points,
  criteria = EXCLUDED.criteria,
  updated_at = now();

-- Exercise Rubric (100 points total)
INSERT INTO gw_universal_rubrics (id, course_id, name, description, total_points, criteria, is_visible_before_submission, is_visible_after_grading)
VALUES (
  'a1000000-0000-0000-0000-000000000006',
  NULL,
  'Exercise Rubric',
  'Quantitative rubric for evaluating class exercises and practice assignments',
  100,
  '[
    {"id": "accuracy", "name": "Accuracy & Correctness", "description": "Correct answers and accurate completion of required tasks", "max_points": 40, "display_order": 1},
    {"id": "completeness", "name": "Completeness", "description": "All parts of the exercise are completed as instructed", "max_points": 30, "display_order": 2},
    {"id": "effort", "name": "Effort & Engagement", "description": "Evidence of genuine effort and engagement with the material", "max_points": 20, "display_order": 3},
    {"id": "timeliness", "name": "Timeliness", "description": "Submitted on time and follows submission guidelines", "max_points": 10, "display_order": 4}
  ]'::jsonb,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  total_points = EXCLUDED.total_points,
  criteria = EXCLUDED.criteria,
  updated_at = now();

-- Now link existing assignments to appropriate rubrics based on assignment_type
UPDATE gw_course_assignments
SET rubric_id = 'a1000000-0000-0000-0000-000000000001'
WHERE assignment_type = 'writing' AND rubric_id IS NULL;

UPDATE gw_course_assignments
SET rubric_id = 'a1000000-0000-0000-0000-000000000002'
WHERE assignment_type = 'listening_journal' AND rubric_id IS NULL;

UPDATE gw_course_assignments
SET rubric_id = 'a1000000-0000-0000-0000-000000000003'
WHERE assignment_type = 'reflection_paper' AND rubric_id IS NULL;

UPDATE gw_course_assignments
SET rubric_id = 'a1000000-0000-0000-0000-000000000004'
WHERE assignment_type = 'video' AND rubric_id IS NULL;

UPDATE gw_course_assignments
SET rubric_id = 'a1000000-0000-0000-0000-000000000005'
WHERE assignment_type = 'essay' AND rubric_id IS NULL;

UPDATE gw_course_assignments
SET rubric_id = 'a1000000-0000-0000-0000-000000000006'
WHERE assignment_type = 'exercise' AND rubric_id IS NULL;