
INSERT INTO gw_universal_rubrics (id, name, description, total_points, course_id, is_visible_before_submission, is_visible_after_grading, criteria)
VALUES (
  'b2000000-0000-0000-0000-000000000020',
  'Review a Blues Album Rubric',
  'Rubric for the "Review a Blues Album" assignment in MUS 240. Students select a blues album, demonstrate active listening informed by the Blues module, and write a thoughtful review that connects musical elements to historical and cultural context. 20 points total.',
  20,
  '23c4ee3c-7bbb-4534-8c0a-eecd88298d37',
  true,
  true,
  '[
    {"id":"listening_depth","name":"Listening Depth & Musical Description","max_points":6,"display_order":1,"description":"A (6): Demonstrates careful, attentive listening. Accurately describes musical elements such as 12-bar blues form, call-and-response, blue notes, instrumentation, vocal style, and rhythmic feel. Uses terminology from the Blues module. B (5): Mostly accurate descriptions with minor gaps. C (4): Surface-level description; few musical details. D/F (0–3): Vague or no evidence of active listening."},
    {"id":"blues_knowledge","name":"Application of Blues Module Knowledge","max_points":5,"display_order":2,"description":"A (5): Clearly connects the album to concepts from the Blues module—identifies the subgenre (Delta, Chicago, Texas, etc.), references historical context, and shows understanding of the blues tradition. B (4): Some connections to module content but lacks depth. C (3): Minimal reference to what was learned in class. D/F (0–2): No evidence of applying course material."},
    {"id":"critical_opinion","name":"Critical Opinion & Album Review","max_points":4,"display_order":3,"description":"A (4): Provides an honest, well-supported positive or negative review. Explains *why* they feel the way they do using specific musical moments. B (3): States opinion but support is thin. C (2): Opinion present but generic or unsupported. D/F (0–1): No clear opinion or review given."},
    {"id":"album_selection","name":"Album Selection & Presentation","max_points":3,"display_order":4,"description":"A (3): Clearly identifies artist and album. Includes a working YouTube link. Explains why they chose this album/artist. B (2): Album identified and link provided but reasoning for choice is weak. C–F (0–1): Missing album info, broken/no link, or no rationale for selection."},
    {"id":"writing_quality","name":"Writing Quality & Completeness","max_points":2,"display_order":5,"description":"A (2): Well-organized, clear writing. Addresses all required topics (musical style, historic elements, type of blues, why this album, positive/negative review). B (1): Mostly complete but missing one topic or has notable writing issues. D/F (0): Incomplete, disorganized, or significantly below expectations."}
  ]'::jsonb
);

-- Link rubric to the assignment
UPDATE gw_course_assignments
SET rubric_id = 'b2000000-0000-0000-0000-000000000020'
WHERE id = 'ebc6c16b-309c-4054-aca3-fde186db3bf4';
