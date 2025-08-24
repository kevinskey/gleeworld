-- Re-enable RLS and clean up the policies
ALTER TABLE public.gw_study_scores ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "study_scores_select" ON public.gw_study_scores;
DROP POLICY IF EXISTS "study_scores_insert" ON public.gw_study_scores;
DROP POLICY IF EXISTS "study_scores_update" ON public.gw_study_scores;
DROP POLICY IF EXISTS "study_scores_delete" ON public.gw_study_scores;

-- Create simple, working policies
CREATE POLICY "study_scores_owner_access" ON public.gw_study_scores
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "study_scores_admin_access" ON public.gw_study_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles p
      WHERE p.user_id = auth.uid() 
      AND (p.is_admin = true OR p.is_super_admin = true)
    )
  );

CREATE POLICY "study_scores_collaborator_read" ON public.gw_study_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.gw_study_score_collaborators c
      WHERE c.study_score_id = gw_study_scores.id 
      AND c.user_id = auth.uid() 
      AND c.is_active = true
    )
  );