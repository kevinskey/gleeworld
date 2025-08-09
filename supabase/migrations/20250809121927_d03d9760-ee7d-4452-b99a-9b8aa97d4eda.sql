-- Create Study Scores tables, sharing RPC, policies, and storage bucket (simplified)

-- 1) Study scores base table
CREATE TABLE IF NOT EXISTS public.gw_study_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  source_sheet_music_id uuid NOT NULL,
  derived_sheet_music_id uuid NOT NULL,
  title text NOT NULL,
  pdf_url text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_gw_study_scores_owner ON public.gw_study_scores(owner_id);
CREATE INDEX IF NOT EXISTS idx_gw_study_scores_derived ON public.gw_study_scores(derived_sheet_music_id);

-- 2) Collaborators table
CREATE TABLE IF NOT EXISTS public.gw_study_score_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_score_id uuid NOT NULL REFERENCES public.gw_study_scores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'editor',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (study_score_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_gw_study_score_collab_user ON public.gw_study_score_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_gw_study_score_collab_score ON public.gw_study_score_collaborators(study_score_id);

-- 3) Updated_at triggers (assumes public.update_updated_at_column_v2 exists)
DROP TRIGGER IF EXISTS trg_gw_study_scores_updated ON public.gw_study_scores;
CREATE TRIGGER trg_gw_study_scores_updated
BEFORE UPDATE ON public.gw_study_scores
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column_v2();

DROP TRIGGER IF EXISTS trg_gw_study_score_collab_updated ON public.gw_study_score_collaborators;
CREATE TRIGGER trg_gw_study_score_collab_updated
BEFORE UPDATE ON public.gw_study_score_collaborators
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column_v2();

-- 4) RLS
ALTER TABLE public.gw_study_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_study_score_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Study score owner manage"
ON public.gw_study_scores
AS PERMISSIVE
FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Collaborators can view shared study scores"
ON public.gw_study_scores
AS PERMISSIVE
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

CREATE POLICY IF NOT EXISTS "Owner manages collaborators"
ON public.gw_study_score_collaborators
AS PERMISSIVE
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

CREATE POLICY IF NOT EXISTS "Collaborators can read own collaborator rows"
ON public.gw_study_score_collaborators
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 5) Storage bucket for study scores (public for now)
INSERT INTO storage.buckets (id, name, public)
VALUES ('study-scores', 'study-scores', true)
ON CONFLICT (id) DO NOTHING;

-- 6) RPC to share a study score by email and grant sheet music permissions
CREATE OR REPLACE FUNCTION public.share_study_score(
  p_study_score_id uuid,
  p_collaborator_email text,
  p_role text DEFAULT 'editor'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_derived_sheet_music_id uuid;
  v_user_id uuid;
BEGIN
  SELECT owner_id, derived_sheet_music_id INTO v_owner, v_derived_sheet_music_id
  FROM public.gw_study_scores
  WHERE id = p_study_score_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Study score not found';
  END IF;

  IF v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'Only the owner can share this study score';
  END IF;

  SELECT user_id INTO v_user_id
  FROM public.gw_profiles
  WHERE email = p_collaborator_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found with that email';
  END IF;

  INSERT INTO public.gw_study_score_collaborators (study_score_id, user_id, role, is_active)
  VALUES (p_study_score_id, v_user_id, COALESCE(p_role, 'editor'), true)
  ON CONFLICT (study_score_id, user_id) DO UPDATE
    SET role = EXCLUDED.role,
        is_active = true,
        updated_at = now();

  BEGIN
    INSERT INTO public.gw_sheet_music_permissions (
      sheet_music_id, user_id, role, permission_type, granted_by, is_active
    ) VALUES (
      v_derived_sheet_music_id, v_user_id, p_role, 'annotate', auth.uid(), true
    );
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 7) Annotation policies for collaborators (table exists)
CREATE POLICY IF NOT EXISTS "Study score collaborators can view annotations"
ON public.gw_sheet_music_annotations
AS PERMISSIVE
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

CREATE POLICY IF NOT EXISTS "Study score collaborators can insert annotations"
ON public.gw_sheet_music_annotations
AS PERMISSIVE
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