-- Migrate existing course_discussions to discussion_prompts for MUS 240
-- This populates the empty discussion_prompts table that the instructor console uses

INSERT INTO discussion_prompts (
  id,
  course_id,
  title,
  prompt_text,
  individual_due_at,
  peer_due_at,
  synthesis_due_at,
  word_min,
  word_max,
  current_phase,
  is_locked,
  created_by,
  created_at,
  updated_at
)
SELECT 
  cd.id,
  '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'::uuid, -- MUS 240 course_id
  cd.title,
  COALESCE(cd.content, 'Discussion prompt for ' || cd.title),
  cd.due_date, -- individual_due_at = due_date
  cd.due_date + interval '3 days', -- peer_due_at = 3 days after
  cd.due_date + interval '7 days', -- synthesis_due_at = 7 days after
  100, -- word_min
  500, -- word_max
  'individual_open', -- current_phase (valid value)
  COALESCE(cd.is_locked, false),
  cd.created_by,
  cd.created_at,
  cd.updated_at
FROM course_discussions cd
WHERE cd.course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'
ON CONFLICT (id) DO NOTHING;