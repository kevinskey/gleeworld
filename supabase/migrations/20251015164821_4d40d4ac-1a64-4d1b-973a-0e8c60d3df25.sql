-- Fix RLS for mus240_poll_responses comparing uuid to text properly

-- Ensure RLS is enabled
ALTER TABLE public.mus240_poll_responses ENABLE ROW LEVEL SECURITY;

-- Create SELECT policy allowing own responses (student_id is text) and admin/TA access
DO $$ BEGIN
  CREATE POLICY mus240_poll_responses_select_admin_ta_or_own
  ON public.mus240_poll_responses
  FOR SELECT
  USING (
    auth.uid()::text = student_id
    OR public.is_current_user_admin_safe()
    OR EXISTS (
      SELECT 1 FROM public.course_teaching_assistants cta
      WHERE cta.user_id = auth.uid()
        AND cta.course_code = 'MUS240'
        AND cta.is_active = true
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow students to insert their own responses
DO $$ BEGIN
  CREATE POLICY mus240_poll_responses_insert_own
  ON public.mus240_poll_responses
  FOR INSERT
  WITH CHECK (auth.uid()::text = student_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow students to update their own responses (if applicable)
DO $$ BEGIN
  CREATE POLICY mus240_poll_responses_update_own
  ON public.mus240_poll_responses
  FOR UPDATE
  USING (auth.uid()::text = student_id)
  WITH CHECK (auth.uid()::text = student_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;