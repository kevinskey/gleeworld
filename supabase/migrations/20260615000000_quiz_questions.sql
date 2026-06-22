-- Phase 7: quiz/test questions + attempts + answers.
--
-- Three tables: questions (the test bank), attempts (one row per student
-- per test session), answers (per-question response within an attempt).
-- Auto-grading happens client-side for MC/T-F/multi-select; short-answer
-- can be flagged correct if the response matches an accepted string list,
-- otherwise the instructor grades manually.

CREATE TABLE IF NOT EXISTS public.gw_course_test_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.gw_course_tests(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  question_type text NOT NULL CHECK (question_type IN ('multiple_choice','multi_select','true_false','short_answer')),
  prompt text NOT NULL,
  options jsonb,           -- for MC/multi-select: [{id:'a',text:'...'}, ...]
  correct_answer jsonb,    -- mc: 'a', multi_select: ['a','c'], t/f: true/false, short: ['accepted', 'variations']
  explanation text,
  points int NOT NULL DEFAULT 1,
  tenant_id uuid DEFAULT current_tenant_id(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gw_course_test_questions_test_idx ON public.gw_course_test_questions(test_id, position);

CREATE TABLE IF NOT EXISTS public.gw_course_test_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.gw_course_tests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  score int,
  max_score int,
  is_graded boolean NOT NULL DEFAULT false,
  attempt_number int NOT NULL DEFAULT 1,
  tenant_id uuid DEFAULT current_tenant_id(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (test_id, user_id, attempt_number)
);
CREATE INDEX IF NOT EXISTS gw_course_test_attempts_test_user_idx ON public.gw_course_test_attempts(test_id, user_id);

CREATE TABLE IF NOT EXISTS public.gw_course_test_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.gw_course_test_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.gw_course_test_questions(id) ON DELETE CASCADE,
  answer jsonb,
  is_correct boolean,
  points_earned int,
  graded_at timestamptz,
  graded_by uuid,
  tenant_id uuid DEFAULT current_tenant_id(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_id)
);

-- ── RLS ──

ALTER TABLE public.gw_course_test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_course_test_attempts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_course_test_answers   ENABLE ROW LEVEL SECURITY;

-- tenant_isolation on all three
DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_course_test_questions;
CREATE POLICY tenant_isolation_restrict ON public.gw_course_test_questions
  AS RESTRICTIVE USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_course_test_attempts;
CREATE POLICY tenant_isolation_restrict ON public.gw_course_test_attempts
  AS RESTRICTIVE USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_course_test_answers;
CREATE POLICY tenant_isolation_restrict ON public.gw_course_test_answers
  AS RESTRICTIVE USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id());

-- Questions: instructor manages, enrolled students read (correct_answer
-- omitted by API column select on the student path)
DROP POLICY IF EXISTS "Instructor manages questions" ON public.gw_course_test_questions;
CREATE POLICY "Instructor manages questions" ON public.gw_course_test_questions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_course_tests t
      JOIN public.gw_courses c ON c.id = t.course_id
      WHERE t.id = gw_course_test_questions.test_id
        AND (c.instructor_id = auth.uid() OR c.created_by = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin OR p.is_super_admin))
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gw_course_tests t
      JOIN public.gw_courses c ON c.id = t.course_id
      WHERE t.id = gw_course_test_questions.test_id
        AND (c.instructor_id = auth.uid() OR c.created_by = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin OR p.is_super_admin))
  );

DROP POLICY IF EXISTS "Enrolled students see questions" ON public.gw_course_test_questions;
CREATE POLICY "Enrolled students see questions" ON public.gw_course_test_questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.gw_course_tests t
      JOIN public.gw_course_enrollments e ON e.course_id = t.course_id
      WHERE t.id = gw_course_test_questions.test_id
        AND t.is_published = true
        AND e.user_id = auth.uid()
        AND e.enrollment_status IN ('enrolled','active','in_progress','registered')
    )
  );

-- Attempts: student owns their own; instructor of course sees all
DROP POLICY IF EXISTS "Students manage own attempts" ON public.gw_course_test_attempts;
CREATE POLICY "Students manage own attempts" ON public.gw_course_test_attempts
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Instructor reads course attempts" ON public.gw_course_test_attempts;
CREATE POLICY "Instructor reads course attempts" ON public.gw_course_test_attempts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_course_tests t
      JOIN public.gw_courses c ON c.id = t.course_id
      WHERE t.id = gw_course_test_attempts.test_id
        AND (c.instructor_id = auth.uid() OR c.created_by = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin OR p.is_super_admin))
  );

