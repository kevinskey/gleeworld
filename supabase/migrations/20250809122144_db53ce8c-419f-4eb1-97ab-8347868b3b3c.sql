-- Fix policy creation using pg_policies.policyname
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gw_study_scores' AND policyname = 'Study score owner manage'
  ) THEN
    CREATE POLICY "Study score owner manage"
    ON public.gw_study_scores
    FOR ALL
    TO authenticated
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gw_study_scores' AND policyname = 'Collaborators can view shared study scores'
  ) THEN
    CREATE POLICY "Collaborators can view shared study scores"
    ON public.gw_study_scores
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.gw_study_score_collaborators c
        WHERE c.study_score_id = gw_study_scores.id
          AND c.user_id = auth.uid()
          AND c.is_active = true
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gw_study_score_collaborators' AND policyname = 'Owner manages collaborators'
  ) THEN
    CREATE POLICY "Owner manages collaborators"
    ON public.gw_study_score_collaborators
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.gw_study_scores s
        WHERE s.id = gw_study_score_collaborators.study_score_id
          AND s.owner_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.gw_study_scores s
        WHERE s.id = gw_study_score_collaborators.study_score_id
          AND s.owner_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gw_study_score_collaborators' AND policyname = 'Collaborators can read own collaborator rows'
  ) THEN
    CREATE POLICY "Collaborators can read own collaborator rows"
    ON public.gw_study_score_collaborators
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gw_sheet_music_annotations' AND policyname = 'Study score collaborators can view annotations'
  ) THEN
    CREATE POLICY "Study score collaborators can view annotations"
    ON public.gw_sheet_music_annotations
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.gw_study_scores ss
        WHERE ss.derived_sheet_music_id = gw_sheet_music_annotations.sheet_music_id
          AND (ss.owner_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.gw_study_score_collaborators c
            WHERE c.study_score_id = ss.id AND c.user_id = auth.uid() AND c.is_active = true
          ))
      ) OR user_id = auth.uid()
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gw_sheet_music_annotations' AND policyname = 'Study score collaborators can insert annotations'
  ) THEN
    CREATE POLICY "Study score collaborators can insert annotations"
    ON public.gw_sheet_music_annotations
    FOR INSERT
    TO authenticated
    WITH CHECK (
      auth.uid() = user_id AND EXISTS (
        SELECT 1 FROM public.gw_study_scores ss
        WHERE ss.derived_sheet_music_id = sheet_music_id
          AND (ss.owner_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.gw_study_score_collaborators c
            WHERE c.study_score_id = ss.id AND c.user_id = auth.uid() AND c.is_active = true
          ))
      )
    );
  END IF;
END$$;