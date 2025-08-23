-- Fix infinite recursion in gw_study_scores RLS policies
-- First, drop all existing policies to break the recursion
DROP POLICY IF EXISTS "gw_study_scores_select" ON public.gw_study_scores;
DROP POLICY IF EXISTS "gw_study_scores_insert" ON public.gw_study_scores;
DROP POLICY IF EXISTS "gw_study_scores_update" ON public.gw_study_scores;
DROP POLICY IF EXISTS "gw_study_scores_delete" ON public.gw_study_scores;
DROP POLICY IF EXISTS "Members can view study scores" ON public.gw_study_scores;
DROP POLICY IF EXISTS "Admins can manage study scores" ON public.gw_study_scores;

-- Create proper non-recursive policies for study scores
-- Allow all authenticated users to view study scores
CREATE POLICY "study_scores_select_policy"
ON public.gw_study_scores
FOR SELECT
TO authenticated
USING (true);

-- Allow admins and super admins to manage study scores
CREATE POLICY "study_scores_admin_manage_policy"
ON public.gw_study_scores
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  )
);