-- Completely fix the infinite recursion by removing any problematic functions
-- Drop all existing policies and recreate them with simple, direct checks

DROP POLICY IF EXISTS "study_scores_select" ON public.gw_study_scores;
DROP POLICY IF EXISTS "study_scores_insert" ON public.gw_study_scores;
DROP POLICY IF EXISTS "study_scores_update" ON public.gw_study_scores;
DROP POLICY IF EXISTS "study_scores_delete" ON public.gw_study_scores;

-- Create simple, non-recursive policies
CREATE POLICY "study_scores_select" ON public.gw_study_scores
  FOR SELECT USING (
    owner_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.gw_profiles p
      WHERE p.user_id = auth.uid() 
      AND (p.is_admin = true OR p.is_super_admin = true)
    ) OR
    EXISTS (
      SELECT 1 FROM public.gw_study_score_collaborators c
      WHERE c.study_score_id = gw_study_scores.id 
      AND c.user_id = auth.uid() 
      AND c.is_active = true
    )
  );

CREATE POLICY "study_scores_insert" ON public.gw_study_scores
  FOR INSERT WITH CHECK (
    owner_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.gw_profiles p
      WHERE p.user_id = auth.uid() 
      AND (p.is_admin = true OR p.is_super_admin = true)
    )
  );

CREATE POLICY "study_scores_update" ON public.gw_study_scores
  FOR UPDATE USING (
    owner_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.gw_profiles p
      WHERE p.user_id = auth.uid() 
      AND (p.is_admin = true OR p.is_super_admin = true)
    ) OR
    EXISTS (
      SELECT 1 FROM public.gw_study_score_collaborators c
      WHERE c.study_score_id = gw_study_scores.id 
      AND c.user_id = auth.uid() 
      AND c.is_active = true
      AND c.role = 'editor'
    )
  );

CREATE POLICY "study_scores_delete" ON public.gw_study_scores
  FOR DELETE USING (
    owner_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.gw_profiles p
      WHERE p.user_id = auth.uid() 
      AND (p.is_admin = true OR p.is_super_admin = true)
    )
  );