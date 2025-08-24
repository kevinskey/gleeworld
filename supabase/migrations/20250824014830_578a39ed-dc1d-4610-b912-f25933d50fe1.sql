-- Let's completely reset the RLS policies for gw_study_scores
-- First disable RLS completely
ALTER TABLE public.gw_study_scores DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies (using exact names from the query)
DROP POLICY IF EXISTS "study_scores_owner_only" ON public.gw_study_scores;
DROP POLICY IF EXISTS "study_scores_admin_all" ON public.gw_study_scores;
DROP POLICY IF EXISTS "study_scores_collaborator_view" ON public.gw_study_scores;
DROP POLICY IF EXISTS "study_scores_owner_access" ON public.gw_study_scores;
DROP POLICY IF EXISTS "study_scores_admin_access" ON public.gw_study_scores;
DROP POLICY IF EXISTS "study_scores_collaborator_access" ON public.gw_study_scores;

-- Re-enable RLS
ALTER TABLE public.gw_study_scores ENABLE ROW LEVEL SECURITY;

-- Create brand new policies with unique names
CREATE POLICY "gw_study_scores_owner_full_access" ON public.gw_study_scores
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "gw_study_scores_admin_full_access" ON public.gw_study_scores
  FOR ALL USING (user_has_admin_role(auth.uid()));

CREATE POLICY "gw_study_scores_collaborator_read_access" ON public.gw_study_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.gw_study_score_collaborators c
      WHERE c.study_score_id = gw_study_scores.id 
      AND c.user_id = auth.uid() 
      AND c.is_active = true
    )
  );