-- Run against a scratch DB with the assistant_course_builder bootstrap + this
-- feature's migration applied. Verifies quiz + question rows land in the exact
-- storage format the engine's grader compares against.
BEGIN;

-- minimal stand-ins for the quiz tables (mirror the real columns used)
CREATE TABLE IF NOT EXISTS gw_course_tests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid, title text, description text, test_type text, total_points int,
  is_published boolean, created_by uuid, tenant_id uuid);
CREATE TABLE IF NOT EXISTS gw_course_test_questions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid, position int, question_type text, prompt text, options jsonb,
  correct_answer jsonb, explanation text, points int, tenant_id uuid);
-- the RPC runs SECURITY INVOKER as the test role, so it needs table privileges
GRANT ALL ON gw_course_tests, gw_course_test_questions TO gw_test_authenticated;

SET LOCAL "test.uid" = '00000000-0000-0000-0000-000000000002';
SET LOCAL ROLE gw_test_authenticated;
DO $$ DECLARE r jsonb; BEGIN
  r := assistant_create_course('{
    "title":"Q Course","start_date":"2026-08-24","end_date":"2026-09-11",
    "meeting_patterns":[{"weekday":1,"start_time":"10:00","end_time":"10:50"}],
    "modules":[{"title":"Week 1","week_number":1,"assignments":[]}],
    "quizzes":[{"title":"Quiz 1","questions":[
      {"type":"multiple_choice","prompt":"Who?","choices":["Hogan","Johnson","Hairston"],"correct_index":0,"points":5},
      {"type":"true_false","prompt":"True?","correct_answer":true,"points":5}
    ]}]
  }'::jsonb);
  ASSERT (r->>'quiz_count')::int = 1, 'quiz_count';
END $$;
RESET ROLE;

DO $$ DECLARE mc gw_course_test_questions; tf gw_course_test_questions; t gw_course_tests; BEGIN
  SELECT * INTO t FROM gw_course_tests LIMIT 1;
  ASSERT t.is_published = false, 'quiz must be unpublished';
  ASSERT t.total_points = 10, 'total_points = sum of question points';
  SELECT * INTO mc FROM gw_course_test_questions WHERE question_type='multiple_choice';
  -- options are [{id:'a',text:'Hogan'},...]; correct_answer is the id string 'a'
  ASSERT mc.options->0->>'id' = 'a' AND mc.options->0->>'text' = 'Hogan', 'MC option shape';
  ASSERT mc.correct_answer = to_jsonb('a'::text), 'MC correct_answer is the option id';
  ASSERT mc.position = 0, 'MC position';
  SELECT * INTO tf FROM gw_course_test_questions WHERE question_type='true_false';
  ASSERT tf.options IS NULL AND tf.correct_answer = to_jsonb(true), 'TF options null + boolean correct_answer';
  ASSERT tf.position = 1, 'TF position';
END $$;

ROLLBACK;
