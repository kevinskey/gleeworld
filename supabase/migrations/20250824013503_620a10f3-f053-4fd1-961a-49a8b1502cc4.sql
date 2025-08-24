-- Fix RLS policies for gw_study_scores table to allow users to delete their own study scores

-- Drop existing restrictive policies and create proper ones
DROP POLICY IF EXISTS "allow_all_authenticated_select_study_scores" ON public.gw_study_scores;
DROP POLICY IF EXISTS "allow_admin_all_study_scores" ON public.gw_study_scores;

-- Create comprehensive RLS policies for study scores
CREATE POLICY "study_scores_select" ON public.gw_study_scores
  FOR SELECT USING (
    owner_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.gw_study_score_collaborators 
      WHERE study_score_id = gw_study_scores.id 
      AND user_id = auth.uid() 
      AND is_active = true
    ) OR
    check_user_admin_simple()
  );

CREATE POLICY "study_scores_insert" ON public.gw_study_scores
  FOR INSERT WITH CHECK (
    owner_id = auth.uid() OR 
    check_user_admin_simple()
  );

CREATE POLICY "study_scores_update" ON public.gw_study_scores
  FOR UPDATE USING (
    owner_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.gw_study_score_collaborators 
      WHERE study_score_id = gw_study_scores.id 
      AND user_id = auth.uid() 
      AND is_active = true
      AND role = 'editor'
    ) OR
    check_user_admin_simple()
  );

CREATE POLICY "study_scores_delete" ON public.gw_study_scores
  FOR DELETE USING (
    owner_id = auth.uid() OR 
    check_user_admin_simple()
  );

-- Also ensure the collaborators table has proper policies
DROP POLICY IF EXISTS "gw_study_score_collaborators_select" ON public.gw_study_score_collaborators;
DROP POLICY IF EXISTS "gw_study_score_collaborators_insert" ON public.gw_study_score_collaborators;
DROP POLICY IF EXISTS "gw_study_score_collaborators_update" ON public.gw_study_score_collaborators;
DROP POLICY IF EXISTS "gw_study_score_collaborators_delete" ON public.gw_study_score_collaborators;

CREATE POLICY "collaborators_select" ON public.gw_study_score_collaborators
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.gw_study_scores 
      WHERE id = gw_study_score_collaborators.study_score_id 
      AND owner_id = auth.uid()
    ) OR
    check_user_admin_simple()
  );

CREATE POLICY "collaborators_insert" ON public.gw_study_score_collaborators
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gw_study_scores 
      WHERE id = gw_study_score_collaborators.study_score_id 
      AND owner_id = auth.uid()
    ) OR
    check_user_admin_simple()
  );

CREATE POLICY "collaborators_update" ON public.gw_study_score_collaborators
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.gw_study_scores 
      WHERE id = gw_study_score_collaborators.study_score_id 
      AND owner_id = auth.uid()
    ) OR
    check_user_admin_simple()
  );

CREATE POLICY "collaborators_delete" ON public.gw_study_score_collaborators
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.gw_study_scores 
      WHERE id = gw_study_score_collaborators.study_score_id 
      AND owner_id = auth.uid()
    ) OR
    check_user_admin_simple()
  );