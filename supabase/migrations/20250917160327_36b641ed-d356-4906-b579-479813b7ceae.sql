-- Align mus240_poll_responses schema and RLS with triggers and upsert behavior

-- 1) Ensure updated_at column exists so BEFORE UPDATE trigger can set it
ALTER TABLE public.mus240_poll_responses
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2) Allow authenticated users to update their own responses (needed for upsert)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'mus240_poll_responses' 
      AND policyname = 'mus240_poll_responses_update'
  ) THEN
    CREATE POLICY "mus240_poll_responses_update"
    ON public.mus240_poll_responses
    FOR UPDATE
    TO public
    USING (
      auth.uid() IS NOT NULL AND (
        student_id = auth.uid()::text OR
        EXISTS (
          SELECT 1 FROM public.gw_profiles gp
          WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)
        )
      )
    );
  END IF;
END $$;