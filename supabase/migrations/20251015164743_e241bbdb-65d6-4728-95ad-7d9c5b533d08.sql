-- Enable RLS and add TA/admin access policies for MUS240 polls and responses

-- Ensure row level security is enabled on mus240_polls
ALTER TABLE public.mus240_polls ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view active polls, and allow admins/TAs to view all polls
DO $$ BEGIN
  CREATE POLICY mus240_polls_select_active_or_ta_admin
  ON public.mus240_polls
  FOR SELECT
  USING (
    is_active = true
    OR public.is_current_user_admin_safe()
    OR EXISTS (
      SELECT 1 FROM public.course_teaching_assistants cta
      WHERE cta.user_id = auth.uid()
        AND cta.course_code = 'MUS240'
        AND cta.is_active = true
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow admins and active MUS240 TAs to create polls
DO $$ BEGIN
  CREATE POLICY mus240_polls_insert_ta_admin
  ON public.mus240_polls
  FOR INSERT
  WITH CHECK (
    public.is_current_user_admin_safe()
    OR EXISTS (
      SELECT 1 FROM public.course_teaching_assistants cta
      WHERE cta.user_id = auth.uid()
        AND cta.course_code = 'MUS240'
        AND cta.is_active = true
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow admins and active MUS240 TAs to update polls (e.g., activate/deactivate)
DO $$ BEGIN
  CREATE POLICY mus240_polls_update_ta_admin
  ON public.mus240_polls
  FOR UPDATE
  USING (
    public.is_current_user_admin_safe()
    OR EXISTS (
      SELECT 1 FROM public.course_teaching_assistants cta
      WHERE cta.user_id = auth.uid()
        AND cta.course_code = 'MUS240'
        AND cta.is_active = true
    )
  )
  WITH CHECK (
    public.is_current_user_admin_safe()
    OR EXISTS (
      SELECT 1 FROM public.course_teaching_assistants cta
      WHERE cta.user_id = auth.uid()
        AND cta.course_code = 'MUS240'
        AND cta.is_active = true
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow admins and active MUS240 TAs to delete polls
DO $$ BEGIN
  CREATE POLICY mus240_polls_delete_ta_admin
  ON public.mus240_polls
  FOR DELETE
  USING (
    public.is_current_user_admin_safe()
    OR EXISTS (
      SELECT 1 FROM public.course_teaching_assistants cta
      WHERE cta.user_id = auth.uid()
        AND cta.course_code = 'MUS240'
        AND cta.is_active = true
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Ensure row level security is enabled on mus240_poll_responses
ALTER TABLE public.mus240_poll_responses ENABLE ROW LEVEL SECURITY;

-- Allow students to view their own responses and admins/TAs to view all
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