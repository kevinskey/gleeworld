-- Fix infinite recursion in gw_study_scores policies
-- Drop the problematic policies
DROP POLICY IF EXISTS "study_scores_owner_access" ON public.gw_study_scores;
DROP POLICY IF EXISTS "study_scores_admin_access" ON public.gw_study_scores;
DROP POLICY IF EXISTS "study_scores_collaborator_read" ON public.gw_study_scores;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.user_has_admin_role(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = user_id_param
    AND (p.is_admin = true OR p.is_super_admin = true)
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_secretary_role(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_executive_board_members ebm
    WHERE ebm.user_id = user_id_param
    AND ebm.position = 'secretary'
    AND ebm.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_alumnae_liaison_role(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_executive_board_members ebm
    WHERE ebm.user_id = user_id_param
    AND ebm.position = 'alumnae_liaison'
    AND ebm.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_pr_coordinator_role(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_executive_board_members ebm
    WHERE ebm.user_id = user_id_param
    AND ebm.position = 'pr_coordinator'
    AND ebm.is_active = true
  );
$$;

-- Create simple, non-recursive policies
CREATE POLICY "study_scores_owner_only" ON public.gw_study_scores
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "study_scores_admin_all" ON public.gw_study_scores
  FOR ALL USING (user_has_admin_role(auth.uid()));

CREATE POLICY "study_scores_collaborator_view" ON public.gw_study_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.gw_study_score_collaborators c
      WHERE c.study_score_id = gw_study_scores.id 
      AND c.user_id = auth.uid() 
      AND c.is_active = true
    )
  );