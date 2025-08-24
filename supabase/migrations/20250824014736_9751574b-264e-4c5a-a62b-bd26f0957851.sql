-- First check what policies exist and drop ALL of them
DROP POLICY IF EXISTS "study_scores_owner_only" ON public.gw_study_scores;
DROP POLICY IF EXISTS "study_scores_admin_all" ON public.gw_study_scores;
DROP POLICY IF EXISTS "study_scores_collaborator_view" ON public.gw_study_scores;

-- Temporarily disable RLS to clear everything
ALTER TABLE public.gw_study_scores DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.gw_study_scores ENABLE ROW LEVEL SECURITY;

-- Create simple, working policies without recursion
CREATE POLICY "study_scores_owner_access" ON public.gw_study_scores
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "study_scores_admin_access" ON public.gw_study_scores
  FOR ALL USING (user_has_admin_role(auth.uid()));

CREATE POLICY "study_scores_collaborator_access" ON public.gw_study_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.gw_study_score_collaborators c
      WHERE c.study_score_id = gw_study_scores.id 
      AND c.user_id = auth.uid() 
      AND c.is_active = true
    )
  );