-- Ensure TAs can view and manage MUS240 polls, and activate Genesis as TA

-- 1) Enable RLS and add TA/admin policies for mus240_polls
ALTER TABLE public.mus240_polls ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY mus240_polls_select_active_or_ta_admin
  ON public.mus240_polls
  FOR SELECT
  USING (
    -- Anyone can see active polls
    is_active = true
    -- Admins and TAs can see all polls
    OR public.is_current_user_admin_safe()
    OR EXISTS (
      SELECT 1 FROM public.course_teaching_assistants cta
      WHERE cta.user_id = auth.uid()
        AND cta.course_code = 'MUS240'
        AND cta.is_active = true
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

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

-- 2) Ensure Genesis is an active TA for MUS240
-- Genesis user_id from auth logs: 44a30d6c-eefd-4144-a0b0-b3618ec1b7a5
DO $$ BEGIN
  -- Reactivate existing row if present
  UPDATE public.course_teaching_assistants
  SET is_active = true, updated_at = now()
  WHERE user_id = '44a30d6c-eefd-4144-a0b0-b3618ec1b7a5'::uuid
    AND course_code = 'MUS240';

  -- Insert if no row exists
  IF NOT EXISTS (
    SELECT 1 FROM public.course_teaching_assistants
    WHERE user_id = '44a30d6c-eefd-4144-a0b0-b3618ec1b7a5'::uuid
      AND course_code = 'MUS240'
  ) THEN
    INSERT INTO public.course_teaching_assistants (user_id, course_code, is_active, assigned_by, assigned_at, notes)
    VALUES ('44a30d6c-eefd-4144-a0b0-b3618ec1b7a5'::uuid, 'MUS240', true, NULL, now(), 'Added via migration to enable TA poll access');
  END IF;
END $$;