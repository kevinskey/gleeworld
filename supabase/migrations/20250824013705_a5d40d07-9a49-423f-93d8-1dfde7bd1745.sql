-- Fix infinite recursion in gw_study_scores RLS policies by using security definer functions

-- First, create a security definer function to check if user owns a study score
CREATE OR REPLACE FUNCTION public.user_owns_study_score(study_score_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_study_scores 
    WHERE id = study_score_id AND owner_id = auth.uid()
  );
$$;

-- Drop all existing policies on gw_study_scores to start fresh
DROP POLICY IF EXISTS "study_scores_select" ON public.gw_study_scores;
DROP POLICY IF EXISTS "study_scores_insert" ON public.gw_study_scores;
DROP POLICY IF EXISTS "study_scores_update" ON public.gw_study_scores;
DROP POLICY IF EXISTS "study_scores_delete" ON public.gw_study_scores;

-- Create new policies using security definer functions to avoid recursion
CREATE POLICY "study_scores_select" ON public.gw_study_scores
  FOR SELECT USING (
    owner_id = auth.uid() OR 
    check_user_admin_simple() OR
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
    check_user_admin_simple()
  );

CREATE POLICY "study_scores_update" ON public.gw_study_scores
  FOR UPDATE USING (
    owner_id = auth.uid() OR 
    check_user_admin_simple() OR
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
    check_user_admin_simple()
  );