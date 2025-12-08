-- Fix infinite recursion in gw_study_score_collaborators policies
-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Collaborators can read own collaborator rows" ON public.gw_study_score_collaborators;
DROP POLICY IF EXISTS "Collaborators: owner can insert" ON public.gw_study_score_collaborators;
DROP POLICY IF EXISTS "Collaborators: owner/collab can delete" ON public.gw_study_score_collaborators;
DROP POLICY IF EXISTS "Collaborators: owner/collab can select" ON public.gw_study_score_collaborators;
DROP POLICY IF EXISTS "Collaborators: owner/collab can update" ON public.gw_study_score_collaborators;
DROP POLICY IF EXISTS "Owner manages collaborators" ON public.gw_study_score_collaborators;
DROP POLICY IF EXISTS "collaborators_delete" ON public.gw_study_score_collaborators;
DROP POLICY IF EXISTS "collaborators_insert" ON public.gw_study_score_collaborators;
DROP POLICY IF EXISTS "collaborators_select" ON public.gw_study_score_collaborators;
DROP POLICY IF EXISTS "collaborators_update" ON public.gw_study_score_collaborators;

-- Create simple non-recursive policies for gw_study_score_collaborators
CREATE POLICY "study_score_collaborators_select" 
ON public.gw_study_score_collaborators 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid() OR is_gw_admin_v2());

CREATE POLICY "study_score_collaborators_insert" 
ON public.gw_study_score_collaborators 
FOR INSERT 
TO authenticated
WITH CHECK (is_gw_admin_v2() OR user_id = auth.uid());

CREATE POLICY "study_score_collaborators_update" 
ON public.gw_study_score_collaborators 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid() OR is_gw_admin_v2());

CREATE POLICY "study_score_collaborators_delete" 
ON public.gw_study_score_collaborators 
FOR DELETE 
TO authenticated
USING (user_id = auth.uid() OR is_gw_admin_v2());

-- Fix gw_study_scores policies - drop problematic ones
DROP POLICY IF EXISTS "score_owner_manage" ON public.gw_study_scores;
DROP POLICY IF EXISTS "score_collaborator_select" ON public.gw_study_scores;
DROP POLICY IF EXISTS "scores_select" ON public.gw_study_scores;
DROP POLICY IF EXISTS "scores_insert" ON public.gw_study_scores;
DROP POLICY IF EXISTS "scores_update" ON public.gw_study_scores;
DROP POLICY IF EXISTS "scores_delete" ON public.gw_study_scores;

-- Create simple non-recursive policies for gw_study_scores
CREATE POLICY "study_scores_select" 
ON public.gw_study_scores 
FOR SELECT 
TO authenticated
USING (owner_id = auth.uid() OR is_gw_admin_v2());

CREATE POLICY "study_scores_insert" 
ON public.gw_study_scores 
FOR INSERT 
TO authenticated
WITH CHECK (owner_id = auth.uid() OR is_gw_admin_v2());

CREATE POLICY "study_scores_update" 
ON public.gw_study_scores 
FOR UPDATE 
TO authenticated
USING (owner_id = auth.uid() OR is_gw_admin_v2());

CREATE POLICY "study_scores_delete" 
ON public.gw_study_scores 
FOR DELETE 
TO authenticated
USING (owner_id = auth.uid() OR is_gw_admin_v2());