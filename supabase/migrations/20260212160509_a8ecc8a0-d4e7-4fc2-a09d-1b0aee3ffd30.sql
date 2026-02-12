
-- Insert the Blues Album Review Rubric
INSERT INTO gw_universal_rubrics (id, name, description, total_points, course_id, is_visible_before_submission, is_visible_after_grading, criteria)
VALUES (
  'b2000000-0000-0000-0000-000000000001',
  'Blues Album Review Rubric',
  'Rubric for the "Review a Blues Album" assignment in MUS 240: Survey of African American Music. 100 points total across 5 categories. Optional Bonus (+5): Creative framing (period radio voice, interview format, etc.) or especially strong musical comparison.',
  100,
  '23c4ee3c-7bbb-4534-8c0a-eecd88298d37',
  true,
  true,
  '[
    {"id":"musical_listening","name":"Musical Listening & Description","max_points":40,"display_order":1,"description":"A (36–40): Clearly and accurately describes musical elements. Uses appropriate terminology (syncopation, improvisation, form, instrumentation). Demonstrates attentive listening. B (32–35): Mostly accurate descriptions. Minor gaps in terminology or depth. C (28–31): Basic description. Limited musical insight. D/F (0–27): Vague, incorrect, or minimal musical analysis."},
    {"id":"musical_examples","name":"Use of Musical Examples","max_points":20,"display_order":2,"description":"A (18–20): At least 3 well-integrated excerpts. Music supports analysis. B (16–17): 2–3 excerpts. Limited explanation. C (14–15): Fewer excerpts or poorly integrated. D/F (0–13): No clear musical examples."},
    {"id":"organization","name":"Organization & Structure","max_points":15,"display_order":3,"description":"A (14–15): Clear introduction, development, and conclusion. Logical flow. B (12–13): Mostly organized. Minor structural issues. C (10–11): Somewhat disorganized. D/F (0–9): No clear structure."},
    {"id":"cultural_context","name":"Cultural Context","max_points":15,"display_order":4,"description":"A (14–15): Accurate, concise, relevant context. Connects music to broader culture. B (12–13): Basic context provided. C (10–11): Minimal or underdeveloped context. D/F (0–9): Inaccurate or missing context."},
    {"id":"technical_quality","name":"Technical Quality & Timing","max_points":10,"display_order":5,"description":"A (9–10): Clear audio, balanced levels, within time limit. B (7–8): Minor technical issues. C (5–6): Noticeable issues. D/F (0–4): Major technical problems or outside time range."}
  ]'::jsonb
);

-- Update the assignment to use the new rubric
UPDATE gw_course_assignments
SET rubric_id = 'b2000000-0000-0000-0000-000000000001'
WHERE id = 'ebc6c16b-309c-4054-aca3-fde186db3bf4';