-- Answers: student owns answers within their own attempts
DROP POLICY IF EXISTS "Students manage own answers" ON public.gw_course_test_answers;
CREATE POLICY "Students manage own answers" ON public.gw_course_test_answers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_course_test_attempts a
      WHERE a.id = gw_course_test_answers.attempt_id
        AND a.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gw_course_test_attempts a
      WHERE a.id = gw_course_test_answers.attempt_id
        AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Instructor reads course answers" ON public.gw_course_test_answers;
CREATE POLICY "Instructor reads course answers" ON public.gw_course_test_answers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.gw_course_test_attempts a
      JOIN public.gw_course_tests t ON t.id = a.test_id
      JOIN public.gw_courses c ON c.id = t.course_id
      WHERE a.id = gw_course_test_answers.attempt_id
        AND (c.instructor_id = auth.uid() OR c.created_by = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin OR p.is_super_admin))
  );

-- ── Auto-grading RPC ──
--
-- Called after a student submits all answers. Scores MC, T/F, multi-select,
-- and short-answer (case-insensitive against accepted-strings list).
-- Anything that can't be auto-graded stays is_correct=null + points_earned=null
-- so the instructor can grade it manually later.

CREATE OR REPLACE FUNCTION public.grade_test_attempt(p_attempt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_attempt RECORD;
  v_question RECORD;
  v_answer RECORD;
  v_total int := 0;
  v_max int := 0;
  v_is_correct boolean;
  v_points_earned int;
BEGIN
  SELECT * INTO v_attempt FROM gw_course_test_attempts WHERE id = p_attempt_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'attempt_not_found';
  END IF;

  FOR v_question IN
    SELECT * FROM gw_course_test_questions WHERE test_id = v_attempt.test_id
  LOOP
    v_max := v_max + v_question.points;
    SELECT * INTO v_answer FROM gw_course_test_answers
     WHERE attempt_id = p_attempt_id AND question_id = v_question.id;

    v_is_correct := NULL;
    v_points_earned := NULL;

    IF FOUND AND v_answer.answer IS NOT NULL THEN
      IF v_question.question_type = 'multiple_choice' THEN
        v_is_correct := (v_answer.answer = v_question.correct_answer);
      ELSIF v_question.question_type = 'true_false' THEN
        v_is_correct := (v_answer.answer = v_question.correct_answer);
      ELSIF v_question.question_type = 'multi_select' THEN
        -- Sets of strings; order-independent.
        v_is_correct := (
          (SELECT array_agg(x ORDER BY x) FROM jsonb_array_elements_text(v_answer.answer) AS x)
          =
          (SELECT array_agg(x ORDER BY x) FROM jsonb_array_elements_text(v_question.correct_answer) AS x)
        );
      ELSIF v_question.question_type = 'short_answer' THEN
        -- correct_answer is an array of accepted strings; case-insensitive match.
        v_is_correct := (
          lower(v_answer.answer::text) IN (
            SELECT lower(x) FROM jsonb_array_elements_text(v_question.correct_answer) AS x
          )
        );
      END IF;

      v_points_earned := CASE WHEN v_is_correct THEN v_question.points ELSE 0 END;
      v_total := v_total + COALESCE(v_points_earned, 0);

      UPDATE gw_course_test_answers
         SET is_correct = v_is_correct,
             points_earned = v_points_earned,
             graded_at = now(),
             updated_at = now()
       WHERE attempt_id = p_attempt_id AND question_id = v_question.id;
    END IF;
  END LOOP;

  UPDATE gw_course_test_attempts
     SET score = v_total,
         max_score = v_max,
         is_graded = true,
         submitted_at = COALESCE(submitted_at, now()),
         updated_at = now()
   WHERE id = p_attempt_id;

  RETURN jsonb_build_object('score', v_total, 'max_score', v_max);
END;
$$;

GRANT EXECUTE ON FUNCTION public.grade_test_attempt(uuid) TO authenticated;
